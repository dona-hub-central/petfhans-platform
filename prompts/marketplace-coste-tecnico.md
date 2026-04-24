# Documento de Riesgo Técnico — Migración Multi-Clínica + Marketplace

**Fecha:** 2026-04-24  
**Fuente:** Outputs de Etapas 1–5A (`riesgo-etapa1-schema.md` → `riesgo-etapa5a.md`)  
**Estado TypeScript:** `npx tsc --noEmit` — **sin errores**

---

> **Secciones 1–3** se encuentran en `prompts/outputs/riesgo-etapa5a.md`  
> Este documento contiene las **Secciones 4–7**: orden de implementación, tests mínimos, lista de no-tocar y condiciones de entrada a Fase B.

---

### Sección 4 — Orden de implementación: FASE A → FASE D

---

#### FASE A — Cierre de bugs críticos en producción
**Prerequisito de todo lo demás. Usar `prompts/security-fix.md`.**  
**Cuándo:** Antes de iniciar cualquier migración de schema.  
**Archivos:** todos en `src/` — cero cambios en `supabase/migrations/`

| Nº | Acción | Archivo | Línea(s) |
|---|---|---|---|
| A1 | Fix IDOR `appointments/[id]` PATCH — añadir ownership check post-fetch | `appointments/[id]/route.ts` | 19, 30–35 |
| A2 | Fix IDOR `appointments/[id]/rate` GET — añadir ownership check | `appointments/[id]/rate/route.ts` | — |
| A3 | Fix `pets/upload-photo` — añadir `.eq('clinic_id', active_clinic_id)` para vets | `pets/upload-photo/route.ts` | — |
| A4 | Reemplazar 6 URLs de email con subdominio por dominio único `petfhans.com` | ver tabla en Sección 5 | — |
| A5 | Actualizar display en admin panel — `{clinic.slug}.petfhans.com` → `petfhans.com/{slug}` | `admin/page.tsx` | 74 |
| A6 | Crear políticas RLS para `appointments` (actualmente tiene 0 políticas) | nueva migration `011_appointments_rls.sql` | nueva |

**Condición de salida:**  
`PATCH /api/appointments/<uuid-de-otra-clinica>` desde cuenta autenticada sin relación → **403**.  
`SELECT COUNT(*) FROM pg_policies WHERE tablename = 'appointments'` → **> 0**.

---

#### FASE B — Capa 1: `profile_clinics` + RLS + middleware + 9 routes
**Bloqueante para features de Capa 2. Requiere Fase A en producción.**  
**Cuándo:** Después de Fase A verificada en producción.

**Orden interno obligatorio — no saltarse pasos:**

**B.1 — Migrations SQL (sin tocar código aún)**

| Paso | Acción | Archivo |
|---|---|---|
| B.1.1 | Crear `profile_clinics(user_id, clinic_id, role, created_at)` + índice `(user_id, clinic_id)` | `012_profile_clinics.sql` |
| B.1.2 | Crear función `get_active_clinic_id(p_clinic_id UUID)` parametrizada | `013_rls_rewrite.sql` |
| B.1.3 | Reescribir las 12 políticas RLS usando `profile_clinics` — **mantener `get_user_clinic_id()` activa** | `013_rls_rewrite.sql` |
| B.1.4 | Script de migración de datos: poblar `profile_clinics` desde `profiles.clinic_id` existentes (rollbackable) | `014_migrate_data.sql` |

Verificar: `SELECT COUNT(*) FROM profile_clinics` debe coincidir con `SELECT COUNT(*) FROM profiles WHERE clinic_id IS NOT NULL`.

**B.2 — Middleware (desplegar antes de cambiar routes)**

| Paso | Acción |
|---|---|
| B.2.1 | `middleware.ts` — leer `active_clinic_id` de cookie, verificar contra `profile_clinics`, inyectar `x-active-clinic-id` en headers |
| B.2.2 | Mantener temporalmente la validación de subdominio en paralelo (`clinicSlug !== subdomain`) — **no eliminarla aún** |
| B.2.3 | Desplegar y verificar: cookie presente → header inyectado; cookie ausente → redirect a `/vet/select-clinic` |

**B.3 — API routes (una a una, no en batch)**

| Orden | Route | Cambio principal |
|---|---|---|
| 1 | `auth/accept-invite` | Añadir path de usuario existente: check email en `profiles` → insert `profile_clinics`, skip `createUser` |
| 2 | `owner/setup` | Reemplazar `profiles.update({ clinic_id })` por `profile_clinics.insert({ user_id, clinic_id })` |
| 3 | `appointments` POST | `profile.clinic_id` → `req.headers.get('x-active-clinic-id')` |
| 4 | `appointments/emergency` POST | mismo patrón que `appointments` POST |
| 5 | `files/[id]` GET+DELETE | comparación escalar → `active_clinic_id` del header |
| 6 | `files/upload` POST | para vets: `clinicId = req.headers.get('x-active-clinic-id')` |
| 7 | `vet/ai-chat` | reemplazar guard `!profile?.clinic_id` y queries por `active_clinic_id` |
| 8 | `vet/create-invitation` | `profile.clinic_id` → `active_clinic_id` como fuente de `clinic_id` en invitation |
| 9 | `vet/resend-invitation` | mismo patrón que `create-invitation` |
| 10 | `vet/usage` | `profile.clinic_id` → `active_clinic_id` del header |

**B.4 — UI (después de que middleware y routes estén en producción)**

| Paso | Archivo | Cambio |
|---|---|---|
| B.4.1 | `vet/layout.tsx` | Cambiar join `profiles → clinics` a `profile_clinics → clinics`; leer `active_clinic_id` de cookie |
| B.4.2 | `vet/dashboard/page.tsx` | 4 queries usan `active_clinic_id`; `if (!activeClinicId) redirect('/vet/select-clinic')` |
| B.4.3 | Crear `ClinicSelector` component | Dropdown que escribe cookie `active_clinic_id` + `router.refresh()` |
| B.4.4 | `VetLayout.tsx` | Props: `clinics: Array<{id,name}>` + `activeClinicId: string`; integrar `<ClinicSelector>` |
| B.4.5 | Crear `/vet/select-clinic` page | Página de selección inicial cuando no hay cookie activa |

**B.5 — Deprecación (solo cuando B.1–B.4 llevan ≥48h en producción sin incidencias)**

| Paso | Acción | Verificación |
|---|---|---|
| B.5.1 | Actualizar `002_auth_trigger.sql` — dejar de escribir `clinic_id` escalar | Nuevos usuarios no tienen `profiles.clinic_id` |
| B.5.2 | Verificar que 0 políticas referencian `get_user_clinic_id()` | `SELECT COUNT(*) FROM pg_policies WHERE qual LIKE '%get_user_clinic_id%'` = 0 |
| B.5.3 | Nullificar `profiles.clinic_id` (migration `ALTER COLUMN clinic_id DROP DEFAULT`, vaciar campo) | — |
| B.5.4 | Eliminar validación de subdominio en `middleware.ts:80–89` | Test: vet autenticado con cookie válida accede sin subdominio |
| B.5.5 | Configurar redirects 301 en Vercel: `clinica.petfhans.com/*` → `petfhans.com/*` | Mantener activos ≥30 días |

**Condición de salida de Fase B:**  
`SELECT COUNT(*) FROM pg_policies WHERE qual LIKE '%profiles.clinic_id%' OR qual LIKE '%get_user_clinic_id%'` devuelve **0**.

---

#### FASE C — Marketplace (puede correr en paralelo con Fase B)
**Scope:** Módulo de descubrimiento público — no depende de `profile_clinics` excepto donde se indica.

**Prerequisito — tablas nuevas (un sprint antes de C.1):**

| Tabla | Columnas clave | Depende de Capa 1 |
|---|---|---|
| `care_requests` | `id, requester_id, clinic_id, pet_description, contact, status, created_at` | No — FK a `clinics.id`, no a `profiles.clinic_id` |
| `clinic_join_requests` | `id, vet_id, clinic_id, message, status, created_at` | No |
| `clinics.verified BOOLEAN` | badge de clínica verificada por superadmin | No |
| `clinics.public_profile JSONB` | descripción, especialidades, foto portada | No |

**C.1 — API routes nuevas:**

| Route | Depende de Capa 1 |
|---|---|
| `GET /api/marketplace/clinics` | No |
| `GET /api/marketplace/clinics/[slug]` | No |
| `GET /api/marketplace/vets` | No |
| `GET /api/clinics/[id]/ratings` | No |
| `POST /api/care-requests` | No |
| `POST /api/clinic-join-requests` | No |
| `PATCH /api/care-requests/[id]` — aceptar/rechazar | **Sí** — vincula via `profile_clinics.insert()` al aceptar |

**C.2 — UI nueva:**

| Componente / página | Depende de Capa 1 |
|---|---|
| `MarketplaceClinicCard` — logo, nombre, ciudad, rating, badge verificada | No |
| `MarketplaceVetCard` — foto, nombre, especialidades, clínicas | No |
| `ClinicPublicProfile` — cover, equipo, valoraciones, CTAs | No |
| `CareRequestForm` — descripción de mascota, motivo, preferencia de vet | No |
| `ClinicJoinRequestForm` — vet solicita unirse a clínica | No |
| `/marketplace/clinicas` + `/marketplace/clinicas/[slug]` | No |
| `/marketplace/veterinarios` + `/marketplace/veterinarios/[id]` | No |

---

#### FASE D — Features post-Capa 1
**Scope:** Funcionalidades avanzadas que requieren `profile_clinics` activo.  
**Cuándo:** Después de Fase B completada y verificada.

| Feature | Componente / archivo | Dependencia |
|---|---|---|
| Owner dashboard agrupado por clínica | `OwnerClinicGroup` + `owner/dashboard/page.tsx` | `pet_access.clinic_id` con join a `clinics` |
| Modal de desvinculación de mascota | `PetUnlinkModal` | flujo multi-clínica `pet_access` |
| Exportación PDF del historial médico | nuevo endpoint + componente | genera desde datos existentes — puede adelantarse |
| `PATCH /api/care-requests/[id]` versión completa | aceptar vincula via `profile_clinics.insert()` | `profile_clinics` activo |
| Selector de clínica activa para owners | cookie `active_clinic_id` en panel owner | `pet_access.clinic_id` |

---

### Sección 5 — Tests mínimos por route ROJO

Tests de comportamiento que verifican el fix — no requieren framework de testing:

---

#### `appointments/[id]` PATCH — IDOR (Fase A)

| Test | Condición | Resultado esperado |
|---|---|---|
| IDOR bloqueado | `PATCH` con UUID de otra clínica, cuenta autenticada sin relación | **403** |
| Acceso propio | `PATCH` de cita propia con `{ status: 'confirmed' }` | **200** |
| Superadmin | `PATCH` desde cuenta `superadmin` sobre cualquier cita | **200** |

---

#### `appointments` POST (Fase B)

| Test | Condición | Resultado esperado |
|---|---|---|
| Vet migrado | `profile.clinic_id = null`, header `x-active-clinic-id` válido | **201** |
| Mascota de otra clínica | `pet.clinic_id ≠ active_clinic_id` | **403** |
| Sin header ni `clinic_id` | `profile.clinic_id = null`, sin header | **403** con mensaje claro |

---

#### `appointments/emergency` POST (Fase B)

| Test | Condición | Resultado esperado |
|---|---|---|
| Vet migrado | `profile.clinic_id = null`, header válido | **201** |
| Mascota de otra clínica | `pet.clinic_id ≠ active_clinic_id` | **403** |

---

#### `files/[id]` GET + DELETE (Fase B)

| Test | Condición | Resultado esperado |
|---|---|---|
| Acceso tras migración | `profile.clinic_id = null`, header válido, archivo de clínica propia | **200** |
| Archivo de otra clínica | `file.clinic_id ≠ active_clinic_id` | **403** (no 404) |
| DELETE propio | header válido, archivo de clínica activa | **200** |
| DELETE cross-clinic | header válido, archivo de otra clínica | **403** |

---

#### `files/upload` POST (Fase B)

| Test | Condición | Resultado esperado |
|---|---|---|
| Vet migrado | `profile.clinic_id = null`, header `x-active-clinic-id` | **201**, `pet_files.clinic_id = active_clinic_id` |
| Sin header ni `clinic_id` | `profile.clinic_id = null`, sin header | **403** o error de constraint explícito (no 500) |

---

#### `owner/setup` POST (Fase B)

| Test | Condición | Resultado esperado |
|---|---|---|
| Primera clínica | Owner nuevo completa setup | Nueva fila en `profile_clinics`; `profiles.clinic_id` permanece null |
| Login post-setup | Owner hace login tras setup | Clínica visible en selector / dashboard |

---

#### `vet/ai-chat` (Fase B)

| Test | Condición | Resultado esperado |
|---|---|---|
| Vet migrado | `profile.clinic_id = null`, header válido | **200**, no 403 |
| Scope de mascotas | Respuesta incluye mascotas | Solo mascotas con `clinic_id = active_clinic_id` |

---

#### `vet/create-invitation` (Fase B)

| Test | Condición | Resultado esperado |
|---|---|---|
| Vet migrado | `profile.clinic_id = null`, header válido | **200**, invitation.`clinic_id = active_clinic_id` |
| Sin header | `profile.clinic_id = null`, sin header | **403** con mensaje claro |

---

#### `vet/resend-invitation` (Fase B)

| Test | Condición | Resultado esperado |
|---|---|---|
| Vet migrado | `profile.clinic_id = null`, header válido | **200** |
| Invitation de otra clínica | `invitation.clinic_id ≠ active_clinic_id` | **403** |

---

#### `auth/accept-invite` (Fase B)

| Test | Condición | Resultado esperado |
|---|---|---|
| Usuario nuevo | Token válido, email sin cuenta existente | Usuario creado en Supabase Auth + fila en `profile_clinics` |
| Usuario existente | Token válido, email con cuenta existente | **Sin nuevo usuario** en Supabase Auth; nueva fila en `profile_clinics` |
| Login post-invite (existente) | Usuario existente, login con contraseña original | Selector muestra nueva clínica |

---

#### URLs de email — 6 líneas (Fase A)

| Archivo | Línea | Antes | Después |
|---|---|---|---|
| `appointments/route.ts` | 101 | `https://${slug}.petfhans.com/owner/dashboard` | `https://petfhans.com/owner/dashboard` |
| `appointments/route.ts` | 138 | `https://${slug}.petfhans.com/vet/appointments` | `https://petfhans.com/vet/appointments` |
| `appointments/[id]/route.ts` | 93 | `https://${clinic?.slug}.petfhans.com/owner/dashboard` | `https://petfhans.com/owner/dashboard` |
| `auth/accept-invite/route.ts` | 86 | `https://${slug}.petfhans.com/auth/login` | `https://petfhans.com/auth/login` |
| `vet/create-invitation/route.ts` | 56 | `https://${clinic?.slug}.petfhans.com/auth/invite?token=...` | `https://petfhans.com/auth/invite?token=...` |
| `vet/resend-invitation/route.ts` | 38 | `https://${clinic?.slug}.petfhans.com/auth/invite?token=...` | `https://petfhans.com/auth/invite?token=...` |

---

### Sección 6 — Lista de NO tocar (con justificación)

Estos archivos o elementos **no deben modificarse** sin un plan explícito y secuenciado. Cualquier cambio prematuro produce fallos en cascada o ventanas de seguridad.

---

| Elemento | Archivo(s) | Por qué no tocar prematuramente |
|---|---|---|
| **Migraciones existentes (001–010)** | `supabase/migrations/001–010` | Nunca editar migraciones aplicadas en producción. Solo agregar nuevas migraciones numeradas. Un cambio retroactivo rompe la cadena reproducible. |
| **`get_user_clinic_id()`** | `001_initial_schema.sql:127` | 12 políticas RLS activas dependen de esta función. Dropearla antes de reescribir las políticas corta acceso a datos para todos los usuarios simultáneamente. Mantener activa hasta que `SELECT COUNT(*) FROM pg_policies WHERE qual LIKE '%get_user_clinic_id%'` = 0. |
| **`profiles.clinic_id` columna** | `profiles` table | 9 routes + 1 trigger leen este campo. Nullificarlo antes de que todos los consumidores estén migrados produce 403 silenciosos y queries con `.eq('clinic_id', null)` que devuelven 0 filas sin error. Nullificar solo como último paso de Fase B. |
| **Validación de subdominio en middleware** | `middleware.ts:80–89` | Actualmente es la única barrera que impide que un vet autenticado acceda al panel de otra clínica. Eliminarla antes de tener la validación de cookie activa en producción crea ventana sin restricción de clínica. Eliminar solo después de ≥48h con validación de cookie sin incidencias. |
| **`002_auth_trigger.sql`** | `supabase/migrations/002` | El trigger escribe `profiles.clinic_id` al crear usuarios. Cambiarlo antes de que `accept-invite` tenga el path de usuario existente deja a los nuevos usuarios sin `profiles.clinic_id` Y sin fila en `profile_clinics` — estado inconsistente total. |
| **Tabla `pet_access`** | schema + políticas | Es la fuente autoritativa de acceso owner-mascota por clínica. La política de `appointment_ratings` (migración 010) depende de `pet_access` como puente. Cualquier cambio estructural a `pet_access` hereda el riesgo sobre ratings. Cambiar solo con plan completo de ambas tablas. |
| **RLS de `appointment_ratings`** | `010_appointment_ratings.sql` | Depende de dos saltos de FK (`appointment → pet → pet_access`). Si `pet_access` cambia su estructura, esta política queda rota sin fallar explícitamente — devolvería 0 filas en silencio. No tocar hasta validar `pet_access` multi-clínica completo. |
| **`createAdminClient()` en `admin.ts`** | `src/lib/supabase/admin.ts` | El cliente en sí es correcto. El riesgo está en cada nuevo uso. No modificar el cliente; cada nueva llamada a `createAdminClient()` requiere revisión manual de que todos los filtros de `clinic_id` estén presentes. |
| **JWT `user_metadata.clinic_id`** | — | El JWT porta un `clinic_id` stale después de la migración. El middleware no lo lee (correcto). No empezar a leerlo en código nuevo — siempre consultar la BD o el header `x-active-clinic-id`. Si alguna Edge Function nueva lo lee, obtendrá el valor del momento de registro. |
| **`idx_profiles_clinic_id`** | índice en `profiles` | No dropear este índice hasta después de nullificar `profiles.clinic_id`. Antes de eso sigue siendo útil para las routes en transición. Crear `idx_profile_clinics_user_id` antes de la migración de datos. |

---

### Sección 7 — Condiciones de entrada a Fase B

Todas las siguientes condiciones deben cumplirse antes de aplicar cualquier migración de Fase B en producción.

**Condiciones de Fase A completada:**

- [ ] Fix IDOR `appointments/[id]` PATCH desplegado: `PATCH /api/appointments/<uuid-otra-clinica>` → 403
- [ ] Fix IDOR `appointments/[id]/rate` GET desplegado
- [ ] Fix `pets/upload-photo` para vets desplegado
- [ ] Las 6 URLs de email con subdominio reemplazadas por `petfhans.com` en producción
- [ ] `appointments` tiene al menos 1 política RLS (`SELECT COUNT(*) FROM pg_policies WHERE tablename = 'appointments'` > 0)
- [ ] Admin panel muestra `petfhans.com/{slug}` en lugar de subdominio

**Condiciones de preparación de Fase B:**

- [ ] `012_profile_clinics.sql` revisada y aprobada — tabla, índices, constraints
- [ ] `013_rls_rewrite.sql` revisada: las 12 políticas reescritas, `get_user_clinic_id()` sigue existiendo
- [ ] `014_migrate_data.sql` probada en staging: `COUNT(profile_clinics) = COUNT(profiles WHERE clinic_id IS NOT NULL)`
- [ ] `accept-invite` path de usuario existente implementado y probado en staging — no crea duplicados
- [ ] `owner/setup` escribe en `profile_clinics` en staging — no toca `profiles.clinic_id`
- [ ] Middleware nueva lógica (cookie → header) desplegada en staging sin errores
- [ ] Al menos una sesión de prueba manual en staging: login → cookie → header inyectado → route correcta

**Gate final antes de nullificar `profiles.clinic_id` (final de Fase B):**

- [ ] Las 9 routes leen `x-active-clinic-id` del header (cero referencias a `profile?.clinic_id` como fuente de scope)
- [ ] `vet/layout.tsx` usa join a `profile_clinics` — confirmado en staging
- [ ] `vet/dashboard` usa `active_clinic_id` de cookie — confirmado en staging
- [ ] `/vet/select-clinic` page existe y funciona cuando la cookie está ausente
- [ ] `VetLayout.tsx` muestra `ClinicSelector` funcional
- [ ] Middleware validación de cookie lleva **≥48 horas en producción** sin incidencias
- [ ] `SELECT COUNT(*) FROM pg_policies WHERE qual LIKE '%get_user_clinic_id%'` = **0**
- [ ] `SELECT COUNT(*) FROM pg_policies WHERE qual LIKE '%profiles.clinic_id%'` = **0**
- [ ] Ningún archivo en `src/` contiene `profile?.clinic_id` usado como fuente de scope de clínica (excepto comentarios)
