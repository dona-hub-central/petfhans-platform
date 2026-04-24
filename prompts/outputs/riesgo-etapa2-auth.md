# Etapa 2 — Auth y flujo de clinic_id · riesgo-etapa2-auth.md

**Fecha:** 2026-04-24  
**Fuente:** middleware.ts · supabase/{client,server,admin}.ts · invitation-permissions.ts · accept-invite · create-invitation  
**Siguiente etapa:** `prompts/outputs/riesgo-etapa3-api.md`

---

## Decisión arquitectónica confirmada — 2026-04-24

| Aspecto | Modelo actual | Modelo futuro |
|---|---|---|
| Acceso por clínica | Subdominio `clinica.petfhans.com` | Dominio único `petfhans.com` |
| Subdominios existentes | Activos | Deprecados con redirect 301 |
| Selector de clínica activa | Subdominio implícito | Cookie de sesión `active_clinic_id` |
| Validación en middleware | `clinicSlug !== subdomain` | `activeClinicId` leído de cookie, verificado contra `profile_clinics` |

**Consecuencias para la Etapa 3:**
- Las API routes que leen `clinic_id` del perfil (`profiles.clinic_id`) deben migrar a leer `activeClinicId` del contexto de request.
- El middleware inyectará `x-active-clinic-id` en los headers; las routes lo leerán desde ahí.
- Las routes que hoy asumen `profile.clinic_id` escalar necesitan refactor para leer el header o la cookie.

---

## Cómo fluye clinic_id hoy (paso a paso)

```
1. El vet_admin crea una invitación via create-invitation
   └── profile.clinic_id leído de BD (profiles:15)
   └── clinic_id escrito en invitations.clinic_id (invitations:41)

2. El invitado abre el enlace y acepta via accept-invite
   └── token → lookup de invitations en BD (accept-invite:17-18)
   └── clinic_id viene DE LA BD (inv.clinic_id), nunca del body
   └── createUser con user_metadata: { clinic_id: inv.clinic_id } (accept-invite:31)
   └── trigger 002_auth_trigger lee raw_user_meta_data->>'clinic_id' → profiles.clinic_id
   └── upsert directo en profiles con clinic_id: inv.clinic_id (accept-invite:42)

3. En cada request posterior
   └── middleware.ts:49 → supabase.auth.getUser() (verifica sesión)
   └── middleware.ts:69-73 → BD query: profiles.select('role, clinic_id, clinics(slug)')
   └── middleware.ts:77  → clinicSlug = profile.clinics.slug
   └── middleware.ts:86  → if (clinicSlug && clinicSlug !== subdomain) → redirect login

4. El subdominio (no el JWT) es el árbitro de clínica activa
   └── hostname "clinicafeline.petfhans.com" → subdomain = "clinicafeline"
   └── Se compara con el slug de la clínica del perfil
   └── Si no coincide → redirect a login (hard enforcement)
```

---

## clinic_id en el JWT

| Atributo | Valor |
|---|---|
| ¿Está en `user_metadata`? | **Sí** — `accept-invite/route.ts:31` |
| Campo exacto | `user_metadata.clinic_id` (UUID escalar como string) |
| ¿Lo lee el middleware? | **No** — el middleware ignora el JWT y consulta la BD directamente |
| ¿Lo usa el trigger? | **Sí** — `002_auth_trigger.sql` lee `raw_user_meta_data->>'clinic_id'` |
| ¿Es escalar o podría ser array? | Escalar — `inv.clinic_id` es UUID único; el tipo en `user_metadata` es `string \| null` |

**Implicación:** El JWT porta un `clinic_id` que activa el trigger de auth al crear el perfil.  
Después de eso, el JWT nunca más se lee para obtener `clinic_id`. El middleware lo ignora  
y consulta la BD en cada request. Esto es correcto hoy, pero el JWT stale es un riesgo  
durante el rollout: si algún código nuevo (o futuro) lee `user_metadata.clinic_id` en lugar  
de la BD, obtendrá el valor original del momento de registro.

---

## Punto de asignación en accept-invite

| Punto | Archivo | Línea | Qué escribe |
|---|---|---|---|
| JWT user_metadata | accept-invite/route.ts | 31 | `user_metadata: { clinic_id: inv.clinic_id }` → activa trigger de auth |
| Perfil directo | accept-invite/route.ts | 42 | `profiles.upsert({ clinic_id: inv.clinic_id })` — segundo punto de escritura |
| pet_access legacy | accept-invite/route.ts | 52-57 | `pet_access.upsert({ clinic_id: inv.clinic_id })` para pet_id singular |
| pet_access moderno | accept-invite/route.ts | 63-70 | `pet_access.insert(inv.pet_ids.map(...))` para array de mascotas |

**Impacto de cambiar a multi-clínica:**  
`accept-invite` solo tiene un path: **crear usuario nuevo**. No existe lógica para  
el caso "el email ya tiene cuenta en Petfhans → vincular a la nueva clínica sin crear usuario duplicado".  
Este es el cambio más profundo del flujo: hay que añadir un path completo de  
"usuario existente + segunda clínica → insertar en `profile_clinics`, no en `profiles`".

---

## Validación del subdominio en el middleware

```typescript
// middleware.ts:85-88
if (subdomain !== 'admin' && role !== 'superadmin') {
  if (clinicSlug && clinicSlug !== subdomain) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
}
```

**Hoy:** `clinicSlug` es un string único (el slug de `profiles.clinic_id → clinics.slug`).  
**Con multi-clínica:** un usuario puede tener múltiples `clinicSlug`. La condición  
`clinicSlug !== subdomain` rompería para cualquier usuario que acceda a una segunda clínica.

**Adicionalmente:** el modelo de subdominios `clinicafeline.petfhans.com` asume  
una clínica por usuario. Con el marketplace, el acceso pasa a ser path-based  
(`/vet/dashboard` bajo sesión, sin subdominio distinto) o el middleware debe  
consultar `profile_clinics` para una lista de slugs válidos.

---

## create-invitation — cómo obtiene clinic_id

```typescript
// create-invitation/route.ts:14-17
const { data: profile } = await supabase.from('profiles')
  .select('id, role, clinic_id').eq('user_id', user.id).single()

if (!profile?.clinic_id) return NextResponse.json({ error: 'Sin clínica asignada' }, { status: 403 })
```

- `clinic_id` viene del perfil del invitador (BD), nunca del body — correcto.
- La validación `!profile?.clinic_id` bloquea a cualquier usuario con `clinic_id = null`.  
  Con multi-clínica, un vet o vet_admin puede tener `profiles.clinic_id = null` si ya  
  se migró al modelo `profile_clinics`. Esta línea daría 403 a todos los invitadores  
  durante la migración transitoria.
- No hay validación de que el invitador tenga permiso sobre la clínica específica más allá  
  de que `profile.clinic_id` exista — correcto para una sola clínica, pero insuficiente  
  para multi-clínica donde el invitador debe declarar desde qué clínica invita.

---

## createAdminClient — scoping actual

`admin.ts` devuelve un cliente raw con `SUPABASE_SERVICE_ROLE_KEY` sin ningún scope de clínica.  
Toda la responsabilidad de filtrar recae en el código que lo llama.

| Uso en accept-invite | Tiene .eq('clinic_id')? | Seguro? |
|---|---|---|
| `admin.from('invitations').eq('token', token)` | No | Sí — token es único y viene de BD |
| `admin.auth.admin.createUser(...)` | N/A | Sí — escribe desde inv.clinic_id |
| `admin.from('profiles').upsert(...)` | No necesario | Sí — upsert solo afecta el user_id propio |
| `admin.from('pets').update(...).eq('id', inv.pet_id)` | No | Riesgo bajo — pet_id viene de inv validado |
| `admin.from('pet_access').upsert(...)` | No | Sí — inserta solo para owner_id/pet_id específicos |

| Uso en create-invitation | Tiene .eq('clinic_id')? | Seguro? |
|---|---|---|
| `admin.from('invitations').insert({ clinic_id: profile.clinic_id, ... })` | Escribe clinic_id | Sí |
| `admin.from('clinics').select('slug, name').eq('id', profile.clinic_id)` | Sí via .eq('id') | Sí |

---

## Cambios necesarios en el middleware para multi-clínica

1. **Reemplazar consulta escalar por lista de clínicas:**
   ```typescript
   // HOY:
   .select('role, clinic_id, clinics(slug)')
   // NECESARIO:
   .select('role, profile_clinics(clinic_id, clinics(slug))')
   // o equivalente via profile_clinics join
   ```

2. **Cambiar lógica de validación de subdominio:**
   ```typescript
   // HOY:
   if (clinicSlug && clinicSlug !== subdomain) → redirect
   // NECESARIO:
   const validSlugs = profile.profile_clinics.map(pc => pc.clinics.slug)
   if (subdomain !== 'admin' && !validSlugs.includes(subdomain)) → redirect
   ```

3. **Introducir "clínica activa" en el contexto:**  
   El subdominio actualmente actúa como selector de clínica activa implícito.  
   Con multi-clínica y un solo dominio, se necesita un mecanismo explícito:  
   cookie `active_clinic_id`, header `x-active-clinic`, o parámetro en la sesión.  
   El middleware debe inyectarlo en los headers de request para que las API routes  
   puedan leerlo sin consultar la BD adicional.

4. **Query adicional en cada request:**  
   Hoy: 1 query BD por request (profiles). Con multi-clínica: 1 query a `profile_clinics`  
   con join a `clinics`. El coste es similar pero debe añadirse índice en  
   `profile_clinics(user_id)` para mantener latencia.

---

## Riesgos de seguridad identificados

| Riesgo | Severidad | Descripción |
|---|---|---|
| Ventana de JWT stale | **Alto** | `user_metadata.clinic_id` queda obsoleto si el usuario se une a nuevas clínicas. Si algún código lo lee directamente (ej. edge functions), expondrá datos incorrectos |
| Validación de subdominio rota | **Alto** | `clinicSlug !== subdomain` es una condición binaria; con multi-clínica devuelve siempre `true` para el segundo subdominio, bloqueando el acceso legítimo o requiriendo reescritura urgente |
| `create-invitation` 403 durante migración | **Medio** | Si `profiles.clinic_id` se depreca a `null` antes de adaptar esta route, todos los vet_admin pierden capacidad de invitar |
| No hay path "usuario existente" en accept-invite | **Alto** | Si se intenta vincular un email con cuenta existente, se crea un usuario duplicado en Supabase Auth. Los tokens de la segunda cuenta no tendrán las vinculaciones del usuario original |
| `createAdminClient` sin scope | **Medio** | Bypass total de RLS. Cada nuevo uso del admin client requiere revisión manual de que todos los filtros de clínica están presentes. No hay enforcement automático |

---

## Dependencias con Etapa 1

| Hallazgo Etapa 1 | Impacto en auth |
|---|---|
| `get_user_clinic_id()` retorna escalar | El middleware consulta la BD, no la función SQL, pero la función es usada en las RLS que validan cada query que el middleware desencadena |
| 12 RLS policies usan `get_user_clinic_id()` | La query del middleware (`supabase.from('profiles').select(...)`) pasa por RLS; si `get_user_clinic_id()` devuelve NULL durante la migración, el middleware no puede leer el perfil → bucle de redirect |
| Trigger `002_auth_trigger` escribe `clinic_id` escalar | El trigger se dispara cuando `accept-invite` llama `admin.auth.admin.createUser`; si el trigger se cambia antes de adaptar accept-invite, los nuevos usuarios quedarán sin `profiles.clinic_id` |
| `profiles.clinic_id` nullable | Permite `pet_owner` sin clínica — hoy es un caso válido. Con multi-clínica, la nulabilidad se extiende a todos los roles durante la migración |
