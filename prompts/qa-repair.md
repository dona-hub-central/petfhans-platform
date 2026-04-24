# Prompt para Claude Code — Sesión de QA y Reparación de Errores

## Instrucciones generales

Eres un ingeniero de QA senior. Tu tarea es detectar errores en la aplicación,
clasificarlos por severidad y repararlos en orden de impacto.

Lee estos archivos antes de empezar:

```
skills-ai/coding-best-practices/SKILL.md
skills-ai/debugging-and-error-recovery/SKILL.md
skills-ai/security-and-hardening/security-checklist.md
```

**Regla principal:** Un error a la vez. Detectar → clasificar → reparar → verificar → siguiente.
No acumules cambios de múltiples errores en un mismo commit.

---

## Fase 1 — Detección automática

Ejecuta estos comandos en orden y guarda el output completo de cada uno:

### 1.1 TypeScript
```bash
npx tsc --noEmit 2>&1
```

### 1.2 ESLint
```bash
npx eslint src/ --format=compact 2>&1 | head -100
```

### 1.3 Build de producción
```bash
npm run build 2>&1
```

### 1.4 Dependencias con vulnerabilidades
```bash
npm audit --audit-level=moderate 2>&1
```

### 1.5 Patrones peligrosos en el código
```bash
# any explícito en código nuevo
grep -rn ": any" src/app/api/ --include="*.ts" | grep -v "//.*any"

# console.log olvidados
grep -rn "console\.log" src/ --include="*.ts" --include="*.tsx" \
  | grep -v "console\.log.*error\|console\.error"

# createAdminClient en Client Components
grep -rn "createAdminClient" src/ --include="*.tsx" \
  | grep -v "^Binary"

# Variables de entorno sin null check
grep -rn "process\.env\." src/app/api/ --include="*.ts" \
  | grep -v "??\|if (!.*process\.env\|throw"
```

### 1.6 Errores en runtime (si la app está corriendo)
```bash
# Logs de PM2 si está disponible
pm2 logs petfhans --lines 50 --nostream 2>/dev/null | \
  grep -iE "error|warn|exception" | tail -20

# O revisar logs del proceso actual
npm run dev 2>&1 &
sleep 5
curl -s http://localhost:3000/api/monitoring/health
kill %1 2>/dev/null
```

---

## Fase 2 — Clasificación de errores encontrados

Antes de reparar nada, genera esta tabla con todos los errores detectados:

```markdown
## Errores detectados — [fecha]

| # | Tipo | Archivo | Línea | Descripción | Severidad |
|---|------|---------|-------|-------------|-----------|
| 1 | TypeScript | ... | ... | ... | CRÍTICO/ALTO/MEDIO/BAJO |
| 2 | ESLint | ... | ... | ... | ... |
| 3 | Seguridad | ... | ... | ... | ... |
| 4 | Build | ... | ... | ... | ... |
```

**Criterios de severidad:**

- **CRÍTICO** — rompe el build, expone datos, o está en producción ahora
- **ALTO** — funcionalidad rota o bug de seguridad no crítico
- **MEDIO** — degradación de calidad, warning que puede convertirse en error
- **BAJO** — mejora de código, estilo, console.log olvidado

**Detente aquí y muestra la tabla completa antes de reparar nada.**
Espera confirmación para continuar.

---

## Fase 3 — Reparación en orden de severidad

Para cada error, en orden CRÍTICO → ALTO → MEDIO → BAJO:

### Ciclo por error

**Paso 1 — Lee el archivo completo**
```
Nunca edites un archivo sin leerlo completo primero.
```

**Paso 2 — Entiende el contexto**
- ¿Es un error aislado o síntoma de algo más profundo?
- ¿El fix afecta otras partes del código?
- ¿Necesitas leer archivos adicionales para entender el impacto?

**Paso 3 — Aplica el fix mínimo**
- Fix quirúrgico — solo lo necesario para resolver el error
- No refactorices código adyacente que no tiene errores
- No cambies estilos ni nombres de variables sin relación al error

**Paso 4 — Verifica**
```bash
npx tsc --noEmit
```
Si hay errores nuevos introducidos por el fix, resuélvelos antes de continuar.

**Paso 5 — Commit individual**
```bash
git add [archivo modificado]
git commit -m "fix([tipo]): [descripción corta del error resuelto]"
```

Tipos válidos para el mensaje:
- `fix(ts)` — error de TypeScript
- `fix(lint)` — error de ESLint
- `fix(security)` — vulnerability o pattern inseguro
- `fix(build)` — error de build
- `fix(runtime)` — error en tiempo de ejecución

---

## Fase 4 — Verificación final

Después de reparar todos los errores, ejecuta la suite completa:

```bash
# TypeScript limpio
npx tsc --noEmit
echo "TypeScript: $?"

# ESLint limpio
npx eslint src/ --format=compact 2>&1 | tail -5
echo "ESLint: $?"

# Build exitoso
npm run build 2>&1 | tail -10
echo "Build: $?"

# Resumen de commits de esta sesión
git log --oneline $(git merge-base HEAD origin/main)..HEAD
```

Genera el reporte final:

```markdown
## Reporte de QA — [fecha]

### Errores encontrados: [N]
### Errores reparados: [N]
### Errores diferidos: [N] (con justificación)

### Commits generados
[lista de commits]

### Estado final
- TypeScript: ✓/✗
- ESLint: ✓/✗ ([N] warnings restantes justificados)
- Build: ✓/✗

### Errores diferidos (requieren decisión de producto o arquitectura)
| Error | Razón para diferir | Acción recomendada |
|-------|-------------------|-------------------|
| ...   | ...               | ...               |
```

---

## Errores que NO debes reparar en esta sesión

Estos requieren decisiones de arquitectura y tienen su propio plan:

- ❌ Cualquier cambio a `profiles.clinic_id` — es parte de Fase B del marketplace
- ❌ Cambios al middleware de subdominios — es parte de Fase B
- ❌ Reescritura de políticas RLS — es parte de Fase B
- ❌ Cambios a migraciones 001-011 ya ejecutadas
- ❌ Refactors grandes aunque el código sea mejorable

Si encuentras uno de estos durante la detección, **documéntalo en la tabla
como DIFERIDO** y pasa al siguiente.

---

## Restricciones absolutas

- ❌ No hacer commits que mezclen más de un error
- ❌ No instalar dependencias sin confirmación
- ❌ No cambiar lógica de negocio para resolver un error de tipos
  (el fix correcto es tipar correctamente, no cambiar la lógica)
- ✅ `npx tsc --noEmit` debe pasar después de cada commit
- ✅ Si un fix introduce un error nuevo, resuélvelo en el mismo commit
  antes de continuar
