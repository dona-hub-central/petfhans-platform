# Prompt para Claude Code — Análisis de Riesgo: Marketplace Multi-Clínica

## Instrucciones generales

Eres un arquitecto de software senior haciendo un análisis de riesgo.
Tu única tarea en esta sesión es **leer, analizar y reportar**.

**No escribas código. No modifiques ningún archivo. No hagas commits.**

El output de esta sesión es un documento de riesgo que un humano
revisará antes de que se toque cualquier línea de producción.

---

## Skills obligatorias — léelas antes de empezar

```
skills-ai/security-invitation-flow/SKILL.md
skills-ai/incremental-implementation/SKILL.md
skills-ai/api-and-interface-design/SKILL.md
skills-ai/code-review-and-quality/SKILL.md
```

---

## Contexto del análisis

Lee estos dos archivos primero para entender qué se va a construir
y por qué este análisis es necesario:

```
prompts/marketplace-multiclínica.md   ← especificación confirmada del feature
PRODUCT.md                            ← roles, rutas existentes, modelo de negocio
```

El feature introduce dos capas de cambio:

- **Capa 1 — Modelo de datos:** `profiles.clinic_id` (campo escalar) se
  convierte en `profile_clinics` (tabla de relación many-to-many). Esto
  afecta middleware, RLS, JWT y todas las API routes del sistema.

- **Capa 2 — Marketplace:** módulo nuevo en `/marketplace/**` con tablas
  nuevas (`care_requests`, `clinic_blocks`, `clinic_join_requests`).
  Relativamente aislado, pero depende de que la Capa 1 esté resuelta.

Tu análisis debe dejar claro dónde está el riesgo real y en qué orden
deben abordarse los cambios para no crear deuda técnica.

---

## Fase 1 — Mapeo del estado actual

### 1.1 Lee el schema de base de datos

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_clinic_settings.sql
supabase/migrations/003_appointments.sql
supabase/migrations/004_ai_agent.sql
supabase/migrations/005_records_update.sql
supabase/migrations/006_appointment_ratings.sql
supabase/migrations/007_appointments_vet.sql
supabase/migrations/008_pet_access.sql
supabase/migrations/009_fix_invitations_rls.sql
supabase/migrations/010_fix_ratings_rls.sql
```

De cada migración extrae:
- Tablas que tienen columna `clinic_id`
- Políticas RLS que referencian `clinic_id`
- Foreign keys que dependen de `profiles.clinic_id`
- Cualquier índice sobre `clinic_id`

### 1.2 Lee el middleware

```
src/middleware.ts
```

Identifica:
- Cómo se extrae `clinic_id` actualmente (¿del JWT? ¿de la BD? ¿del subdominio?)
- Qué rutas están protegidas y cómo
- Dónde se escribe `clinic_id` en el contexto de la request
- Qué pasaría si `clinic_id` fuera un array en lugar de un escalar

### 1.3 Lee los clientes de Supabase

```
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/lib/supabase/admin.ts
src/lib/invitation-permissions.ts
```

### 1.4 Mapea todas las API routes que usan clinic_id

Ejecuta este comando y anota cada archivo que aparece:

```bash
grep -rn "clinic_id" src/app/api/ --include="*.ts" -l
```

Luego lee cada archivo encontrado e identifica:
- En qué línea se obtiene `clinic_id` (¿de `profile`? ¿del body? ¿del JWT?)
- Si usa `.eq('clinic_id', ...)` para filtrar queries
- Si hay alguna ruta que NO filtra por `clinic_id` cuando debería

### 1.5 Mapea los layouts y componentes de navegación

```
src/app/vet/layout.tsx          (si existe)
src/components/shared/VetLayout.tsx
src/components/admin/AdminLayout.tsx
```

Identifica cómo fluye `clinic_id` desde el layout hasta los componentes hijos.

### 1.6 Lee los dashboards por rol

```
src/app/vet/dashboard/page.tsx
src/app/owner/dashboard/page.tsx
src/app/admin/page.tsx
```

Identifica qué datos obtienen y cómo están scopeados a `clinic_id`.

### 1.7 Lee el flujo de invitaciones actual

```
src/app/api/auth/accept-invite/route.ts
src/app/api/vet/create-invitation/route.ts
```

Identifica exactamente dónde se asigna `clinic_id` al crear un usuario
y qué cambiaría si un usuario puede pertenecer a múltiples clínicas.

---

## Fase 2 — Análisis de riesgo

Con todo lo anterior leído, genera el siguiente documento de riesgo.
Sé específico: nombra archivos, líneas y consecuencias exactas.

---

### SECCIÓN A — Inventario de dependencias de clinic_id

Tabla con todas las ocurrencias encontradas:

```
| Archivo | Línea aprox. | Cómo se usa clinic_id | Riesgo si pasa a many-to-many |
|---------|-------------|----------------------|-------------------------------|
| ...     | ...         | ...                  | ...                           |
```

---

### SECCIÓN B — Clasificación de riesgos

Para cada cambio identificado, clasifícalo según este criterio:

**RIESGO CRÍTICO** — Rompe la aplicación en producción si se hace mal:
- Cambios en el schema que afectan tablas con datos reales
- Cambios en middleware que afectan autenticación de todos los usuarios
- Cambios en RLS que pueden exponer datos entre clínicas

**RIESGO ALTO** — Introduce bugs silenciosos difíciles de detectar:
- API routes que dejan de filtrar correctamente por clínica
- Scoping incorrecto que devuelve datos de más o de menos
- Flujos de invitación que crean usuarios en estados inconsistentes

**RIESGO MEDIO** — Rompe funcionalidad específica pero no el sistema:
- Componentes de UI que asumen un solo clinic_id
- Queries que no paginan correctamente con múltiples clínicas
- Breadcrumbs o selectores que no reflejan el contexto correcto

**RIESGO BAJO** — Fácil de detectar y corregir:
- Textos hardcodeados que asumen una sola clínica
- Logs o mensajes de error que muestran un solo clinic_id

---

### SECCIÓN C — Los 5 cambios más peligrosos

Para cada uno:

```
## [RIESGO X] Título del cambio

**Archivo(s):** ruta exacta
**Por qué es peligroso:**
  Explicación técnica de qué puede romperse y cómo.
  Si es un dato de producción en riesgo, decirlo explícitamente.

**Consecuencia si se hace mal:**
  Qué ve el usuario / qué dato se expone / qué deja de funcionar.

**Cómo manejarlo sin romper nada:**
  Estrategia de migración específica para este cambio.
  Incluir si necesita: feature flag / migración en dos fases /
  backfill de datos / doble escritura temporal / test específico.

**Condición para considerarlo seguro:**
  Qué debe ser verdad antes de hacer este cambio en producción.
```

---

### SECCIÓN D — Orden de implementación recomendado

Basado en las dependencias reales del código, propón el orden en que
deben hacerse los cambios. Responde estas preguntas:

1. ¿Qué cambio de Capa 1 (modelo de datos) debe hacerse primero
   para que todos los demás sean más seguros?

2. ¿Qué puede construirse de Capa 2 (marketplace) sin tocar
   nada de Capa 1? ¿Qué partes del marketplace son verdaderamente
   independientes del cambio de modelo?

3. ¿Hay algún cambio que deba hacerse en dos fases separadas
   (primero migración sin activar, luego activar)?

4. ¿Cuál es el cambio que más riesgo concentra y que por tanto
   debe tener el test más exhaustivo antes de ir a producción?

---

### SECCIÓN E — Tests mínimos necesarios antes de cada cambio crítico

Para cada cambio crítico identificado en la Sección C, define qué
comportamiento debe estar cubierto por un test antes de hacerlo.
Petfhans actualmente tiene cero tests — estos son los primeros que
deben escribirse.

Formato:

```
## Tests para [cambio crítico]

- it('un usuario con múltiples clínicas solo ve datos de la clínica activa')
- it('al cambiar clinic_id activo en el sidebar, las queries cambian')
- it('un pet_owner no ve mascotas de clínicas donde no está vinculado')
- it('accept-invite vincula usuario existente en lugar de crear uno nuevo')
- [añadir los que correspondan según el análisis]
```

---

### SECCIÓN F — Lo que NO debe tocarse hasta tener Capa 1 resuelta

Lista de archivos o rutas que Claude Code no debe modificar como parte
del módulo de marketplace hasta que el cambio de modelo esté en producción
y verificado. Justifica cada uno.

---

## Fase 3 — Output final

Al terminar el análisis, crea el archivo:

```
prompts/marketplace-coste-tecnico.md
```

Con el documento completo de las Secciones A–F.

Termina el documento con esta sección:

```markdown
## Condiciones para empezar a implementar

Antes de escribir una sola línea de código del marketplace, deben
cumplirse estas condiciones:

- [ ] [condición 1 basada en el análisis]
- [ ] [condición 2]
- [ ] [...]

Estas condiciones no son arbitrarias — son las que emergen del análisis
del código real del repositorio.
```

---

## Restricciones absolutas de esta sesión

- ❌ No crear ni modificar ningún archivo de `src/`
- ❌ No crear ni modificar migraciones de Supabase
- ❌ No instalar dependencias
- ❌ No hacer commits de código
- ✅ Solo leer archivos existentes
- ✅ Solo crear `prompts/marketplace-coste-tecnico.md`
- ✅ Solo ejecutar comandos de búsqueda (`grep`, `find`, `wc`)
- ✅ `npx tsc --noEmit` al final para verificar el estado actual del repo

---

## Verificación final

Antes de escribir el documento, ejecuta:

```bash
# Cuántos archivos en src/ referencian clinic_id
grep -rn "clinic_id" src/ --include="*.ts" --include="*.tsx" -l | wc -l

# Cuántas veces aparece en API routes
grep -rn "clinic_id" src/app/api/ --include="*.ts" | wc -l

# Cuántas veces aparece en componentes de UI
grep -rn "clinic_id" src/components/ --include="*.tsx" | wc -l

# Estado actual de TypeScript
npx tsc --noEmit 2>&1 | tail -5
```

Incluye estos números en la introducción del documento de riesgo
para dar contexto de la magnitud real del cambio.
