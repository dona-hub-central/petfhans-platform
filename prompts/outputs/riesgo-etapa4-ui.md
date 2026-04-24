# Etapa 4 — UI y Layouts · riesgo-etapa4-ui.md

**Fecha:** 2026-04-24  
**Fuente:** VetLayout · AdminLayout · vet/layout · vet/dashboard · owner/dashboard · admin/page  
**Siguiente etapa:** `prompts/marketplace-coste-tecnico.md` (Etapa 5)

---

## VetLayout — cambios necesarios para multi-clínica

**Archivo:** `src/components/shared/VetLayout.tsx`

### Props actuales

```ts
{
  children:   React.ReactNode
  clinicName: string          // ← escalar: una sola clínica
  userName:   string
  avatarUrl?: string | null
  role?:      string | null
}
```

`clinicName` se renderiza en la cabecera del sidebar (línea 118) y el header móvil (línea 193) como texto estático. No hay selector de clínica.

### Suposiciones de clínica única

| Elemento | Línea | Asunción |
|---|---|---|
| Cabecera sidebar | 118 | `{clinicName}` — string único |
| Cabecera móvil | 193 | `{clinicName}` — string único |
| Barra de uso | 87 | `fetch('/api/vet/usage')` sin parámetro de clínica — retorna datos de `profile.clinic_id` |
| Nav items | 34-43 | Rutas absolutas sin prefijo de clínica — no cambian con multi-clínica |

### Props que cambian con multi-clínica

```ts
{
  children:        React.ReactNode
  clinics:         Array<{ id: string; name: string }>  // lista de clínicas del usuario
  activeClinicId:  string                               // clínica activa en sesión
  onClinicChange?: (id: string) => void                 // cambiar clínica activa
  userName:        string
  avatarUrl?:      string | null
  role?:           string | null
}
```

### Dónde va el selector de clínica activa

- **Posición:** En la cabecera del sidebar (desktop), reemplazando el texto `{clinicName}` actual.
- **Posición móvil:** En el header superior, entre el logo y el avatar.
- **Componente:** `<ClinicSelector clinics={clinics} activeClinicId={activeClinicId} onChange={onClinicChange} />`
- **Al cambiar:** Escribe cookie `active_clinic_id` + hace `router.refresh()` para recargar Server Components con el nuevo contexto.
- **Barra de uso:** Debe pasar `?clinic_id={activeClinicId}` al fetch de `/api/vet/usage`.

### Datos que dependen de clínica activa

- Barra de pacientes activos (barra de uso)
- Todos los datos del dashboard (pet count, records, invitations)
- Listados de mascotas, citas, consultas, invitaciones, equipo

---

## `src/app/vet/layout.tsx` — cambios necesarios

**Archivo:** `src/app/vet/layout.tsx`

### Estado actual

```ts
// Línea 12-14:
const { data: profile } = await supabase
  .from('profiles')
  .select('full_name, role, avatar_url, clinics(name)')  // join escalar vía profiles.clinic_id
  .eq('user_id', user.id).single()

const clinicName = (profile as ProfileRow | null)?.clinics?.name ?? ''
```

El layout obtiene exactamente una clínica via `profiles.clinic_id → clinics.id`. Si `profiles.clinic_id` es null, `clinicName` es `''`.

### Cambios necesarios

```ts
// NECESARIO — leer lista de clínicas del usuario y clínica activa de cookie
const cookieStore = await cookies()
const activeClinicId = cookieStore.get('active_clinic_id')?.value

const { data: profileClinics } = await supabase
  .from('profile_clinics')
  .select('clinic_id, clinics(id, name)')
  .eq('user_id', user.id)

const clinics = profileClinics?.map(pc => pc.clinics) ?? []
const activeClinic = clinics.find(c => c.id === activeClinicId) ?? clinics[0]
```

El layout pasa `clinics` y `activeClinicId` a `VetLayout`, que renderiza el selector.

---

## Vet Dashboard — cambios necesarios

**Archivo:** `src/app/vet/dashboard/page.tsx`

### Asunciones de clínica única

Las 4 queries del dashboard usan `profile?.clinic_id` escalar (líneas 22, 27, 34, 39):

```ts
// HOY — las 4 queries:
.eq('clinic_id', profile?.clinic_id)   // null si migrado → devuelve 0 resultados sin error
```

El comportamiento con `clinic_id = null` es silencioso: Supabase retorna 0 filas pero no falla. El dashboard mostraría 0 pacientes, 0 consultas, 0 invitaciones — sin indicar al vet que hay un problema de configuración.

### Cambios necesarios

```ts
// NECESARIO — leer active_clinic_id de cookies en Server Component
const cookieStore = await cookies()
const activeClinicId = cookieStore.get('active_clinic_id')?.value
if (!activeClinicId) redirect('/vet/select-clinic')  // nueva página de selección

// Las 4 queries:
.eq('clinic_id', activeClinicId)
```

### Qué necesita el contexto de clínica activa

- `petCount` — mascotas de la clínica activa
- `recentRecords` — consultas de la clínica activa
- `weekRecords` — consultas de la semana de la clínica activa
- `invCount` — invitaciones pendientes de la clínica activa

---

## Owner Dashboard — cambios necesarios

**Archivo:** `src/app/owner/dashboard/page.tsx`

### Estructura actual

La implementación actual (post fix pet_access) consulta:
```ts
const { data: access } = await admin.from('pet_access')
  .select('pet_id').eq('owner_id', profile.id)
// → lista plana de mascotas
```

Muestra las mascotas como **lista plana** sin agrupación por clínica. Con multi-clínica, el owner puede tener mascotas en clínicas diferentes y no puede distinguir de qué clínica viene cada una.

### Estructura necesaria con multi-clínica

```ts
// pet_access incluye clinic_id → permite agrupar
const { data: access } = await admin.from('pet_access')
  .select('pet_id, clinic_id, clinics(name)')
  .eq('owner_id', profile.id)

// Agrupar por clínica:
const grouped = Map<clinicId, { clinicName: string; pets: Pet[] }>
```

El dashboard renderizaría:
```
[Clínica Felina Barcelona]
  └─ Luna · Gato · Siamés
  └─ Max · Perro · Labrador

[Vetcenter Madrid]
  └─ Tobi · Perro · Beagle
```

### Componentes a refactorizar

| Componente | Cambio requerido |
|---|---|
| Lista de mascotas | Refactorizar de `map(pets)` a `map(clinicGroups, map(pets))` |
| Cabecera (clinic badge) | Mostrar múltiples clínicas o quitar el badge de clínica única |
| Empty state | Cambiar texto "Tu clínica te asignará una pronto" a algo neutro |

---

## Admin Dashboard — cambios necesarios

**Archivo:** `src/app/admin/page.tsx`

El panel superadmin no tiene scoping de clínica — consulta datos globales. No necesita cambios para multi-clínica.

**Único cambio:** Línea 74 muestra `{clinic.slug}.petfhans.com` como URL de cada clínica. Con subdominios deprecados, debe actualizarse la visualización a `petfhans.com/[slug]` o simplemente al slug.

---

## AdminLayout — cambios necesarios

**Archivo:** `src/components/admin/AdminLayout.tsx`

No tiene relación con `clinic_id`. No requiere cambios para multi-clínica.

---

## Componentes nuevos requeridos

| Componente | Descripción | Depende de Capa 1 |
|---|---|---|
| `ClinicSelector` | Dropdown en sidebar de VetLayout — lista clínicas del usuario, marca la activa, escribe cookie | **Sí** — necesita `profile_clinics` para obtener la lista |
| `MarketplaceClinicCard` | Card de clínica en `/marketplace/clinicas` — logo, nombre, ciudad, especialidades, rating, badge verificada | No |
| `MarketplaceVetCard` | Card de vet en `/marketplace/veterinarios` — foto, nombre, especialidades, clínicas | No |
| `CareRequestForm` | Formulario de solicitud de atención — selección de mascota (existente o nueva), motivo, preferencia de vet | No |
| `ClinicPublicProfile` | Página de perfil de clínica en marketplace — cover, equipo, valoraciones, CTA | No |
| `ClinicJoinRequestForm` | Formulario para vet que solicita unirse a segunda clínica | No |
| `PetUnlinkModal` | Modal de desvinculación con advertencia y enlace a exportar PDF | **Sí** — necesita `pet_access` multi-clínica |
| `OwnerClinicGroup` | Sección del owner dashboard que agrupa mascotas por clínica | **Sí** — necesita `pet_access.clinic_id` con join a `clinics` |

---

## Componentes del marketplace independientes de Capa 1

Estos componentes pueden construirse sin esperar el cambio de `profiles.clinic_id` porque solo leen datos públicos de clínicas o crean filas en tablas nuevas:

- `MarketplaceClinicCard`
- `MarketplaceVetCard`
- `CareRequestForm` (escribe en `care_requests`, tabla nueva)
- `ClinicPublicProfile` (lee de `clinics` + `appointment_ratings` existentes)
- `ClinicJoinRequestForm` (escribe en `clinic_join_requests`, tabla nueva)

Las páginas `/marketplace/clinicas` y `/marketplace/veterinarios` completas son independientes de Capa 1.

---

## Resumen de impacto en UI

| Categoría | N |
|---|---|
| Componentes que necesitan refactor | 4 |
| Componentes nuevos para el marketplace | 6+ |
| Componentes bloqueados hasta resolver Capa 1 | 3 |

**Componentes bloqueados (necesitan `profile_clinics` antes de implementarse):**
1. `VetLayout` — el selector de clínica activa requiere lista de clínicas del usuario
2. `vet/layout.tsx` — el join `profiles → clinics` debe cambiar a `profile_clinics → clinics`
3. `vet/dashboard/page.tsx` — las 4 queries dependen de `active_clinic_id` válido en cookie

---

## Dependencias con Etapas 1-3

| Hallazgo anterior | Impacto en UI |
|---|---|
| `profiles.clinic_id` escalar (Etapa 1) | `vet/layout.tsx` asume join escalar; VetLayout recibe `string` en lugar de array |
| `get_user_clinic_id()` en RLS (Etapa 1) | Server Components que usan `createClient()` con RLS activa pueden devolver 0 datos si la función devuelve null durante la migración |
| Middleware elimina validación de subdominio (Etapa 2) | La cookie `active_clinic_id` debe estar presente antes de renderizar cualquier página vet; el layout debe redirigir a `/vet/select-clinic` si falta |
| 9 API routes necesitan `x-active-clinic-id` (Etapa 3) | Los datos del dashboard se obtienen del servidor (queries directas), no de las API routes — no afectado directamente. Pero la barra de uso en VetLayout sí llama `/api/vet/usage` desde el cliente |
| `owner/setup` escribe `profiles.clinic_id` (Etapa 3) | El onboarding del owner no muestra grupo de clínica hasta que se refactorice `owner/setup` a `profile_clinics.insert()` |
