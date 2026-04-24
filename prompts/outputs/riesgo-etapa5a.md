# Etapa 5A — Síntesis: Secciones 1-3 · riesgo-etapa5a.md

**Fecha:** 2026-04-24  
**Fuente:** outputs de etapas 1-4  
**Siguiente etapa:** Etapa 5B → `prompts/marketplace-coste-tecnico.md`

**Estado TypeScript:** `npx tsc --noEmit` — **sin errores** (verificado al inicio de la sesión)

---

### Sección 1 — Resumen ejecutivo

| Métrica | Valor |
|---|---|
| Total archivos con cambios requeridos | **28** |
| — Migraciones SQL (nuevas + modificadas) | 5 (001 get_user_clinic_id, 002 trigger, 008/009 RLS, + nueva profile_clinics) |
| — API routes que necesitan cambios | 16 (10 ROJO + 6 AMARILLO) |
| — Archivos de UI a refactorizar | 4 (VetLayout, vet/layout, vet/dashboard, owner/dashboard) |
| — Archivos de infraestructura | 1 (middleware.ts) |
| — Archivos de lib/auth | 2 (accept-invite, owner/setup) |
| Total políticas RLS a reescribir | **12** |
| Total componentes UI nuevos para marketplace | **6+** |
| Componentes UI bloqueados hasta Capa 1 | **3** |
| API routes ROJO | **10** |
| API routes AMARILLO | **6** |
| API routes VERDE (sin cambios requeridos) | **7** |
| Bugs en producción independientes de la migración | **1** (IDOR en appointments/[id]) |
| URLs de email con subdominio deprecado | **6** |

**Decisión arquitectónica confirmada:** dominio único `petfhans.com`, subdominios
deprecados con redirect 301, clínica activa via cookie `active_clinic_id` inyectada
por el middleware en header `x-active-clinic-id`.

---

### Sección 2 — Los 5 cambios más peligrosos

---

#### [RIESGO CRÍTICO] 1. IDOR en `appointments/[id]` PATCH — bug en producción ahora

**Archivo(s):** `src/app/api/appointments/[id]/route.ts:19,30-35`

**Por qué es peligroso:** La ruta usa `createAdminClient()` (bypasa RLS) y actualiza
`status`, `notes` o `cancellation_reason` de cualquier cita conociendo solo su UUID,
sin verificar en ningún punto que el caller pertenezca a la clínica de esa cita.
No requiere multi-clínica para explotarse — existe hoy en producción.

**Consecuencia si se hace mal:** Un `pet_owner` o vet de cualquier otra clínica puede
cancelar, completar o modificar citas de cualquier clínica con una sola petición PATCH.
Explotable desde cualquier cuenta activa en Petfhans.

**Cómo manejarlo:**
1. Cerrar en sesión separada `prompts/security-fix.md` **antes de iniciar Fase B**.
2. Fix: añadir `supabase.auth.getUser()` + lectura de perfil + comparación `appt.clinic_id !== profile.clinic_id` antes del update.
3. Desplegar en producción y verificar antes de cualquier otra migración.

**Condición para considerarlo seguro:** `PATCH /api/appointments/<uuid-de-otra-clinica>` devuelve 403 desde una cuenta autenticada sin relación con esa cita.

---

#### [RIESGO CRÍTICO] 2. `get_user_clinic_id()` — fallo simultáneo de 12 políticas RLS

**Archivo(s):** `supabase/migrations/001_initial_schema.sql:127`

**Por qué es peligroso:** Una única función escalar alimenta 12 políticas RLS en 7 tablas.
Al mover las vinculaciones a `profile_clinics`, la función devuelve `NULL` (porque
`profiles.clinic_id` queda deprecado) y las 12 políticas fallan al mismo tiempo.
No hay fallo gradual — es un corte total de acceso a datos para todos los usuarios afectados.

**Consecuencia si se hace mal:** En el momento de nullificar `profiles.clinic_id`,
todos los vets y owners pierden acceso a mascotas, historiales, citas y archivos.
El panel vet queda en blanco sin ningún error explícito.

**Cómo manejarlo:**
1. Crear función paralela `get_active_clinic_id(clinic_id UUID)` que recibe el contexto como parámetro.
2. Reescribir las 12 políticas usando `profile_clinics` directamente (sin pasar por `profiles.clinic_id`).
3. Mantener `get_user_clinic_id()` activa (sin tocar) hasta que las 12 políticas estén migradas y probadas.
4. Solo deprecar `profiles.clinic_id` después de que 0 políticas la referencien.

**Condición para considerarlo seguro:** `SELECT COUNT(*) FROM pg_policies WHERE qual LIKE '%get_user_clinic_id%' OR qual LIKE '%profiles.clinic_id%'` devuelve 0.

---

#### [RIESGO ALTO] 3. Eliminación de la validación de subdominio en el middleware

**Archivo(s):** `src/middleware.ts:80-89`

**Por qué es peligroso:** La validación `clinicSlug !== subdomain` es actualmente
la única barrera que impide que un vet autenticado acceda al panel de otra clínica.
Eliminarla sin tener en su lugar la verificación de `active_clinic_id` contra
`profile_clinics` crea una ventana donde cualquier vet autenticado puede acceder
a cualquier ruta `/vet/*` sin restricción de clínica.

**Consecuencia si se hace mal:** Durante la transición, cualquier usuario con sesión
activa puede leer datos de todas las clínicas. El fallo es silencioso — las páginas
cargan con datos de cualquier clínica que el usuario seleccione manualmente.

**Cómo manejarlo:**
1. Implementar el nuevo middleware completo (cookie `active_clinic_id` + verificación contra `profile_clinics`) en una rama separada.
2. Desplegar ambas validaciones en paralelo durante un sprint de transición.
3. Solo eliminar la validación de subdominio cuando la nueva lleve al menos 48h en producción sin incidencias.

**Condición para considerarlo seguro:** Un vet con sesión válida que modifique manualmente la cookie `active_clinic_id` a un UUID de clínica a la que no pertenece recibe 403 en todas las rutas `/api/vet/*`.

---

#### [RIESGO ALTO] 4. Deprecación de `profiles.clinic_id` — 9 routes y 1 trigger en cascada

**Archivo(s):**
```
src/app/api/appointments/route.ts:29
src/app/api/appointments/emergency/route.ts:30
src/app/api/files/[id]/route.ts:27,71
src/app/api/files/upload/route.ts:27
src/app/api/vet/ai-chat/route.ts:17
src/app/api/vet/create-invitation/route.ts:17
src/app/api/vet/resend-invitation/route.ts:15
src/app/api/owner/setup/route.ts:27
src/app/vet/dashboard/page.tsx:22,27,34,39
src/app/vet/layout.tsx:13
supabase/migrations/002_auth_trigger.sql
```

**Por qué es peligroso:** Al pasar `profiles.clinic_id` a `NULL`, estas 9 routes o bien
lanzan 403 inmediatamente (las que tienen guard `!profile?.clinic_id`), o fallan
silenciosamente devolviendo resultados vacíos (las que hacen `.eq('clinic_id', null)`).
El trigger de auth sigue escribiendo el campo obsoleto para nuevos usuarios, generando
confusión sobre si el campo está o no deprecado.

**Consecuencia si se hace mal:** Toda la funcionalidad vet deja de funcionar para
usuarios migrados. `vet/ai-chat`, `files/upload`, `create-invitation` y `resend-invitation`
devuelven 403. `appointments` y `files/[id]` devuelven datos incorrectos sin error.

**Cómo manejarlo:**
1. Migrar las 9 routes a leer `x-active-clinic-id` del header (inyectado por el nuevo middleware) **antes** de nullificar el campo.
2. Actualizar `vet/layout.tsx` y `vet/dashboard` para leer `active_clinic_id` de cookies.
3. Actualizar el trigger `002_auth_trigger.sql` para dejar de escribir `clinic_id` escalar.
4. Solo nullificar `profiles.clinic_id` cuando las 9 routes + dashboard + trigger hayan sido desplegados.

**Condición para considerarlo seguro:** Ningún archivo en `src/` contiene la expresión `profile?.clinic_id` o `profile.clinic_id` usado como fuente de scoping de clínica (excepto en comentarios).

---

#### [RIESGO ALTO] 5. `accept-invite` sin path para usuario existente — cuentas duplicadas

**Archivo(s):** `src/app/api/auth/accept-invite/route.ts:27-43`

**Por qué es peligroso:** La ruta llama siempre `admin.auth.admin.createUser(...)` sin
comprobar si el email ya existe en Supabase Auth. Cuando el marketplace habilite
el flujo de handshake (un owner o vet es invitado a una segunda clínica), `createUser`
fallará con "email already registered" — o peor, si no se valida el error correctamente,
puede crear un perfil huérfano. En cualquier caso, el usuario existente no queda
vinculado a la nueva clínica.

**Consecuencia si se hace mal:** Usuarios con cuentas existentes no pueden unirse a
segundas clínicas via invitación. Si el error no se captura, se generan perfiles
inconsistentes en `profiles` sin usuario de Auth. Los `pet_access` del usuario original
no se replican a la segunda clínica.

**Cómo manejarlo:**
1. Antes de `createUser`, buscar: `admin.from('profiles').select('id, user_id').eq('email', inv.email).maybeSingle()`.
2. Si existe: insertar en `profile_clinics`, procesar `pet_ids` en `pet_access`, marcar invitación como usada. Skip `createUser` y `profiles.upsert`.
3. Si no existe: flujo actual sin cambios.

**Condición para considerarlo seguro:** Una invitación con email de usuario existente resulta en nueva fila en `profile_clinics` (no en nuevo usuario en Supabase Auth). El usuario puede iniciar sesión con su contraseña original y ver la nueva clínica en el selector.

---

### Sección 3 — Capa 1 vs Capa 2: qué es independiente

**Capa 1** = `profile_clinics` + reescritura de 12 RLS + nuevo middleware + refactor de 9 routes  
**Capa 2** = módulo marketplace + features de multi-clínica en el panel existente

| Feature del marketplace / multi-clínica | Depende de Capa 1 | Puede construirse ya |
|---|---|---|
| Páginas `/marketplace/clinicas` (listado y búsqueda) | No | **Sí** |
| Página `/marketplace/clinicas/[slug]` (perfil público) | No | **Sí** |
| Páginas `/marketplace/veterinarios` (listado) | No | **Sí** |
| Página `/marketplace/veterinarios/[id]` (perfil vet) | No | **Sí** |
| `MarketplaceClinicCard` y `MarketplaceVetCard` | No | **Sí** |
| `CareRequestForm` — formulario de solicitud de atención | No — escribe en tabla nueva | **Sí** |
| `ClinicJoinRequestForm` — vet solicita unirse a clínica | No — escribe en tabla nueva | **Sí** |
| API `GET /api/marketplace/clinics` | No | **Sí** |
| API `GET /api/marketplace/vets` | No | **Sí** |
| API `POST /api/care-requests` | No — tabla nueva | **Sí** |
| API `PATCH /api/care-requests/[id]` (aceptar/rechazar) | **Sí** — aceptar vincula via `profile_clinics` | No |
| Valoraciones de clínicas en marketplace | No — usa `appointment_ratings` existente | **Sí** |
| Badge `verified` de clínica (superadmin) | No — columna nueva en `clinics` | **Sí** |
| Reemplazar 6 URLs de email con subdominio | No — búsqueda y reemplazo | **Sí** |
| Configuar redirects 301 de subdominios | No — configuración Vercel/nginx | **Sí** |
| `ClinicSelector` en VetLayout | **Sí** — necesita `profile_clinics` para listar clínicas | No |
| `vet/layout.tsx` con lista de clínicas | **Sí** — join a `profile_clinics` | No |
| `vet/dashboard` con `active_clinic_id` | **Sí** — necesita cookie del nuevo middleware | No |
| Owner dashboard agrupado por clínica | **Sí** — `pet_access` join a `clinics` | No |
| Desvinculación de mascota con borrado de historial | **Sí** — flujo multi-clínica | No |
| Exportación PDF del historial | No — genera desde datos existentes | **Sí** (en Fase D) |
| Selector de clínica activa en sesión (cookie) | **Sí** — nuevo middleware | No |
| `vet/select-clinic` (página de selección inicial) | **Sí** — necesita `profile_clinics` | No |
