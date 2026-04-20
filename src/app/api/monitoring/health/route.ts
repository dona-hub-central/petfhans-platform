import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const memoryMB = Math.round(process.memoryUsage().rss / 1024 / 1024)
  const uptimeSeconds = Math.round(process.uptime())

  const status = {
    status:       'ok',
    timestamp:    new Date().toISOString(),
    instance_id:  process.env.pm_id ?? 'local',
    uptime_s:     uptimeSeconds,
    memory_mb:    memoryMB,
    node_version: process.version,
    env:          process.env.NODE_ENV,
  }

  if (memoryMB > 700) {
    return NextResponse.json(
      { ...status, status: 'degraded', reason: `Memoria alta: ${memoryMB}MB` },
      { status: 200 }
    )
  }

  return NextResponse.json(status)
}
