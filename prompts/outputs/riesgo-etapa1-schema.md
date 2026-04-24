# Etapa 1 — Inventario de schema · riesgo-etapa1-schema.md

**Fecha:** 2026-04-24  
**Fuente:** 10 archivos `supabase/migrations/001` → `010`  
**Siguiente etapa:** `prompts/marketplace-analisis-riesgo.md` → Etapa 2

---

## Métricas

| Métrica | Valor |
|---|---|
| Total apariciones de `clinic_id` en migraciones | 25 |
| Archivos que contienen `clinic_id` | 5 de 10 |
| Tablas con columna `clinic_id` | 6 |
| Políticas RLS que llaman `get_user_clinic_id()` | 12 |
| Tablas sin `clinic_id` (aisladas sólo por FK transitiva) | 3 |
| Índices sobre `clinic_id` | 3 |

---

## Tablas con `clinic_id`

| Tabla | Migración | Constraint | Comportamiento ON DELETE |
|---|---|---|---|
| `profiles` | 001 | `NULLABLE` FK → `clinics.id` | `SET NULL` |
| `pets` | 001 | `NOT NULL` FK → `clinics.id` | `CASCADE` |
| `medical_records` | 001 | `NOT NULL` FK → `clinics.id` | (sin declarar, defecto RESTRICT) |
| `invitations` | 001 | `NOT NULL` FK → `clinics.id` | `CASCADE` |
| `pet_files` | 003 | `NOT NULL` FK → `clinics.id` | (sin declarar) |
| `pet_access` | 008 | `NOT NULL` FK → `clinics.id` | (sin declarar) |

---

## Tablas SIN `clinic_id` (aislamiento sólo transitivo)

| Tabla | Migración | Cómo está aislada por clínica |
|---|---|---|
| `appointments` | CREATE TABLE **ausente** — sólo ALTERs en 005 y 007 | Via `pet_id → pets.clinic_id` (implícito) |
| `appointment_ratings` | 006 | Via `appointment_id → appointments → pets.clinic_id` (dos saltos) |
| `habit_logs` | 001 | Política usa sub-SELECT `pets WHERE clinic_id = get_user_clinic_id()` |

> **Anomalía crítica:** `appointments` carece de `CREATE TABLE` en el historial de migraciones.  
> Las migraciones 005 (`ADD COLUMN is_virtual`) y 007 (`ADD COLUMN vet_id`) hacen `ALTER TABLE appointments`,  
> pero la definición original no aparece en ningún archivo local. La tabla fue creada directamente  
> en el dashboard de Supabase. Esto representa un **gap en la cadena de migraciones**.

---

## Función helper — punto de fallo central

```sql
-- 001_initial_schema.sql:127
CREATE OR REPLACE FUNCTION get_user_clinic_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
$$;
```

**Tipo de retorno:** `UUID` (escalar).  
**Usada en:** 12 políticas RLS y al menos 2 migraciones posteriores (008, 009).  
**Riesgo para multi-clínica:** Toda política que llama `get_user_clinic_id()` asume  
que un usuario pertenece a **exactamente una** clínica. Con `profile_clinics` (muchos-a-muchos),  
esta función devolvería `NULL` o el valor residual de `profiles.clinic_id`,  
rompiendo las 12 políticas simultáneamente.

---

## Políticas RLS — condiciones exactas

| Nº | Tabla | Nombre de política | Condición crítica |
|---|---|---|---|
| 1 | `clinics` | Usuarios ven su propia clínica | `id = get_user_clinic_id()` |
| 2 | `profiles` | Usuarios ven perfiles de su clínica | `clinic_id = get_user_clinic_id()` |
| 3 | `pets` | Vets ven mascotas de su clínica | `clinic_id = get_user_clinic_id()` |
| 4 | `pets` | Vets gestionan mascotas de su clínica | `clinic_id = get_user_clinic_id()` |
| 5 | `medical_records` | Vets gestionan historiales de su clínica | `clinic_id = get_user_clinic_id()` |
| 6 | `invitations` | Vets admin gestionan invitaciones (original) | `clinic_id = get_user_clinic_id()` ← DROP en 009 |
| 7 | `habit_logs` | Vets ven hábitos de mascotas de su clínica | `pet_id IN (SELECT id FROM pets WHERE clinic_id = get_user_clinic_id())` |
| 8 | `pet_files` | Vet gestiona archivos de su clinica | `clinic_id = get_user_clinic_id()` |
| 9 | `pet_access` | vet_manages_pet_access | `clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())` |
| 10 | `pets` | pets_access_policy (008) | `clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())` |
| 11 | `invitations` | vet_admin_manages_invitations (009) | `clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())` |
| 12 | `appointment_ratings` | owner_rates_own_appointment (010) | usa `pet_access` como puente |

> **Nota:** Las políticas 9, 10 y 11 no llaman `get_user_clinic_id()` nominalmente pero  
> replican el mismo sub-SELECT en línea — idéntico riesgo de rotura.

---

## Tabla `invitations` — estado actual

```sql
-- 001_initial_schema.sql
CREATE TABLE invitations (
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  ...
);

-- 009_fix_invitations_rls.sql
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS pet_ids UUID[] NOT NULL DEFAULT '{}';
```

- `pet_ids UUID[]`: array de mascotas autorizadas al `pet_owner` en el momento de la invitación.  
- Política actual `vet_admin_manages_invitations` filtra por `clinic_id` de `profiles` (escalar).  
- **Para multi-clínica:** el flujo de handshake genera `care_request`, no `invitations`. El flujo de invitaciones existente sólo cubre el camino B (clínica invita directamente). Ambos flujos deben coexistir.

---

## Tabla `profiles` — estado actual

```sql
-- 001_initial_schema.sql
CREATE TABLE profiles (
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,  -- NULLABLE
  ...
);

-- 002_auth_trigger.sql
INSERT INTO profiles (user_id, role, full_name, email, clinic_id)
VALUES (
  ...,
  (NEW.raw_user_meta_data->>'clinic_id')::UUID  -- escalar, desde JWT
);
```

- `clinic_id` en `profiles` es NULLABLE (permite `pet_owner` auto-registrado sin clínica).  
- El trigger de auth lee `clinic_id` del JWT como UUID escalar. Si el usuario se registra sin invitación, `clinic_id = NULL`.  
- El índice `idx_profiles_clinic_id` acelera `get_user_clinic_id()` — seguirá existiendo pero apuntará a un campo que se vuelve residual con la migración.

---

## Índices relevantes

| Índice | Tabla | Migración |
|---|---|---|
| `idx_profiles_clinic_id` | `profiles(clinic_id)` | 001 |
| `idx_pets_clinic_id` | `pets(clinic_id)` | 001 |
| `idx_medical_records_clinic_id` | `medical_records(clinic_id)` | 001 |

---

## Hallazgos críticos

1. **`get_user_clinic_id()` es el único punto de verdad escalar.** Las 12 políticas RLS dependen de que `profiles.clinic_id` sea un UUID único. Mover a `profile_clinics` invalida toda la capa de seguridad simultáneamente.

2. **`profiles.clinic_id` tiene doble rol:** es la FK al tenant Y la fuente del contexto de clínica activa. Al separar estos dos roles (FK → `profile_clinics`, contexto activo → sesión/cookie), el trigger de auth y el índice quedan obsoletos.

3. **El trigger `002_auth_trigger.sql` escribe `clinic_id` escalar en el JWT.** Cualquier usuario creado antes de la migración tendrá un JWT con `clinic_id` stale. Los tokens no se invalidan automáticamente — ventana de estado inconsistente durante el rollout.

4. **`appointment_ratings` depende de dos saltos de FK** sin `clinic_id` propio. La política en `010` usa `pet_access` para validar al owner, lo cual es correcto. Sin embargo, si `pet_access` cambia su estructura por multi-clínica, esta política hereda el riesgo.

5. **`appointments` no tiene `CREATE TABLE` en migraciones.** No es posible auditar su definición completa (columnas, constraints, RLS original) desde los archivos locales. Requiere consulta directa al schema de Supabase (`information_schema.columns` o `pg_policies`).

---

## Hallazgos ambiguos (requieren verificación en Etapa 2 o consulta a Supabase)

| Hallazgo | Por qué es ambiguo | Cómo resolver |
|---|---|---|
| `appointments` sin CREATE TABLE | La tabla existe en producción pero no en migraciones | Consultar `information_schema.columns WHERE table_name = 'appointments'` |
| `medical_records.clinic_id` sin ON DELETE | La migración no declara ON DELETE; comportamiento depende del default de Postgres (RESTRICT) | Verificar con `\d medical_records` en psql |
| `pet_files` storage policies | Las policies de `storage.objects` usan `auth.role() = 'authenticated'` sin filtro de clínica | Confirmar si Supabase Storage tiene RLS separada o si el bucket es privado |

---

## Resumen de impacto para migración multi-clínica

| Área | Cambio requerido | Riesgo |
|---|---|---|
| `get_user_clinic_id()` | Reescribir para aceptar `clinic_id` activo como parámetro o desde sesión | **CRÍTICO** |
| 12 políticas RLS | Reescribir todas para `profile_clinics` o contexto de clínica activa | **CRÍTICO** |
| `profiles.clinic_id` | Deprecar como campo; mantener transitoriamente para compatibilidad | **ALTO** |
| Trigger `002_auth_trigger` | Dejar de escribir `clinic_id` escalar; gestionar vinculaciones via `profile_clinics` | **ALTO** |
| Índice `idx_profiles_clinic_id` | Reemplazar por índice en `profile_clinics(user_id, clinic_id)` | Medio |
| `appointments` (gap) | Documentar schema real antes de cualquier migración | Medio |
