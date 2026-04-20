# Prompt para Claude Code — Plan de mejora de navegación UI

## Contexto del producto

Antes de ejecutar cualquier cambio, lee los siguientes archivos del repositorio para entender el producto completamente:

```
PRODUCT.md                              ← visión, flujos, rutas y modelo de negocio
src/components/admin/AdminLayout.tsx    ← navegación actual del superadmin
src/components/shared/VetLayout.tsx     ← navegación actual del panel vet
src/components/owner/OwnerPetView.tsx   ← experiencia actual del dueño
src/app/admin/page.tsx                  ← dashboard del superadmin
src/app/vet/dashboard/page.tsx          ← dashboard del veterinario
src/app/owner/dashboard/page.tsx        ← dashboard del dueño
src/app/globals.css                     ← variables de color y utilidades
```

---

## Tu misión

Eres un ingeniero frontend senior. Tu objetivo es mejorar la **navegación e intuitividad** de Petfhans sin rediseñar la UI. No cambies colores, tipografías ni el sistema de diseño existente. Solo mejora la estructura de navegación, añade las rutas que faltan y asegúrate de que cada usuario siempre sepa dónde está y a dónde puede ir.

---

## Tareas a ejecutar

### TAREA 1 — Crear página de perfil de usuario para veterinarios

Crea `src/app/vet/profile/page.tsx`

Debe permitir:
- Ver y editar nombre completo y teléfono
- Ver email (solo lectura — no editable)
- Cambiar contraseña (campo actual + nueva + confirmar)
- Guardar cambios via Supabase (`profiles` table + `supabase.auth.updateUser`)
- Usar `VetLayout` como wrapper

### TAREA 2 — Crear página de perfil para superadmin

Crea `src/app/admin/profile/page.tsx`

Mismos campos que el perfil vet. Usar `AdminLayout` como wrapper.

### TAREA 3 — Crear página de perfil para dueños

Crea `src/app/owner/profile/page.tsx`

Campos: nombre completo, teléfono. Email solo lectura. Cambio de contraseña.
Usar el mismo estilo mobile-first que `OwnerPetView`.
Añadir enlace a esta página desde `/owner/dashboard` (botón en el avatar o header).

### TAREA 4 — Crear página de facturación para veterinarias

Crea `src/app/vet/billing/page.tsx`

Mostrar:
- Plan actual de la clínica (`subscription_plan`, `subscription_status`)
- Uso de pacientes: `petCount` (query a `pets` donde `clinic_id` y `is_active=true`) vs `max_patients`
- Barra de progreso visual del uso (usa las clases existentes de Tailwind)
- Si el uso supera el 80%: mostrar alerta en color amber
- Si el uso es 100%: mostrar bloqueo en rojo con CTA para contactar a Petfhans
- Enlace al portal de Stripe (usar `process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_URL` si existe, sino mostrar email de soporte)
- Usar `VetLayout` como wrapper

### TAREA 5 — Actualizar VetLayout para incluir rutas nuevas y límites

Edita `src/components/shared/VetLayout.tsx`:

1. Añadir al array `nav`:
   - `{ href: '/vet/billing', icon: '💳', label: 'Suscripción' }`
   - `{ href: '/vet/profile', icon: '👤', label: 'Mi perfil' }` — al final, junto al nombre del usuario

2. El enlace a `/vet/ai` solo debe aparecer si el perfil del usuario tiene permiso. Obtén el perfil del usuario con `createClient()` en el layout (es un Server Component) y verifica si `user_plan.permissions.ai !== false`. Si no tienes acceso al `user_plan` fácilmente, muéstralo siempre por ahora pero añade un `TODO` en el código.

3. En la sección inferior del sidebar (donde está el nombre del usuario), añadir un enlace clickeable al perfil `/vet/profile`.

4. Mostrar debajo del nombre de la clínica un indicador de uso de pacientes en formato pequeño: `X/Y pacientes`. Obtén los datos con `createAdminClient()`. Si el porcentaje supera el 80%, mostrar en color amber. Si es 100%, en rojo.

### TAREA 6 — Actualizar AdminLayout para incluir perfil

Edita `src/components/admin/AdminLayout.tsx`:

1. Añadir al array `nav`:
   - `{ href: '/admin/profile', icon: '👤', label: 'Mi perfil', exact: true }`

2. El nombre del usuario en la sección inferior debe ser un enlace a `/admin/profile`.

### TAREA 7 — Añadir guard de límite de pacientes en /vet/pets

Edita `src/app/vet/pets/page.tsx`:

1. Obtén `petCount` y `max_patients` de la clínica del usuario.
2. Si `petCount >= max_patients`:
   - El botón "+ Nueva mascota" debe aparecer deshabilitado con tooltip: "Has alcanzado el límite de tu plan"
   - Mostrar un banner en la parte superior: "Has alcanzado el límite de X pacientes de tu plan. [Actualiza tu suscripción →](/vet/billing)"
3. Si `petCount >= max_patients * 0.8` (80%):
   - Mostrar banner de advertencia en amber: "Te acercas al límite de pacientes de tu plan (X/Y). [Ver suscripción →](/vet/billing)"

### TAREA 8 — Añadir acceso al perfil en el dashboard del dueño

Edita `src/app/owner/dashboard/page.tsx`:

1. En el header del dashboard (donde está el avatar y el botón de logout), añadir un enlace al perfil del dueño: `/owner/profile`.
2. El avatar del usuario (initial del nombre) debe ser un enlace clickeable a `/owner/profile`.

### TAREA 9 — Breadcrumbs en rutas de detalle

Para mejorar la orientación del usuario, añadir breadcrumbs simples en:

- `src/app/vet/pets/[id]/page.tsx`: `Mascotas › {pet.name}`
- `src/app/vet/records/[id]/page.tsx`: `Mascotas › {pet.name} › Consulta {fecha}`
- `src/app/vet/records/new/page.tsx`: `Consultas › Nueva consulta`
- `src/app/admin/clinics/[id]/page.tsx`: `Clínicas › {clinic.name}`

Usar el patrón ya existente en el código: `<Link href="..." className="text-xs" style={{ color: 'var(--muted)' }}>← Volver</Link>` pero mejorado con la cadena completa.

---

## Restricciones estrictas

- **No cambies colores, fuentes ni border-radius** — usa siempre las CSS variables existentes (`var(--accent)`, `var(--bg)`, `var(--border)`, `var(--muted)`, `var(--text)`)
- **No instales nuevas dependencias** — usa solo lo que ya está en `package.json`
- **No modifiques el schema de Supabase** — solo lee datos, no añadas columnas
- **Usa siempre `VetLayout` o `AdminLayout`** como wrapper en páginas nuevas de vet y admin
- **No uses `any`** — el ESLint está configurado para permitirlo como warning pero evítalo en código nuevo
- **Sigue el patrón existente** para Server Components: obtén datos con `createClient()` o `createAdminClient()` directamente en el `page.tsx`, pasa los datos como props a componentes Client cuando sea necesario

---

## Commit final

Una vez completadas todas las tareas, haz commit con:

```
git add \
  src/app/vet/profile/page.tsx \
  src/app/vet/billing/page.tsx \
  src/app/admin/profile/page.tsx \
  src/app/owner/profile/page.tsx \
  src/components/shared/VetLayout.tsx \
  src/components/admin/AdminLayout.tsx \
  src/app/vet/pets/page.tsx \
  src/app/owner/dashboard/page.tsx \
  src/app/vet/pets/[id]/page.tsx \
  src/app/vet/records/[id]/page.tsx \
  src/app/vet/records/new/page.tsx \
  src/app/admin/clinics/[id]/page.tsx

git commit -m "feat: add profile pages, billing page, usage limits and navigation improvements"
git push origin main
```
