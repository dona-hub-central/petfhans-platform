---
name: spec-driven-development
description: Creates specs before coding. Use in Petfhans when starting any new page, feature, or significant change where no specification exists. Use before building /vet/profile, /vet/settings, /vet/billing, /owner/profile, or any new API route. Use when requirements are unclear, ambiguous, or only exist as a vague idea. Use before making any architectural decision that touches multiple files. Do NOT use for single-line fixes or typo corrections.
---

# Spec-Driven Development — Petfhans

Escribe una especificación estructurada antes de escribir cualquier código. El spec es la fuente compartida de verdad entre el agente y el ingeniero — define qué estamos construyendo, por qué, y cómo sabremos que está listo. Código sin spec es adivinar.

---

## El flujo con gates

```
ESPECIFICAR ──→ PLANIFICAR ──→ TAREAS ──→ IMPLEMENTAR
     │               │            │            │
     ▼               ▼            ▼            ▼
  Usuario          Usuario      Usuario      Usuario
  revisa           revisa       revisa       revisa
```

**No avanzar a la siguiente fase hasta que el usuario apruebe la actual.**

---

## Fase 1: Especificar

### Paso 0: Surfacear suposiciones

Antes de escribir el spec, listar explícitamente qué se está asumiendo:

```
SUPOSICIONES QUE ESTOY HACIENDO:
1. La página /vet/billing usa el mismo VetLayout que el resto del panel
2. Los datos de suscripción vienen de la tabla clinics (campo subscription_plan)
3. El link al portal de Stripe usa NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_URL
4. La página es solo lectura — el vet no puede cambiar el plan directamente
→ Corrígeme ahora o procederé con estas suposiciones.
```

### Paso 1: Escribir el spec

Cubre estas seis áreas:

**1. Objetivo** — ¿Qué estamos construyendo y por qué? ¿Quién es el usuario? ¿Cómo se ve el éxito?

**2. Comandos de verificación**
```bash
npm run dev          # desarrollo
npx tsc --noEmit     # verificación TypeScript
npm run build        # build de producción
npm test             # tests (si existen)
```

**3. Archivos afectados** — Qué archivos nuevos se crean, cuáles se modifican

**4. Patrones de código a seguir** — Referencia al archivo de referencia más cercano
```
Patrón de página nueva: src/app/vet/dashboard/page.tsx
Patrón de layout: src/app/vet/layout.tsx
Tokens de diseño: src/app/globals.css
Skill de diseño: skills-ai/frontend-design-quality/SKILL.md
```

**5. Criterios de éxito** — Condiciones específicas y testeables
```
Se considera DONE cuando:
- La página /vet/billing carga sin errores de TypeScript
- Muestra el plan actual (trial/basic/pro) desde la BD
- Muestra X/Y pacientes con barra de progreso
- Si uso ≥ 80%: banner amber visible
- Si uso = 100%: botón "Nueva mascota" deshabilitado
- Link a portal de Stripe presente y funcional
- npx tsc --noEmit pasa sin errores
```

**6. Boundaries**
```
Siempre:
- Leer clinic_id del perfil del servidor, nunca del body
- Usar var(--pf-*) para todos los colores
- npx tsc --noEmit después de cada tarea

Preguntar primero:
- Cambios al schema de Supabase
- Agregar dependencias nuevas
- Cambiar la estructura de una tabla existente

Nunca:
- Hardcodear colores hex
- Agregar createAdminClient() en Client Components
- Commitear sin que TypeScript pase
```

### Plantilla de spec

```markdown
# Spec: [Nombre de la página o feature]

## Objetivo
[Qué estamos construyendo, quién lo usa, qué problema resuelve]

## Stack y archivos
[Archivos nuevos a crear, archivos a modificar, dependencias]

## Comandos de verificación
[build, tsc, test]

## Patrón de referencia
[Archivo existente más similar a seguir]

## Criterios de éxito
- [ ] [Condición 1 específica y testeable]
- [ ] [Condición 2]
- [ ] [TypeScript pasa]

## Suposiciones confirmadas
[Lista de suposiciones aprobadas por el usuario]

## Preguntas abiertas
[Cualquier punto no resuelto que necesita input]
```

---

## Fase 2: Planificar

Con el spec validado, generar un plan técnico:

1. Componentes principales y sus dependencias
2. Orden de implementación (qué se construye primero)
3. Riesgos y mitigaciones
4. Qué puede construirse en paralelo vs secuencial
5. Checkpoints de verificación entre fases

---

## Fase 3: Tareas

Desglose en tareas discretas:

```markdown
- [ ] Tarea: [Descripción]
  - Aceptación: [Qué debe ser true al terminar]
  - Verificar: [npx tsc --noEmit / npm run build / manual]
  - Archivos: [Qué archivos se tocan]
```

Cada tarea:
- Completable en una sesión enfocada
- Criterios de aceptación explícitos
- No toca más de ~5 archivos
- Deja el sistema compilable al terminar

---

## Fase 4: Implementar

Ejecutar tareas una a la vez usando `incremental-implementation` y `test-driven-development`. Ver:
- `skills-ai/incremental-implementation/SKILL.md`
- `skills-ai/coding-best-practices/SKILL.md`
- `skills-ai/frontend-design-quality/SKILL.md`

---

## Ejemplos de specs para Petfhans

### /vet/profile (pendiente)
```
Objetivo: Página de perfil del veterinario — ver y editar nombre, teléfono, cambiar contraseña
Patrón: src/app/vet/billing/page.tsx (si existe) o src/app/vet/dashboard/page.tsx
Archivos nuevos: src/app/vet/profile/page.tsx
Criterios:
- Muestra full_name y phone del perfil
- Permite editar nombre y teléfono (Supabase update)
- Permite cambiar contraseña (supabase.auth.updateUser)
- Email es solo lectura
- Usa VetLayout (heredado de src/app/vet/layout.tsx)
- TypeScript pasa
```

### /vet/settings (pendiente)
```
Objetivo: Configuración de la clínica — nombre, logo, datos de contacto
Patrón: src/app/vet/profile/page.tsx (cuando exista)
Archivos nuevos: src/app/vet/settings/page.tsx
Criterios:
- Solo vet_admin puede acceder (redirigir si es veterinarian)
- Permite editar clinic.name, clinic.phone, clinic.address
- Upload de logo via src/app/api/pets/upload-photo pattern
- TypeScript pasa
```

---

## Racionalizaciones comunes

| Racionalización | Realidad |
|---|---|
| "Esto es simple, no necesito spec" | Las tareas simples tampoco necesitan specs largos — 2 líneas con criterios de éxito alcanzan. |
| "Escribiré el spec después de codear" | Eso es documentación, no especificación. El valor está en clarificar *antes*. |
| "Los requisitos van a cambiar igual" | Por eso el spec es un documento vivo. Un spec desactualizado es mejor que ningún spec. |

## Verificación

Antes de proceder a implementar:

- [ ] El spec cubre las seis áreas
- [ ] El usuario revisó y aprobó el spec
- [ ] Los criterios de éxito son específicos y testeables
- [ ] Los boundaries están definidos
- [ ] El spec está guardado en un archivo del repositorio o en el prompt de la sesión
