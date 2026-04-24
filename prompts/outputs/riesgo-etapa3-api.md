# Etapa 3 — API Routes · riesgo-etapa3-api.md

**Fecha:** 2026-04-24  
**Fuente:** 23 route files en `src/app/api/`  
**Siguiente etapa:** `prompts/outputs/riesgo-etapa4-ui.md`

---

## Métricas

| Métrica | Valor |
|---|---|
| Total routes en `src/app/api/` | 23 |
| Routes que referencian `clinic_id` | 15 |
| Routes que usan `createAdminClient` | 19 |
| Clasificación ROJO | 10 |
| Clasificación AMARILLO | 6 |
| Clasificación VERDE | 7 |

---

## Inventario completo

| Archivo | Cómo obtiene clinic_id | Filtra queries | Clasificación |
|---|---|---|---|
| `admin/create-vet-admin` | Del **body** (`req.json()`) | Escribe directo, sin validar clínica existente | AMARILLO |
| `admin/stripe-config` | No usa | N/A | VERDE |
| `agent/chat` | Del **body**, verificado contra `clinics` table | Sí — `.eq('clinic_id', clinic_id)` | VERDE |
| `appointments` POST | `profile.clinic_id` escalar + `pet.clinic_id` | Sí — cross-check pet vs profile | ROJO |
| `appointments/[id]` PATCH | No lee clinic_id | **No** — actualiza por `id` sin ownership check | ROJO |
| `appointments/[id]/rate` POST+GET | Lee `appt.clinic_id` (pasivo) | Sólo en write vía RLS; GET sin filtro | AMARILLO |
| `appointments/emergency` POST | `profile.clinic_id` escalar + `pet.clinic_id` | Sí — cross-check | ROJO |
| `appointments/slots` GET | **Query param** `clinic_id` (cliente) | Sí — consulta schedules y appointments | AMARILLO |
| `auth/accept-invite` | De BD (`inv.clinic_id`) | N/A — creación nueva; sin path usuario existente | ROJO |
| `auth/register` | No usa | N/A | VERDE |
| `auth/resend-otp` | No usa | N/A | VERDE |
| `auth/validate-invite` | De BD por token (sin auth) | N/A — endpoint público | AMARILLO |
| `auth/verify-otp` | No usa | N/A | VERDE |
| `files/[id]` GET+DELETE | `profile.clinic_id` escalar | Sí — `fileRecord.clinic_id !== profile.clinic_id` | ROJO |
| `files/upload` POST | `profile.clinic_id` escalar (vets) / `pet.clinic_id` (owners) | Sí — para owners; para vets depende de escalar | ROJO |
| `monitoring/health` | No usa | N/A | VERDE |
| `owner/setup` POST | `profile.clinic_id` escalar / `clinics.slug` del body | Escribe `profiles.clinic_id` directamente | ROJO |
| `pets/upload-photo` POST | No lee clinic_id | Owners: via `pet_access`. Vets: sin filtro de clínica en `pets.update()` | AMARILLO |
| `profile/upload-avatar` POST | No usa | N/A — scoped a `user.id` | VERDE |
| `vet/ai-chat` | `profile.clinic_id` escalar | Sí — `.eq('clinic_id', profile.clinic_id)` en pets | ROJO |
| `vet/create-invitation` | `profile.clinic_id` escalar | Sí — escribe `clinic_id: profile.clinic_id` | ROJO |
| `vet/resend-invitation` | `profile.clinic_id` escalar | Sí — `.eq('clinic_id', profile.clinic_id)` | ROJO |
| `vet/usage` | `profile.clinic_id` escalar | Sí — `.eq('clinic_id', profile.clinic_id)` | AMARILLO |

---

## Routes ROJO — detalle

### [ROJO — IDOR] `appointments/[id]/route.ts` PATCH

- **Línea del problema:** 19 y 30-35  
- **Qué puede romperse:** Cualquier usuario autenticado que conozca un `id` de cita puede cambiar su `status`, `notes` o `cancellation_reason`. No existe verificación de que el caller pertenezca a la clínica de esa cita.  
- **Qué necesita cambiar:** Añadir verificación de ownership antes del update:
  ```ts
  const { data: profile } = await supabase.from('profiles')
    .select('role, clinic_id').eq('user_id', user.id).single()
  if (appt.clinic_id !== profile.clinic_id && profile.role !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  ```
- **Nota:** Este bug existe ya en producción, independiente de la migración multi-clínica.

---

### [ROJO] `appointments/route.ts` POST

- **Línea del problema:** 29 (`pet.clinic_id !== profile.clinic_id`) y 101, 138 (URLs de email)  
- **Qué puede romperse:**
  1. `profile.clinic_id` escalar → con multi-clínica, el check `pet.clinic_id !== profile.clinic_id` da siempre false si `profiles.clinic_id` se deprecó a null
  2. URLs de email hardcodean subdominio: `https://${slug}.petfhans.com/owner/dashboard` — quedan rotas cuando se deprecan los subdominios
- **Qué necesita cambiar:**
  1. Leer `active_clinic_id` del header de request (inyectado por middleware)
  2. Reemplazar URLs de email por dominio único: `https://petfhans.com/owner/dashboard`

---

### [ROJO] `appointments/emergency/route.ts` POST

- **Línea del problema:** 30 (`profile?.clinic_id !== pet.clinic_id`)  
- **Qué puede romperse:** Mismo patrón que appointments POST — `profile.clinic_id` escalar se depreca. Vet con multi-clínica no pasa la validación.  
- **Qué necesita cambiar:** Leer `active_clinic_id` del contexto de sesión.

---

### [ROJO] `files/[id]/route.ts` GET + DELETE

- **Línea del problema:** GET:27 (`fileRecord.clinic_id !== profile.clinic_id`) — DELETE:71 (mismo)  
- **Qué puede romperse:** Con `profile.clinic_id = null`, la comparación `null !== fileRecord.clinic_id` es siempre true → todos los archivos devuelven 404 para cualquier usuario migrado.  
- **Qué necesita cambiar:** Comparar contra `active_clinic_id` del header.

---

### [ROJO] `files/upload/route.ts` POST

- **Línea del problema:** 27 (`let clinicId = profile?.clinic_id`) y 54 (`clinic_id: clinicId`)  
- **Qué puede romperse:** Para vets, `clinicId` = `profile.clinic_id` escalar. Si null → `pet_files.clinic_id NOT NULL` lanza constraint violation en BD.  
- **Qué necesita cambiar:** Leer `active_clinic_id` del contexto; el path de pet_owner ya está bien (usa `pet.clinic_id`).

---

### [ROJO] `owner/setup/route.ts` POST

- **Línea del problema:** 27 (`await admin.from('profiles').update({ clinic_id: clinicId })`)  
- **Qué puede romperse:** Esta es la ruta de onboarding que conecta un owner a su primera clínica escribiendo directamente `profiles.clinic_id`. Con `profile_clinics`, debe crear una fila en la nueva tabla en lugar de escribir el campo escalar.  
- **Qué necesita cambiar:** Reemplazar `profiles.update({ clinic_id })` por `profile_clinics.insert({ user_id, clinic_id })`.  
- **Nota:** Esta ruta es el punto de entrada al modelo multi-clínica para owners auto-registrados — es crítica para el handshake flow B.

---

### [ROJO] `vet/ai-chat/route.ts`

- **Línea del problema:** 17 (`if (!profile?.clinic_id) → 403`) y 36 (`.eq('clinic_id', profile.clinic_id)`)  
- **Qué puede romperse:** Con `profile.clinic_id = null`, todos los vets reciben 403. Las queries de pets y medical_records quedan sin scope correcto.  
- **Qué necesita cambiar:** Leer `active_clinic_id` del contexto; reemplazar `!profile?.clinic_id` por verificación contra `profile_clinics`.

---

### [ROJO] `vet/create-invitation/route.ts`

- **Línea del problema:** 17 (`if (!profile?.clinic_id) → 403`) y 41 (`clinic_id: profile.clinic_id`)  
- **Qué puede romperse:** 403 para todos los vet_admin migrados; o invitation se crea con `clinic_id = null` si el check no existe.  
- **Qué necesita cambiar:** Leer `active_clinic_id` del contexto como fuente de `clinic_id` para la invitación.

---

### [ROJO] `vet/resend-invitation/route.ts`

- **Línea del problema:** 15 (`if (!profile?.clinic_id) → 403`) y 28 (`.eq('clinic_id', profile.clinic_id)`)  
- **Qué puede romperse:** 403 para vets migrados; el filtro de ownership en invitations falla con null.  
- **Qué necesita cambiar:** Mismo patrón que create-invitation.

---

### [ROJO] `auth/accept-invite/route.ts`

- **Línea del problema:** No existe ninguna rama para "usuario ya tiene cuenta"  
- **Qué puede romperse:** Si el mismo email ya tiene cuenta en Supabase Auth (p.ej., owner invitado a segunda clínica), `admin.auth.admin.createUser` falla o crea duplicado.  
- **Qué necesita cambiar:** Antes de `createUser`, buscar si el email ya existe:
  ```ts
  const existing = await admin.from('profiles').select('id').eq('email', inv.email).maybeSingle()
  if (existing) {
    // path: vincular existing user a nueva clínica via profile_clinics
    // skip createUser, skip profile upsert
  }
  ```

---

## Routes AMARILLO — detalle

| Route | Problema | Qué hacer |
|---|---|---|
| `admin/create-vet-admin` | `clinic_id` del body sin verificar existencia en `clinics`. Superadmin only. | Validar que la clínica existe; migrar a `profile_clinics.insert()` en lugar de `profiles.upsert({ clinic_id })` |
| `appointments/[id]/rate` | GET devuelve todas las ratings de un appointment sin verificar si el caller tiene acceso a esa cita | Añadir ownership check en GET: vet de la clínica o owner con `pet_access` |
| `appointments/slots` | `clinic_id` del query param (por diseño: permite ver slots antes de tener sesión activa) | Con multi-clínica: verificar que el usuario tiene o puede tener relación con esa clínica |
| `auth/validate-invite` | Endpoint público (sin auth) que devuelve datos de la invitación. Correcto por diseño (token como credencial). | Sin cambios para multi-clínica, pero añadir check de que la clínica esté activa/verified cuando exista el concepto |
| `pets/upload-photo` | `admin.from('pets').update({ photo_url }).eq('id', petId)` sin `.eq('clinic_id', ...)` para vets | Añadir `.eq('clinic_id', active_clinic_id)` en el update para evitar que un vet actualice foto de mascota de otra clínica |
| `vet/usage` | Retorna `{ count: 0, max: 0 }` cuando `clinic_id = null`. No rompe, pero los datos son incorrectos post-migración. | Adaptar para leer `active_clinic_id` del contexto |

---

## Routes que necesitan "clínica activa" en el contexto

Estas routes deben leer `active_clinic_id` del header `x-active-clinic-id` (inyectado por el middleware) en lugar de `profile.clinic_id`:

| Route | Acción requerida |
|---|---|
| `appointments` POST | Reemplazar `profile.clinic_id` por `active_clinic_id` |
| `appointments/emergency` POST | Reemplazar `profile.clinic_id` por `active_clinic_id` |
| `appointments/[id]` PATCH | Añadir ownership check usando `active_clinic_id` |
| `files/[id]` GET+DELETE | Reemplazar comparación escalar por `active_clinic_id` |
| `files/upload` POST | Para vets: usar `active_clinic_id` como `clinicId` |
| `vet/ai-chat` | Reemplazar guard `!profile?.clinic_id` y query por `active_clinic_id` |
| `vet/create-invitation` | Reemplazar `profile.clinic_id` como fuente de `clinic_id` |
| `vet/resend-invitation` | Reemplazar `profile.clinic_id` en guard y filter |
| `vet/usage` | Reemplazar `profile.clinic_id` por `active_clinic_id` |

---

## URLs de email con patrón de subdominio deprecado

Estas líneas generan URLs `https://${slug}.petfhans.com/...` que quedan rotas cuando se deprecan los subdominios:

| Archivo | Línea | URL generada |
|---|---|---|
| `appointments/route.ts` | 101 | `https://${slug}.petfhans.com/owner/dashboard` |
| `appointments/route.ts` | 138 | `https://${slug}.petfhans.com/vet/appointments` |
| `appointments/[id]/route.ts` | 93 | `https://${clinic?.slug}.petfhans.com/owner/dashboard` |
| `auth/accept-invite/route.ts` | 86 | `https://${slug}.petfhans.com/auth/login` |
| `vet/create-invitation/route.ts` | 56 | `https://${clinic?.slug}.petfhans.com/auth/invite?token=...` |
| `vet/resend-invitation/route.ts` | 38 | `https://${clinic?.slug}.petfhans.com/auth/invite?token=...` |

Todas deben migrar a `https://petfhans.com/...` (dominio único).

---

## Routes del marketplace que pueden construirse ya

Las siguientes routes nuevas no dependen de `profiles.clinic_id` y pueden construirse antes de Fase B:

| Route nueva | Descripción | Depende de Fase B |
|---|---|---|
| `GET /api/marketplace/clinics` | Listado y búsqueda de clínicas verificadas | No |
| `GET /api/marketplace/clinics/[slug]` | Perfil público de clínica | No |
| `GET /api/marketplace/vets` | Búsqueda de vets con perfil público | No |
| `POST /api/care-requests` | Crear solicitud de atención (care_request) | No — nueva tabla |
| `PATCH /api/care-requests/[id]` | Aceptar/rechazar/bloquear solicitud | No — nueva tabla |
| `POST /api/clinic-join-requests` | Vet solicita unirse a segunda clínica | No — nueva tabla |
| `GET /api/clinics/[id]/ratings` | Valoraciones públicas de una clínica | No — usa `appointment_ratings` existente |

---

## Dependencias con Etapas 1-2

| Hallazgo anterior | Route(s) afectada(s) | Impacto |
|---|---|---|
| `get_user_clinic_id()` escalar en RLS | Todas las routes con `createClient()` que hacen queries con RLS activa | Queries pueden devolver 0 resultados si RLS usa `get_user_clinic_id()` = null durante migración |
| Middleware leerá `active_clinic_id` de cookie | Las 9 routes ROJO listadas arriba | Dependen de que el middleware inyecte `x-active-clinic-id` correctamente |
| JWT `clinic_id` stale | `accept-invite` al crear `user_metadata` | El JWT de usuarios creados antes de la migración tiene `clinic_id` que ya no existe en `profiles` |
| Validación de subdominio eliminada | `appointments`, `appointments/emergency`, `vet/*` | Sin la validación de subdominio, la única protección de scope es `active_clinic_id` del header — si el middleware no lo inyecta, hay 0 protección de clínica |
