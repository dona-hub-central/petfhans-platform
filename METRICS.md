# 📊 Métricas y monitoreo — Petfhans

## Arquitectura de métricas

```
Request entrante
      ↓
withMetrics() en la route
      ↓
Lógica de la ruta (OpenAI, Supabase, etc.)
      ↓
Log JSON estructurado → PM2 (out_file / error_file)
      ↓
Consulta desde terminal
```

---

## Niveles de alerta

| Nivel | Duración | Acción |
|-------|----------|--------|
| `ok` | < 10s | Log normal en stdout |
| `warn` | 10s – 25s | Log en stdout con prefijo ⚠️ |
| `critical` | > 25s | Log en **stderr** con prefijo 🚨 |

---

## Consultar métricas desde la terminal

### Ver estado de las 4 instancias
```bash
pm2 status
```

### Ver logs en tiempo real
```bash
# Todos los logs
pm2 logs petfhans

# Solo errores y críticos (stderr)
pm2 logs petfhans --err

# Solo stdout
pm2 logs petfhans --out

# Últimas 100 líneas
pm2 logs petfhans --lines 100
```

### Buscar respuestas lentas (> 10 segundos)
```bash
grep '"level":"warn"\|"level":"critical"' /var/log/pm2/petfhans-combined.log | tail -50
```

### Ver solo errores 500
```bash
grep '"status":500' /var/log/pm2/petfhans-combined.log | tail -20
```

### Tiempos promedio de la última hora en rutas de IA
```bash
grep '"route":"/api/vet/ai-chat"' /var/log/pm2/petfhans-combined.log \
  | tail -100 \
  | grep -o '"duration_ms":[0-9]*' \
  | awk -F: '{sum+=$2; count++} END {print "Promedio:", sum/count, "ms · Peticiones:", count}'
```

### Ver uso de recursos por instancia
```bash
pm2 monit
```

---

## Health check

```bash
# Desde el VPS
curl http://localhost:3000/api/monitoring/health

# Desde fuera (con tu dominio)
curl https://petfhans.com/api/monitoring/health
```

Respuesta normal:
```json
{
  "status": "ok",
  "timestamp": "2026-04-20T10:00:00.000Z",
  "instance_id": "0",
  "uptime_s": 3600,
  "memory_mb": 342,
  "node_version": "v22.22.2",
  "env": "production"
}
```

Respuesta degradada (memoria alta):
```json
{
  "status": "degraded",
  "reason": "Memoria alta: 720MB",
  ...
}
```

---

## Comandos ante incidentes

### Una instancia consume demasiada memoria
```bash
# Ver qué instancia tiene el problema
pm2 status

# Reiniciar solo esa instancia (por ID)
pm2 restart petfhans --only 2
```

### Todas las instancias bloqueadas en llamadas a IA
```bash
# Zero-downtime reload de todas las instancias
pm2 reload petfhans

# Si el reload no resuelve, restart forzado
pm2 restart petfhans
```

### El servidor responde lento bajo carga
```bash
# Ver CPU y RAM en tiempo real
pm2 monit

# Ver conexiones activas a Nginx
ss -tn | grep :443 | wc -l

# Ver carga del sistema
top -b -n1 | head -5
```

### Aumentar instancias temporalmente ante pico de tráfico
```bash
# Escalar a 6 instancias
pm2 scale petfhans 6

# Volver a 4 cuando baje el tráfico
pm2 scale petfhans 4
```

---

## Sentry — configuración básica

Sentry captura errores automáticamente sin consumir recursos del VPS.

### Instalación
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

El wizard genera automáticamente:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- Modifica `next.config.ts`

### Variables de entorno a añadir en `.env.local`
```env
SENTRY_DSN=https://xxxx@oXXX.ingest.sentry.io/XXXX
SENTRY_ORG=tu-org
SENTRY_PROJECT=petfhans
```

### Qué captura Sentry automáticamente
- Errores no capturados en API routes
- Errores de React en componentes
- Performance traces (TTFB, LCP)
- Errores en el middleware de Next.js

---

## Formato del log JSON generado por withMetrics()

Cada petición a `/api/vet/ai-chat` o `/api/agent/chat` genera una línea:

```json
{
  "timestamp": "2026-04-20T10:23:45.123Z",
  "route": "/api/vet/ai-chat",
  "method": "POST",
  "status": 200,
  "duration_ms": 4821,
  "level": "ok",
  "instance_id": "2"
}
```

En caso de error 500:
```json
{
  "timestamp": "2026-04-20T10:23:45.123Z",
  "route": "/api/agent/chat",
  "method": "POST",
  "status": 500,
  "duration_ms": 312,
  "level": "critical",
  "instance_id": "0",
  "extra": {
    "error": "TypeError: Cannot read properties of undefined"
  }
}
```
