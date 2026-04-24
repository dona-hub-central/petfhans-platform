# Análisis de Riesgo — Marketplace Multi-Clínica

# Guía de ejecución por etapas



**Rama:** Develop  

**Sesiones requeridas:** 5 (una por etapa)  

**Contexto base:** `prompts/marketplace-multiclínica.md`



> Cada etapa es una sesión independiente de Claude Code.

> Cada etapa produce un archivo de output que la siguiente etapa lee como input.

> No avanzar a la siguiente etapa si la verificación de la actual no pasa.



---



## Mapa de etapas y dependencias



```

ETAPA 1 → prompts/outputs/riesgo-etapa1-schema.md

   ↓

ETAPA 2 → prompts/outputs/riesgo-etapa2-auth.md

   ↓

ETAPA 3 → prompts/outputs/riesgo-etapa3-api.md

   ↓

ETAPA 4 → prompts/outputs/riesgo-etapa4-ui.md

   ↓

ETAPA 5 → prompts/marketplace-coste-tecnico.md  ← documento final

```



---

---



# ETAPA 1 — Mapeo del schema de base de datos



**Input:** migraciones de Supabase  

**Output:** `prompts/outputs/riesgo-etapa1-schema.md`  

**Duración estimada:** 10-15 minutos



## Instrucciones



Eres un arquitecto de base de datos haciendo una auditoría de dependencias.

**Solo lees. No modificas nada. No haces commits.**



Lee estos archivos en orden:



```

prompts/marketplace-multiclínica.md

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



Ejecuta estos comandos y anota los resultados:



```bash

grep -rn "clinic_id" supabase/migrations/ | wc -l

grep -rn "clinic_id" supabase/migrations/ --include="*.sql" -l

```



## Qué extraer de las migraciones



Para cada migración documenta:



1. **Tablas con columna `clinic_id`**

   - Nombre de la tabla

   - Si es `NOT NULL` o nullable

   - Si tiene índice

   - Si tiene foreign key a `clinics`



2. **Políticas RLS que referencian `clinic_id`**

   - Nombre de la política

   - Tabla afectada

   - Condición exacta (copia la línea)

   - Si la condición se rompe con multi-clínica



3. **Foreign keys que dependen de `profiles.clinic_id`**

   - Qué tablas apuntan a `profiles` usando `clinic_id` como referencia indirecta



4. **La tabla `invitations`**

   - Columnas actuales

   - Cómo se vincula a `clinic_id`

   - Qué cambiaría si un usuario puede tener múltiples clínicas



## Output a generar



Crea el archivo `prompts/outputs/riesgo-etapa1-schema.md` con este formato exacto:



```markdown

# Etapa 1 — Schema · Hallazgos



## Métricas

- Total ocurrencias de clinic_id en migraciones: [N]

- Tablas con clinic_id: [N]

- Políticas RLS que usan clinic_id: [N]



## Tablas con clinic_id

| Tabla | NOT NULL | Índice | FK a clinics |

|-------|----------|--------|--------------|

| ...   | ...      | ...    | ...          |



## Políticas RLS — condiciones exactas

| Política | Tabla | Condición | Rompe con multi-clínica |

|----------|-------|-----------|------------------------|

| ...      | ...   | ...       | Sí/No/Parcial          |



## Tabla invitations — estado actual

[descripción de columnas y relación con clinic_id]



## Tabla profiles — estado actual

[descripción de clinic_id: tipo, constraint, uso]



## Hallazgos críticos

[Lista de lo que claramente se rompe si profiles.clinic_id

pasa a ser una relación many-to-many]



## Hallazgos ambiguos

[Lista de lo que podría romperse pero requiere más contexto]

```



## Verificación antes de cerrar la sesión



```bash

cat prompts/outputs/riesgo-etapa1-schema.md | wc -l

# Debe ser > 30 líneas

```



**La Etapa 2 solo puede ejecutarse si este archivo existe y tiene las secciones completas.**



---

---



# ETAPA 2 — Mapeo de autenticación y flujo de clinic_id



**Input:** `prompts/outputs/riesgo-etapa1-schema.md` + archivos de auth  

**Output:** `prompts/outputs/riesgo-etapa2-auth.md`  

**Duración estimada:** 10-15 minutos



## Instrucciones



Eres un ingeniero de seguridad auditando el flujo de autenticación.

**Solo lees. No modificas nada. No haces commits.**



Lee primero el output de la etapa anterior:



```

prompts/outputs/riesgo-etapa1-schema.md

```



Luego lee estos archivos:



```

src/middleware.ts

src/lib/supabase/client.ts

src/lib/supabase/server.ts

src/lib/supabase/admin.ts

src/lib/invitation-permissions.ts

src/app/api/auth/accept-invite/route.ts

src/app/api/vet/create-invitation/route.ts

```



Ejecuta:



```bash

grep -n "clinic_id" src/middleware.ts

grep -n "clinic_id" src/lib/supabase/server.ts

grep -n "user_metadata" src/middleware.ts

grep -n "user_metadata" src/app/api/auth/accept-invite/route.ts

```



## Qué analizar



1. **Middleware — cómo viaja `clinic_id` hoy**

   - ¿Se lee del JWT (`user_metadata`)? ¿De la BD? ¿Del subdominio?

   - ¿En qué línea exacta se extrae?

   - ¿Qué pasa si `clinic_id` fuera un array en lugar de string?



2. **JWT y `user_metadata`**

   - ¿Qué campos se guardan en `user_metadata` al crear un usuario?

   - ¿`clinic_id` está en el JWT? ¿Dónde se lee en el middleware?

   - Si un usuario pertenece a múltiples clínicas, ¿el JWT puede reflejar eso?



3. **`accept-invite` — creación de usuarios**

   - ¿Dónde se asigna `clinic_id` al perfil?

   - ¿Qué cambiaría para vincular un usuario existente en lugar de crear uno nuevo?



4. **`create-invitation` — flujo de invitación**

   - ¿Cómo se obtiene `clinic_id` para la invitación?

   - ¿Hay validación de que el invitador pertenece a esa clínica?



5. **`createAdminClient` — scoping actual**

   - ¿Hay algún lugar donde el admin client NO tiene scope de clínica?



## Output a generar



Crea `prompts/outputs/riesgo-etapa2-auth.md`:



```markdown

# Etapa 2 — Auth · Hallazgos



## Cómo fluye clinic_id hoy (paso a paso)

[Descripción del flujo: login → JWT → middleware → request]



## clinic_id en el JWT

- ¿Está en user_metadata?: Sí/No

- Línea exacta donde se lee: [archivo:línea]

- ¿Es escalar o podría ser array?: [análisis]



## Punto de asignación en accept-invite

- Archivo: [ruta]

- Línea: [N]

- Qué se escribe: [descripción]

- Impacto de cambiar a multi-clínica: [análisis]



## Cambios necesarios en el middleware para multi-clínica

[Lista específica de qué debe cambiar y por qué]



## Riesgos de seguridad identificados

[Puntos donde el cambio podría exponer datos entre clínicas]



## Dependencias con Etapa 1

[Qué hallazgos de schema impactan directamente el flujo de auth]

```



## Verificación antes de cerrar la sesión



```bash

cat prompts/outputs/riesgo-etapa2-auth.md | wc -l

# Debe ser > 30 líneas

grep "clinic_id en el JWT" prompts/outputs/riesgo-etapa2-auth.md

# Debe encontrar la sección

```



**La Etapa 3 solo puede ejecutarse si este archivo existe y tiene las secciones completas.**



---

---



# ETAPA 3 — Mapeo de API routes



**Input:** outputs etapas 1-2 + API routes  

**Output:** `prompts/outputs/riesgo-etapa3-api.md`  

**Duración estimada:** 15-20 minutos



## Instrucciones



Eres un ingeniero de backend auditando endpoints.

**Solo lees. No modificas nada. No haces commits.**



Lee los outputs anteriores:



```

prompts/outputs/riesgo-etapa1-schema.md

prompts/outputs/riesgo-etapa2-auth.md

```



Ejecuta estos comandos y anota los resultados:



```bash

find src/app/api -name "route.ts" | wc -l

grep -rn "clinic_id" src/app/api/ --include="*.ts" -l

grep -rn "clinic_id" src/app/api/ --include="*.ts" | wc -l

grep -rn "createAdminClient" src/app/api/ --include="*.ts" -l

```



Luego lee **cada archivo** que aparezca en el resultado del segundo comando.



## Qué analizar por cada route



Para cada archivo encontrado:



1. **¿Cómo obtiene `clinic_id`?**

   - Del perfil en BD / Del JWT / Del body (peligroso) / No lo obtiene



2. **¿Lo usa para filtrar queries?**

   - `.eq('clinic_id', ...)` presente → bien

   - `createAdminClient()` sin `.eq('clinic_id', ...)` → riesgo



3. **¿Qué pasa con multi-clínica?**

   - ¿Necesita un "clinic activo" en el contexto?

   - ¿Puede funcionar sin cambios o necesita refactor?



## Clasificación por route



- **ROJO** — Puede exponer datos entre clínicas o romper la funcionalidad

- **AMARILLO** — Necesita adaptación pero no expone datos

- **VERDE** — Funciona correctamente con multi-clínica sin cambios



## Output a generar



Crea `prompts/outputs/riesgo-etapa3-api.md`:



```markdown

# Etapa 3 — API Routes · Hallazgos



## Métricas

- Total routes en src/app/api/: [N]

- Routes que referencian clinic_id: [N]

- Clasificación ROJO: [N]

- Clasificación AMARILLO: [N]

- Clasificación VERDE: [N]



## Inventario completo

| Archivo | Cómo obtiene clinic_id | Filtra queries | Clasificación |

|---------|----------------------|----------------|---------------|

| ...     | ...                  | Sí/No          | ROJO/AMARILLO/VERDE |



## Routes ROJO — detalle

### [ruta]

- Línea exacta del problema: [N]

- Qué puede romperse: [descripción]

- Qué necesita cambiar: [descripción específica]



## Routes que necesitan "clínica activa" en el contexto

[Lista de routes que necesitarán saber cuál es la clínica

seleccionada por el usuario en ese momento]



## Routes del marketplace que pueden construirse ya

[Routes nuevas que no dependen del cambio de profiles.clinic_id]

```



## Verificación antes de cerrar la sesión



```bash

cat prompts/outputs/riesgo-etapa3-api.md | wc -l

# Debe ser > 50 líneas

grep "ROJO\|AMARILLO\|VERDE" prompts/outputs/riesgo-etapa3-api.md | wc -l

# Debe ser > 0

```



**La Etapa 4 solo puede ejecutarse si este archivo existe y tiene el inventario completo.**



---

---



# ETAPA 4 — Mapeo de UI y layouts



**Input:** outputs etapas 1-3 + archivos de componentes  

**Output:** `prompts/outputs/riesgo-etapa4-ui.md`  

**Duración estimada:** 10-15 minutos



## Instrucciones



Eres un ingeniero frontend auditando componentes de navegación y layouts.

**Solo lees. No modificas nada. No haces commits.**



Lee los outputs anteriores:



```

prompts/outputs/riesgo-etapa1-schema.md

prompts/outputs/riesgo-etapa2-auth.md

prompts/outputs/riesgo-etapa3-api.md

```



Luego lee estos archivos:



```

src/components/shared/VetLayout.tsx

src/components/admin/AdminLayout.tsx

src/app/vet/layout.tsx               (si existe)

src/app/admin/layout.tsx             (si existe)

src/app/owner/layout.tsx             (si existe)

src/app/vet/dashboard/page.tsx

src/app/owner/dashboard/page.tsx

src/app/admin/page.tsx

```



Ejecuta:



```bash

grep -n "clinic_id\|clinicName\|clinicId" src/components/shared/VetLayout.tsx

grep -n "clinic_id\|clinicName\|clinicId" src/app/vet/dashboard/page.tsx

grep -n "clinic_id\|clinicName\|clinicId" src/app/owner/dashboard/page.tsx

```



## Qué analizar



1. **VetLayout — suposiciones sobre clínica única**

   - ¿Recibe `clinicName` como prop? ¿De dónde viene?

   - ¿Dónde debe ir el selector de clínica activa?

   - ¿Qué props cambiarían con multi-clínica?



2. **Dashboards — qué datos asumen una sola clínica**

   - ¿El dashboard del vet agrupa datos por clínica o los mezcla?

   - ¿El dashboard del dueño puede mostrar mascotas de múltiples clínicas?



3. **Owner dashboard — agrupación por clínica**

   - ¿Cómo está estructurada la lista de mascotas hoy?

   - ¿Qué cambio necesita para mostrar mascotas agrupadas por clínica?



4. **Componentes del marketplace — qué existe ya**

   - ¿Hay componentes reutilizables para las cards del marketplace?

   - ¿Qué hay que construir desde cero?



## Output a generar



Crea `prompts/outputs/riesgo-etapa4-ui.md`:



```markdown

# Etapa 4 — UI y Layouts · Hallazgos



## VetLayout — cambios necesarios para multi-clínica

- Props que cambian: [lista]

- Dónde va el selector de clínica activa: [descripción]

- Datos que dependen de clínica activa: [lista]



## Owner Dashboard — cambios necesarios

- Estructura actual: [descripción]

- Estructura necesaria con multi-clínica: [descripción]

- Componentes a refactorizar: [lista]



## Vet Dashboard — cambios necesarios

- Qué asume clínica única hoy: [descripción]

- Qué necesita el contexto de clínica activa: [lista]



## Componentes nuevos requeridos

| Componente | Descripción | Depende de Capa 1 |

|------------|-------------|-------------------|

| ClinicSelector | Dropdown en sidebar | Sí |

| MarketplaceClinicCard | Card en /marketplace/clinicas | No |

| CareRequestForm | Formulario de solicitud | No |

| ... | ... | ... |



## Componentes del marketplace independientes de Capa 1

[Lista de componentes que pueden construirse sin esperar

el cambio de profiles.clinic_id]



## Resumen de impacto en UI

- Componentes que necesitan refactor: [N]

- Componentes nuevos para el marketplace: [N]

- Componentes bloqueados hasta resolver Capa 1: [N]

```



## Verificación antes de cerrar la sesión



```bash

cat prompts/outputs/riesgo-etapa4-ui.md | wc -l

# Debe ser > 30 líneas

grep "Depende de Capa 1" prompts/outputs/riesgo-etapa4-ui.md | wc -l

# Debe ser > 0

```



**La Etapa 5 solo puede ejecutarse si los 4 outputs anteriores existen y tienen secciones completas.**



---

---



# ETAPA 5 — Documento final de coste técnico



**Input:** outputs de etapas 1-4 + spec del marketplace  

**Output:** `prompts/marketplace-coste-tecnico.md`  

**Duración estimada:** 15-20 minutos



## Instrucciones



Eres un arquitecto de software redactando el documento de coste técnico

que un equipo usará para planificar la implementación del marketplace.

**Solo lees outputs anteriores y creas un documento. No tocas src/.**



Lee todos los outputs en orden:



```

prompts/marketplace-multiclínica.md

prompts/outputs/riesgo-etapa1-schema.md

prompts/outputs/riesgo-etapa2-auth.md

prompts/outputs/riesgo-etapa3-api.md

prompts/outputs/riesgo-etapa4-ui.md

```



Ejecuta el estado actual de TypeScript:



```bash

npx tsc --noEmit 2>&1 | tail -10

```



Incluye el resultado en la introducción del documento.



## Documento a generar



Crea `prompts/marketplace-coste-tecnico.md` con estas secciones:



### Sección 1 — Resumen ejecutivo



Números concretos extraídos de los outputs:

- Total archivos afectados por el cambio de modelo

- Total API routes que necesitan cambios

- Total políticas RLS a reescribir

- Total componentes UI a refactorizar

- Cambios clasificados ROJO / AMARILLO / VERDE



### Sección 2 — Los 5 cambios más peligrosos



Para cada uno, usando hallazgos reales de las etapas anteriores:



```

## [RIESGO CRÍTICO/ALTO] Título



Archivo(s): [rutas exactas]

Por qué es peligroso: [basado en hallazgos reales]

Consecuencia si se hace mal: [específica]

Cómo manejarlo: [estrategia concreta]

Condición para considerarlo seguro: [verificable]

```



### Sección 3 — Capa 1 vs Capa 2: qué es independiente



```

| Feature del marketplace | Depende de Capa 1 | Puede construirse ya |

|------------------------|-------------------|---------------------|

| /marketplace/clinicas  | No                | Sí                  |

| Selector clínica activa | Sí               | No                  |

| ...                    | ...               | ...                 |

```



### Sección 4 — Orden de implementación



```

FASE A — Preparación (sin tocar código existente)

  [ ] Tests mínimos para las routes ROJO identificadas

  [ ] Migración profile_clinics (crear tabla, no migrar datos aún)

  [ ] Feature flag ENABLE_MULTI_CLINIC=false



FASE B — Capa 1: modelo de datos

  [ ] Migrar datos de profiles.clinic_id a profile_clinics

  [ ] Actualizar RLS policies (listadas en Etapa 1)

  [ ] Actualizar middleware (hallazgos de Etapa 2)

  [ ] Actualizar API routes ROJO (listadas en Etapa 3)

  [ ] Verificación: todos los tests pasan, 0 errores TypeScript



FASE C — Capa 2: módulo marketplace (bloqueado hasta que B pase)

  [ ] Rutas /marketplace/** (nuevas, autocontenidas)

  [ ] Tablas nuevas: care_requests, clinic_blocks, clinic_join_requests

  [ ] Handshake flows A, B y C

  [ ] Selector de clínica activa en VetLayout

  [ ] Owner dashboard agrupado por clínica



FASE D — Exportación PDF

  [ ] Generador bajo demanda

  [ ] Sin atribución de clínica o profesional

```



### Sección 5 — Tests mínimos antes de Fase B



Lista de tests específicos basados en los archivos ROJO de Etapa 3:



```

Para [nombre de route ROJO]:

- it('usuario con clínica A no ve datos de clínica B')

- it('selector de clínica activa cambia el scope de las queries')

- [tests específicos según hallazgos reales]

```



### Sección 6 — Lo que NO debe tocarse hasta completar Fase B



Lista de archivos con justificación, extraída de los hallazgos anteriores.



### Sección 7 — Condiciones para empezar Fase B



```markdown

- [ ] Los tests de la Sección 5 existen y pasan en el estado actual

- [ ] La tabla profile_clinics existe en migración separada (sin datos)

- [ ] Feature flag ENABLE_MULTI_CLINIC está en false en producción

- [ ] Todos los archivos ROJO tienen un test de regresión

- [ ] npx tsc --noEmit pasa sin errores en Develop

- [ ] [condiciones adicionales que emerjan del análisis real]

```



## Verificación final



```bash

cat prompts/marketplace-coste-tecnico.md | wc -l

# Debe ser > 80 líneas



grep "^### Sección" prompts/marketplace-coste-tecnico.md | wc -l

# Debe ser 7



npx tsc --noEmit

# Debe pasar sin errores

```



**El análisis está completo cuando `prompts/marketplace-coste-tecnico.md` existe

y las 7 secciones están presentes con datos reales del repositorio.**



---



## Restricciones aplicables a todas las etapas



- ❌ No crear ni modificar ningún archivo en `src/`

- ❌ No crear ni modificar migraciones de Supabase

- ❌ No instalar dependencias

- ❌ No hacer commits de código fuente

- ✅ Solo leer archivos existentes y outputs de etapas anteriores

- ✅ Solo crear archivos en `prompts/outputs/` (etapas 1-4) o `prompts/` (etapa 5)

- ✅ Ejecutar comandos `grep`, `find`, `wc`, `cat`, `npx tsc --noEmit`
