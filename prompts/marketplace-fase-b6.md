# Fase B.6 — Deprecación final: nullificar clinic_id, eliminar subdominio, 301s
## Sesión independiente de Claude Code

**Objetivo:** Completar la transición multi-clínica eliminando la capa de compatibilidad:
nullificar `profiles.clinic_id`, dejar de escribirlo en el trigger de auth, eliminar
la validación de subdominio del middleware, y configurar redirects 301.

**Rama:** Develop  
**Riesgo:** ALTO — cambios destructivos e irreversibles  
**Prerequisito:** B.1 → B.5 completadas Y **≥48h en producción sin incidencias**

---

## ⛔ GATE DE ENTRADA — NO ejecutar sin verificar esto primero

```sql
-- 1. Cero políticas referencian get_user_clinic_id()
SELECT COUNT(*) AS debe_ser_cero FROM pg_policies
WHERE qual LIKE '%get_user_clinic_id%';

-- 2. Cero políticas referencian profiles.clinic_id como scope
SELECT COUNT(*) AS debe_ser_cero FROM pg_policies
WHERE qual LIKE '%profiles.clinic_id%';

-- 3. profile_clinics tiene datos coherentes
SELECT COUNT(*) FROM profile_clinics;
SELECT COUNT(*) FROM profiles WHERE clinic_id IS NOT NULL;
-- Deben ser iguales

-- 4. Cero usuarios activos en las últimas 48h con errores de acceso
-- (revisar manualmente los logs de Supabase Dashboard → Logs → API)
```

```bash
# 5. Cero referencias a profile?.clinic_id como scope en src/
grep -rn "profile\.clinic_id\|profile?\.clinic_id" src/app/api/ src/app/vet/ src/components/
# Resultado esperado: sin output
```

Si cualquier verificación falla → **no continuar**. Investigar y resolver primero.

---

## Antes de empezar

### 1. Lee estos documentos
```
prompts/marketplace-coste-tecnico.md   ← sección B.5 y "No tocar"
skills-ai/coding-best-practices/SKILL.md
```

### 2. Toma snapshot de Supabase antes de cada paso
Settings → Backups → Create backup. No saltar este paso.

---

## Paso B.6.1 — Dejar de escribir `clinic_id` en el trigger de auth

### Crea `supabase/migrations/018_auth_trigger_multiclínica.sql`

```sql
-- 018_auth_trigger_multiclínica.sql
-- Actualiza handle_new_user() para que al crear un usuario también inserte
-- en profile_clinics. Deja de depender de profiles.clinic_id como única fuente.
-- profiles.clinic_id se mantiene por compatibilidad — se nullifica en B.6.3.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_clinic_id UUID;
  v_role TEXT;
BEGIN
  v_role := NEW.raw_user_meta_data->>'role';
  v_clinic_id := (NEW.raw_user_meta_data->>'clinic_id')::UUID;

  IF v_role IS NOT NULL THEN
    INSERT INTO profiles (user_id, role, full_name, email, clinic_id)
    VALUES (
      NEW.id,
      v_role,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.email,
      v_clinic_id
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- También insertar en profile_clinics si hay clinic_id
    IF v_clinic_id IS NOT NULL AND v_role IN ('vet_admin', 'veterinarian', 'pet_owner') THEN
      INSERT INTO profile_clinics (user_id, clinic_id, role)
      VALUES (NEW.id, v_clinic_id, v_role)
      ON CONFLICT (user_id, clinic_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Ejecuta en Supabase Dashboard → SQL Editor.

```bash
git add supabase/migrations/018_auth_trigger_multiclínica.sql
git commit -m "feat(B6): auth trigger también escribe en profile_clinics"
git push origin Develop
```

---

## Paso B.6.2 — Eliminar validación de subdominio del middleware

Lee `src/middleware.ts`. Localiza el bloque de validación de subdominio
(aproximadamente líneas 68–89):

```typescript
if (user) {
  // ...
  if (subdomain === 'admin' && role !== 'superadmin') { ... }
  if (subdomain !== 'admin' && role !== 'superadmin') {
    if (clinicSlug && clinicSlug !== subdomain) { ... }
  }
}
```

Elimina ese bloque completo. También elimina la query de `profiles` que obtiene
`clinicSlug` para la validación, si ya no se usa en ningún otro lugar del middleware.

Mantén:
- La propagación del `active_clinic_id` cookie → header (añadida en B.2)
- El redirect a login cuando `!user`
- El bloque de `publicPaths`

```bash
npx tsc --noEmit
git add src/middleware.ts
git commit -m "feat(B6): eliminar validación de subdominio del middleware"
git push origin Develop
```

---

## Paso B.6.3 — Nullificar `profiles.clinic_id`

### Verifica antes de ejecutar
```sql
-- Confirma que profile_clinics tiene todos los datos
SELECT COUNT(*) FROM profile_clinics;
SELECT COUNT(*) FROM profiles WHERE clinic_id IS NOT NULL;
-- Deben ser iguales
```

### Crea `supabase/migrations/019_nullify_profiles_clinic_id.sql`

```sql
-- 019_nullify_profiles_clinic_id.sql
-- Nullifica profiles.clinic_id — profile_clinics es ahora la única fuente de verdad.
-- Prerequisito: profile_clinics poblada (017), trigger actualizado (018),
-- cero referencias a profiles.clinic_id como scope en el código.

-- Nullificar el campo (no se elimina la columna para compatibilidad legacy)
UPDATE profiles SET clinic_id = NULL WHERE clinic_id IS NOT NULL;

-- Verificar
-- SELECT COUNT(*) FROM profiles WHERE clinic_id IS NOT NULL; -- debe ser 0
```

### Script de rollback para 019 (guárdalo)
```sql
-- ROLLBACK 019 — restaurar clinic_id desde profile_clinics
UPDATE profiles p
SET clinic_id = (
  SELECT pc.clinic_id FROM profile_clinics pc
  WHERE pc.user_id = p.user_id
  ORDER BY pc.created_at
  LIMIT 1
)
WHERE p.clinic_id IS NULL;
```

Ejecuta en Supabase Dashboard. Verifica:
```sql
SELECT COUNT(*) FROM profiles WHERE clinic_id IS NOT NULL;
-- Debe devolver 0
```

```bash
git add supabase/migrations/019_nullify_profiles_clinic_id.sql
git commit -m "feat(B6): nullificar profiles.clinic_id — profile_clinics es fuente de verdad"
git push origin Develop
```

---

## Paso B.6.4 — Dropear `get_user_clinic_id()` (cuando 0 políticas la usen)

```sql
-- Verificar antes de dropear
SELECT COUNT(*) FROM pg_policies WHERE qual LIKE '%get_user_clinic_id%';
-- Debe ser 0

-- Solo entonces:
DROP FUNCTION IF EXISTS get_user_clinic_id();
```

Crea `supabase/migrations/020_drop_scalar_clinic_fn.sql`:
```sql
-- 020_drop_scalar_clinic_fn.sql
-- Elimina la función helper get_user_clinic_id() — ninguna política la usa ya.
-- Prerequisito: 016 aplicada (RLS reescrita), 0 políticas la referencian.

DROP FUNCTION IF EXISTS get_user_clinic_id();
```

```bash
git add supabase/migrations/020_drop_scalar_clinic_fn.sql
git commit -m "feat(B6): dropear get_user_clinic_id() — no hay referencias en RLS"
git push origin Develop
```

---

## Paso B.6.5 — Redirects 301 (infraestructura / DNS)

Si hay usuarios con bookmarks a `clinica.petfhans.com/*`, configura redirects 301
en tu proveedor de DNS o en el servidor:

```
clinica.petfhans.com/* → https://petfhans.com/* (301 Permanent)
```

Este paso depende de tu infraestructura (Vercel, Cloudflare, etc.) y está fuera
del alcance del código. Documenta cuándo se hizo.

---

## Checklist de cierre de B.6

- [ ] Gate de entrada verificado (0 referencias, profile_clinics poblada, 48h sin incidencias)
- [ ] 018: trigger escribe en profile_clinics
- [ ] Subdominio eliminado del middleware
- [ ] 019: `profiles.clinic_id` nullificado — `SELECT COUNT(*)` devuelve 0
- [ ] 020: `get_user_clinic_id()` dropeada — `SELECT COUNT(*) pg_proc` no la encuentra
- [ ] Redirects 301 configurados
- [ ] `npx tsc --noEmit` pasa
- [ ] Prueba completa: login → select-clinic → dashboard → cambiar clínica → datos correctos

---

## Estado final de Fase B tras B.6

| Item | Estado |
|---|---|
| `profile_clinics` | ✅ Única fuente de verdad |
| `profiles.clinic_id` | ✅ Nullificado (columna existe por compatibilidad) |
| `get_user_clinic_id()` | ✅ Eliminada |
| Middleware | ✅ Sin validación de subdominio |
| Auth trigger | ✅ Escribe en `profile_clinics` |
| 10 API routes | ✅ Usan `x-active-clinic-id` header |
| VetLayout | ✅ ClinicSelector visible |
| `/vet/select-clinic` | ✅ Página de selección inicial |

**Fase B completada. Fase D puede implementarse.**
