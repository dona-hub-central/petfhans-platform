# Fase B.2 — Middleware: cookie `active_clinic_id` → header `x-active-clinic-id`
## Sesión independiente de Claude Code

**Objetivo:** Modificar `src/middleware.ts` para leer la cookie `active_clinic_id`
e inyectarla como header `x-active-clinic-id` en cada request. Las API routes de
B.3 y B.4 leerán este header. La validación de subdominio existente se mantiene
intacta — no se elimina en esta sesión.

**Rama:** Develop  
**Riesgo:** MEDIO — el middleware afecta cada request de la aplicación  
**Prerequisito:** B.1 completada (015, 016, 017 aplicadas y verificadas)

---

## Antes de empezar

### 1. Lee estos documentos
```
prompts/marketplace-coste-tecnico.md   ← secciones B.2 y "No tocar"
skills-ai/security-and-hardening/SKILL.md
skills-ai/coding-best-practices/SKILL.md
```

### 2. Lee el archivo que vas a editar
```bash
cat src/middleware.ts
```
Identifica:
- La línea con el early return `|| subdomain === ''` (línea ~54)
- El bloque que construye `requestHeaders` (líneas ~23–27)
- Dónde se crea `supabaseResponse` por primera vez

### 3. Verifica que B.1 está completa
```bash
# Debe devolver 3 archivos
ls supabase/migrations/015_profile_clinics.sql \
   supabase/migrations/016_rls_rewrite.sql \
   supabase/migrations/017_migrate_data.sql
```

---

## Tarea — editar `src/middleware.ts`

### Cambio único: inyectar cookie como header ANTES de cualquier early return

Lee el archivo. Localiza el bloque donde se construyen `requestHeaders` y se crea
`supabaseResponse`. **Inmediatamente después de las líneas que hacen `set('x-subdomain')`
y `set('x-hostname')`**, añade:

```typescript
// Propagar cookie active_clinic_id como header para que las API routes lo lean
const activeClinicId = request.cookies.get('active_clinic_id')?.value
if (activeClinicId) {
  requestHeaders.set('x-active-clinic-id', activeClinicId)
}
```

Ese es el único cambio. No mover, no eliminar nada más. La cookie se propaga como
header para cualquier request — incluyendo los que devuelven el early return.

### Verificación del cambio

El middleware modificado debe quedar así (el bloque de headers, con el añadido):
```typescript
const requestHeaders = new Headers(request.headers)
requestHeaders.set('x-subdomain', subdomain)
requestHeaders.set('x-hostname', hostname)

// Propagar cookie active_clinic_id como header para que las API routes lo lean
const activeClinicId = request.cookies.get('active_clinic_id')?.value
if (activeClinicId) {
  requestHeaders.set('x-active-clinic-id', activeClinicId)
}
```

**No tocar nada más del archivo.**

---

## TypeScript y lint

```bash
npx tsc --noEmit
# Debe pasar sin errores — el cambio es trivial (string | undefined → condicional)
```

---

## Prueba manual (sin staging)

1. Abre DevTools → Application → Cookies en `petfhans.com`
2. Crea manualmente una cookie: `active_clinic_id = <cualquier-uuid>`
3. Navega a `/vet/dashboard`
4. En Network → request a cualquier API route → Headers → verifica que `x-active-clinic-id` aparece
5. Elimina la cookie → navega de nuevo → `x-active-clinic-id` no debe aparecer en headers

---

## Commit

```bash
git add src/middleware.ts
git commit -m "feat(B2): propagar cookie active_clinic_id como header x-active-clinic-id"
git push origin Develop
```

---

## Checklist de cierre de B.2

- [ ] `npx tsc --noEmit` pasa
- [ ] El header `x-active-clinic-id` aparece en requests cuando la cookie está presente
- [ ] El header NO aparece cuando la cookie está ausente
- [ ] El resto del middleware funciona igual (login, rutas públicas, subdominio)
- [ ] Un solo commit

---

## Restricciones

- ❌ No tocar la lógica de subdominio — se elimina en B.6
- ❌ No añadir queries a Supabase en el middleware — la validación del valor de la
  cookie ocurre en las API routes (B.3/B.4), no aquí
- ❌ No añadir redirect a `/vet/select-clinic` — eso lo gestiona `vet/layout.tsx` (B.5)
- ✅ Solo añadir las 3 líneas del bloque de cookie en el lugar correcto
- ✅ `npx tsc --noEmit` debe pasar

**STOP — no implementar B.3 hasta confirmar la prueba manual del header.**
