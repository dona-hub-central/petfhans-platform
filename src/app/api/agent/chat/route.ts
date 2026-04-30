import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withMetrics } from '@/lib/metrics'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

async function handler(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // createAdminClient bypasses RLS so the profile row is always readable
  const admin = createAdminClient()

  // C-3: verificar que el usuario es superadmin
  const { data: profile } = await admin.from('profiles')
    .select('role').eq('user_id', user.id).single()
  if (profile?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Acceso restringido a superadmin' }, { status: 403 })
  }

  const { message, history = [], clinic_id, test = false } = await req.json()
  if (!message) return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })

  // C-3: requerir selección explícita de clínica — nunca cargar todas
  // test=true (botón "Probar" de la config) no necesita clínica
  if (!clinic_id && !test) {
    return NextResponse.json({ error: 'Selecciona una clínica para consultar' }, { status: 400 })
  }

  const { data: agent } = await admin.from('ai_agent').select('*').eq('id', 'default').single()
  if (!agent?.openai_api_key) return NextResponse.json({ error: 'Sin API key' }, { status: 400 })
  if (!agent.is_active && !test) return NextResponse.json({ error: 'Agente inactivo' }, { status: 400 })

  let dbContext = ''
  if (clinic_id) {
    // C-3: verificar que la clínica existe y obtener solo sus metadatos
    const { data: clinic } = await admin.from('clinics')
      .select('id, name, slug, subscription_plan').eq('id', clinic_id).single()
    if (!clinic) return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 })

    // C-3: cargar datos SOLO de la clínica seleccionada, sin registros médicos individuales
    const [{ data: pets }, { data: appointments }] = await Promise.all([
      admin.from('pets')
        .select('id, name, species, breed, birth_date, weight, gender, neutered')
        .eq('clinic_id', clinic_id)
        .eq('is_active', true)
        .limit(100),
      admin.from('appointments')
        .select('id, appointment_date, appointment_time, status, reason, is_virtual')
        .eq('clinic_id', clinic_id)
        .order('appointment_date', { ascending: false })
        .limit(50),
    ])

    dbContext = `
=== CLÍNICA SELECCIONADA: ${clinic.name} (${clinic.slug}) ===
Plan: ${clinic.subscription_plan}
Fecha: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

MASCOTAS ACTIVAS (${pets?.length ?? 0}):
${pets?.map((p: { name: string; species: string; breed?: string; birth_date?: string }) => {
  const age = p.birth_date ? Math.floor((Date.now() - new Date(p.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365)) : null
  return `- ${p.name} | ${p.species}${p.breed ? ` ${p.breed}` : ''} | ${age !== null ? age + 'a' : '?'}`
}).join('\n') ?? 'Sin mascotas'}

CITAS RECIENTES (${appointments?.length ?? 0}):
${appointments?.map((a: { appointment_date: string; status: string; reason: string }) => `[${a.appointment_date}] ${a.status} | ${a.reason}`).join('\n') ?? 'Sin citas'}
=== FIN ===`
  }

  const skillsText = (agent.skills ?? []).length > 0
    ? `\n\nCAPACIDADES:\n${(agent.skills as string[]).map((s: string) => `• ${s}`).join('\n')}`
    : ''

  const systemPrompt = (agent.system_prompt || 'Eres Dr. Petfhans, veterinario experto.') + skillsText + (dbContext ? '\n\n' + dbContext : '')

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10),
    { role: 'user', content: message },
  ]

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${agent.openai_api_key}` },
    body: JSON.stringify({ model: agent.model ?? 'gpt-4o', messages, temperature: agent.temperature ?? 0.7, max_tokens: 2000 }),
  })

  if (!response.ok) {
    const err = await response.json() as { error?: { message?: string } }
    return NextResponse.json({ error: err.error?.message ?? 'Error de OpenAI' }, { status: 400 })
  }

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  const reply = data.choices?.[0]?.message?.content ?? 'Sin respuesta'
  return NextResponse.json({ reply, model: agent.model })
}

export const POST = withMetrics('/api/agent/chat', handler)
