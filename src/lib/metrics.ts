// src/lib/metrics.ts
const SLOW_THRESHOLD_MS = 25_000
const WARN_THRESHOLD_MS = 10_000

export type MetricEvent = {
  timestamp: string
  route: string
  method: string
  status: number
  duration_ms: number
  level: 'ok' | 'warn' | 'critical'
  instance_id: string
  extra?: Record<string, unknown>
}

function logMetric(event: MetricEvent) {
  if (event.level === 'critical') {
    console.error(JSON.stringify(event))
  } else {
    console.log(JSON.stringify(event))
  }
}

export function withMetrics(
  route: string,
  handler: (req: Request) => Promise<Response>
) {
  return async function (req: Request): Promise<Response> {
    const start = Date.now()
    const instance_id = process.env.pm_id ?? 'local'
    let status = 200

    try {
      const response = await handler(req)
      status = response.status
      const duration_ms = Date.now() - start

      let level: MetricEvent['level'] = 'ok'
      if (duration_ms >= SLOW_THRESHOLD_MS) level = 'critical'
      else if (duration_ms >= WARN_THRESHOLD_MS) level = 'warn'

      logMetric({
        timestamp: new Date().toISOString(),
        route,
        method: req.method,
        status,
        duration_ms,
        level,
        instance_id,
      })

      if (level === 'critical') {
        console.error(
          `🚨 [CRÍTICO] ${route} tardó ${(duration_ms / 1000).toFixed(1)}s — instancia ${instance_id}`
        )
      } else if (level === 'warn') {
        console.warn(
          `⚠️  [LENTO] ${route} tardó ${(duration_ms / 1000).toFixed(1)}s — instancia ${instance_id}`
        )
      }

      return response
    } catch (err) {
      const duration_ms = Date.now() - start

      logMetric({
        timestamp: new Date().toISOString(),
        route,
        method: req.method,
        status: 500,
        duration_ms,
        level: 'critical',
        instance_id,
        extra: { error: String(err) },
      })

      console.error(
        `🔥 [ERROR 500] ${route} — ${String(err)} — instancia ${instance_id}`
      )

      throw err
    }
  }
}
