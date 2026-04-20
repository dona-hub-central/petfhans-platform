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

  const { message, history = [], test = false } = await req.json()
  if (!message) return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })

  const admin = createAdminClient()

  const { data: agent } = await admin.from('ai_agent').select('*').eq('id', 'default').single()
  if (!agent?.openai_api_key) return NextResponse.json({ error: 'Sin API key' }, { status: 400 })
  if (!agent.is_active && !test) return NextResponse.json({ error: 'Agente inactivo' }, { status: 400 })

  const [{ data: pets }, { data: records }, { data: clinics }] = await Promise.all([
    admin.from('pets')
      .select('id, name, species, breed, birth_date, weight, gender, neutered, clinic_id, clinics(name)')
      .eq('is_active', true).limit(100),
    admin.from('medical_records')
      .select('id, pet_id, visit_date, reason, diagnosis, treatment, medications, pets(name, species), profiles!medical_records_vet_id_fkey(full_name)')
      .order('visit_date', { ascending: false }).limit(200),
    admin.from('clinics').select('id, name, slug, subscription_plan').limit(50),
  ])

  const dbContext = `
=== BASE DE DATOS PETFHANS ===
Fecha: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

CLÍNICAS (${clinics?.length ?? 0}):
${clinics?.map(c => `- ${c.name} (${c.slug}) · ${c.subscription_plan}`).join('\n') ?? 'Sin clínicas'}

MASCOTAS (${pets?.length ?? 0}):
${pets?.map(p => {
  const age = p.birth_date ? Math.floor((Date.now() - new Date(p.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365)) : null
  return `- ${p.name} | ${p.species}${p.breed ? ` ${p.breed}` : ''} | ${age ? age + 'a' : '?'} | Clínica: ${(p as { clinics?: { name: string } }).clinics?.name ?? '?'}`
}).join('\n') ?? 'Sin mascotas'}

HISTORIAL RECIENTE (${records?.length ?? 0}):
${records?.slice(0, 50).map(r => {
  const pet = r.pets as { name: string; species: string } | null
  const vet = r.profiles as { full_name: string } | null
  return `[${r.visit_date}] ${pet?.name ?? '?'} · ${r.reason}${r.diagnosis ? ` → ${r.diagnosis}` : ''} · Dr: ${vet?.full_name ?? '?'}`
}).join('\n') ?? 'Sin historial'}
=== FIN ===`

  const skillsText = (agent.skills ?? []).length > 0
    ? `\n\nCAPACIDADES:\n${(agent.skills as string[]).map((s: string) => `• ${s}`).join('\n')}`
    : ''

  const systemPrompt = (agent.system_prompt || 'Eres Dr. Petfhans, veterinario experto.') + skillsText + '\n\n' + dbContext

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

export const POST = withMetrics('/api/agent/chat', handler as (req: Request) => Promise<Response>)
