# Documento de Riesgo Técnico — Migración Multi-Clínica + Marketplace

**Fecha:** 2026-04-24  
**Actualizado:** 2026-04-24 — números de migración Fase B desplazados +2  
**Motivo:** `012_fix_profiles_rls.sql` (SELECT) y `013_fix_profiles_update_rls.sql` (UPDATE) fueron ejecutadas como fixes de bugs funcionales. Fase B arranca desde `014`.  
**Fuente:** Outputs de Etapas 1–5A  
**Estado TypeScript:** `npx tsc --noEmit` — **sin errores**

---

> **Secciones 1–3** se encuentran en `prompts/outputs/riesgo-etapa5a.md`  
> Este documento contiene las **Secciones 4–7**.

---

### Sección 4 — Orden de implementación: FASE A → FASE D

---

#### FASE A — Cierre de bugs críticos ✅ COMPLETADA

| Nº | Acción | Migración | Estado |
|---|---|---|---|
| A1 | Fix IDOR `appointments/[id]` PATCH | — | ✅ |
| A2 | Fix IDOR `appointments/[id]/rate` GET+POST | — | ✅ |
| A3 | Fix `pets/upload-photo` clinic ownership para vets | — | ✅ |
| A4 | Reemplazar 6 URLs de email con subdominio | — | ✅ |
| A5 | Admin panel muestra `petfhans.com/{slug}` | — | ✅ |
| A6 | RLS para tabla `appointments` | `011_appointments_rls.sql` | ✅ |
| A7 | RLS profiles SELECT — usuario lee su propio perfil | `012_fix_profiles_rls.sql` | ✅ |
| A8 | RLS profiles UPDATE — usuario actualiza su propio perfil | `013_fix_profiles_update_rls.sql` | ✅ |
| A9 | Middleware redirige a dominio único en lugar de subdominio | — | ✅ |

**Nota:** Migraciones 011, 012 y 013 aplicadas en producción. Fase B arranca desde `014`.

---

#### FASE B — Capa 1: `profile_clinics` + RLS + middleware + 9 routes
**Bloqueante para features de Capa 2. Requiere staging.**  
**Cuándo:** Después de tener staging disponible.

**B.1 — Migrations SQL (sin tocar código aún)**

| Paso | Acción | Archivo |
|---|---|---|
| B.1.1 | Crear `profile_clinics(user_id, clinic_id, role, created_at)` + índice | `014_profile_clinics.sql` |
| B.1.2 | Crear función `get_active_clinic_id()` parametrizada | `015_rls_rewrite.sql` |
| B.1.3 | Reescribir las 12 políticas RLS usando `profile_clinics` — **mantener `get_user_clinic_id()` activa** | `015_rls_rewrite.sql` |
| B.1.4 | Migración de datos: poblar `profile_clinics` desde `profiles.clinic_id` (rollbackable) | `016_migrate_data.sql` |

Verificar: `SELECT COUNT(*) FROM profile_clinics` = `SELECT COUNT(*) FROM profiles WHERE clinic_id IS NOT NULL`.

**B.2 — Middleware**

| Paso | Acción |
|---|---|
| B.2.1 | Leer `active_clinic_id` de cookie, verificar contra `profile_clinics`, inyectar `x-active-clinic-id` en headers |
| B.2.2 | Mantener validación de subdominio en paralelo — **no eliminar aún** |
| B.2.3 | Verificar: cookie presente → header inyectado; cookie ausente → redirect a `/vet/select-clinic` |

**B.3 — API routes (una a una)**

| Orden | Route | Cambio |
|---|---|---|
| 1 | `auth/accept-invite` | Añadir path para usuario existente → insert `profile_clinics` |
| 2 | `owner/setup` | `profiles.update({ clinic_id })` → `profile_clinics.insert()` |
| 3 | `appointments` POST | `profile.clinic_id` → `x-active-clinic-id` header |
| 4 | `appointments/emergency` POST | mismo patrón |
| 5 | `files/[id]` GET+DELETE | comparación escalar → `active_clinic_id` |
| 6 | `files/upload` POST | `clinicId = req.headers.get('x-active-clinic-id')` |
| 7 | `vet/ai-chat` | reemplazar guard y queries por `active_clinic_id` |
| 8 | `vet/create-invitation` | `profile.clinic_id` → `active_clinic_id` |
| 9 | `vet/resend-invitation` | mismo patrón |
| 10 | `vet/usage` | `profile.clinic_id` → `active_clinic_id` |

**B.4 — UI**

| Paso | Archivo | Cambio |
|---|---|---|
| B.4.1 | `vet/layout.tsx` | Join a `profile_clinics → clinics`; leer `active_clinic_id` de cookie |
| B.4.2 | `vet/dashboard/page.tsx` | 4 queries usan `active_clinic_id` |
| B.4.3 | Crear `ClinicSelector` | Dropdown que escribe cookie `active_clinic_id` + `router.refresh()` |
| B.4.4 | `VetLayout.tsx` | Props: `clinics: Array<{id,name}>` + `activeClinicId: string` |
| B.4.5 | Crear `/vet/select-clinic` | Página de selección cuando no hay cookie activa |

**B.5 — Deprecación (≥48h en producción sin incidencias)**

| Paso | Acción |
|---|---|
| B.5.1 | `002_auth_trigger.sql` — dejar de escribir `clinic_id` escalar |
| B.5.2 | Verificar 0 políticas referencian `get_user_clinic_id()` |
| B.5.3 | Nullificar `profiles.clinic_id` |
| B.5.4 | Eliminar validación de subdominio en `middleware.ts:80–89` |
| B.5.5 | Redirects 301: `clinica.petfhans.com/*` → `petfhans.com/*` |

---

#### FASE C — Marketplace (corre en paralelo con Fase B)

**Tablas nuevas — prerequisito de C.1:**

| Tabla | Depende de Capa 1 |
|---|---|
| `care_requests` | No |
| `clinic_join_requests` | No |
| `clinics.verified BOOLEAN` | No |
| `clinics.public_profile JSONB` | No |

**API routes nuevas:**

| Route | Depende de Capa 1 |
|---|---|
| `GET /api/marketplace/clinics` | No |
| `GET /api/marketplace/clinics/[slug]` | No |
| `GET /api/marketplace/vets` | No |
| `GET /api/clinics/[id]/ratings` | No |
| `POST /api/care-requests` | No |
| `POST /api/clinic-join-requests` | No |
| `PATCH /api/care-requests/[id]` — aceptar/rechazar | **Sí** — vincula via `profile_clinics.insert()` |

**UI nueva:**

| Componente / página | Depende de Capa 1 |
|---|---|
| `MarketplaceClinicCard` | No |
| `MarketplaceVetCard` | No |
| `ClinicPublicProfile` | No |
| `CareRequestForm` | No |
| `ClinicJoinRequestForm` | No |
| `/marketplace/clinicas` + `/marketplace/clinicas/[slug]` | No |
| `/marketplace/veterinarios` + `/marketplace/veterinarios/[id]` | No |

---

#### FASE D — Features post-Capa 1

| Feature | Dependencia |
|---|---|
| Owner dashboard agrupado por clínica | `pet_access.clinic_id` |
| `PetUnlinkModal` | multi-clínica `pet_access` |
| Exportación PDF historial | puede adelantarse |
| `PATCH /api/care-requests/[id]` completo | `profile_clinics` activo |
| Selector clínica activa para owners | `pet_access.clinic_id` |

---

### Sección 5 — Tests mínimos por route ROJO

#### `appointments/[id]` PATCH — IDOR ✅ Fase A completada

| Test | Condición | Esperado |
|---|---|---|
| IDOR bloqueado | PATCH con UUID de otra clínica | **403** |
| Acceso propio | PATCH de cita propia | **200** |

#### `appointments` POST (Fase B)

| Test | Condición | Esperado |
|---|---|---|
| Vet migrado | `profile.clinic_id = null`, header válido | **201** |
| Mascota de otra clínica | `pet.clinic_id ≠ active_clinic_id` | **403** |
| Sin header | `profile.clinic_id = null`, sin header | **403** |

#### `auth/accept-invite` (Fase B)

| Test | Condición | Esperado |
|---|---|---|
| Usuario nuevo | Token válido, email sin cuenta | Usuario creado + fila en `profile_clinics` |
| Usuario existente | Token válido, email con cuenta | Sin nuevo usuario en Auth; nueva fila en `profile_clinics` |

#### URLs de email ✅ Fase A completada

Todas las 6 URLs migradas a `petfhans.com` en producción.

---

### Sección 6 — Lista de NO tocar

| Elemento | Por qué |
|---|---|
| **Migraciones 001–013** | Nunca editar migraciones aplicadas en producción |
| **`get_user_clinic_id()`** | 12 políticas dependen de ella — dropear solo cuando 0 políticas la referencien |
| **`profiles.clinic_id` columna** | Nullificar solo al final de Fase B |
| **Validación de subdominio `middleware.ts:80–89`** | Única barrera de clínica activa — eliminar solo tras ≥48h con cookie en producción |
| **`002_auth_trigger.sql`** | Escribe `clinic_id` — cambiar solo cuando `accept-invite` soporte usuario existente |
| **Tabla `pet_access`** | `appointment_ratings` depende de ella vía FK |
| **`createAdminClient()` en `admin.ts`** | Cada nuevo uso requiere revisión manual de filtros `clinic_id` |
| **JWT `user_metadata.clinic_id`** | Valor stale — no leer en código nuevo, usar header `x-active-clinic-id` |

---

### Sección 7 — Condiciones de entrada a Fase B

**Fase A — todas completadas ✅**

- [x] IDOR `appointments/[id]` PATCH cerrado
- [x] IDOR `appointments/[id]/rate` cerrado
- [x] `pets/upload-photo` clinic ownership
- [x] 6 URLs de email con dominio único
- [x] Admin panel dominio único
- [x] RLS appointments — `011` ejecutada
- [x] RLS profiles SELECT — `012` ejecutada
- [x] RLS profiles UPDATE — `013` ejecutada
- [x] Middleware redirige a dominio único

**Preparación de Fase B — pendientes:**

- [ ] `014_profile_clinics.sql` revisada y aprobada
- [ ] `015_rls_rewrite.sql`: 12 políticas reescritas, `get_user_clinic_id()` sigue activa
- [ ] `016_migrate_data.sql` probada en staging
- [ ] `accept-invite` path de usuario existente probado en staging
- [ ] `owner/setup` escribe en `profile_clinics` en staging
- [ ] Middleware cookie → header desplegado en staging sin errores
- [ ] Prueba manual en staging: login → cookie → header inyectado → route correcta

**Gate final antes de nullificar `profiles.clinic_id`:**

- [ ] 9 routes leen `x-active-clinic-id` — cero referencias a `profile?.clinic_id` como scope
- [ ] `vet/layout.tsx` usa `profile_clinics` en staging
- [ ] `vet/dashboard` usa `active_clinic_id` en staging
- [ ] `/vet/select-clinic` existe y funciona
- [ ] `VetLayout.tsx` muestra `ClinicSelector`
- [ ] Cookie en producción ≥48h sin incidencias
- [ ] `SELECT COUNT(*) FROM pg_policies WHERE qual LIKE '%get_user_clinic_id%'` = **0**
- [ ] `SELECT COUNT(*) FROM pg_policies WHERE qual LIKE '%profiles.clinic_id%'` = **0**
- [ ] Ningún `profile?.clinic_id` como fuente de scope en `src/`
