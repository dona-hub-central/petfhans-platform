import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { message, history = [], test = false } = await req.json()
  if (!message) return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })

  const admin = createAdminClient()

  // Cargar configuración del agente
  const { data: agent } = await admin.from('ai_agent').select('*').eq('id', 'default').single()
  if (!agent?.openai_api_key) return NextResponse.json({ error: 'El agente no tiene API key configurada' }, { status: 400 })
  if (!agent.is_active && !test) return NextResponse.json({ error: 'El agente está inactivo' }, { status: 400 })

  // ── Obtener contexto completo de la BD ──────────────────────────────
  const [
    { data: pets },
    { data: records },
    { data: clinics },
  ] = await Promise.all([
    admin.from('pets')
      .select('id, name, species, breed, birth_date, weight, gender, neutered, microchip, notes, owner_id, clinic_id, clinics(name)')
      .eq('is_active', true).limit(100),
    admin.from('medical_records')
      .select('id, pet_id, visit_date, visit_type, reason, diagnosis, prognosis, treatment, medications, vaccines, physical_exam, notes, next_visit, pets(name, species), profiles!medical_records_vet_id_fkey(full_name)')
      .order('visit_date', { ascending: false }).limit(200),
    admin.from('clinics').select('id, name, slug, subscription_plan').limit(50),
  ])

  // Construir contexto resumido para el agente
  const dbContext = `
=== BASE DE DATOS PETFHANS ===
Fecha actual: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

CLÍNICAS (${clinics?.length ?? 0}):
${clinics?.map(c => `- ${c.name} (${c.slug}) · Plan: ${c.subscription_plan}`).join('\n') ?? 'Sin clínicas'}

MASCOTAS ACTIVAS (${pets?.length ?? 0}):
${pets?.map(p => {
  const age = p.birth_date ? Math.floor((Date.now() - new Date(p.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365)) : null
  return `- ${p.name} | ${p.species}${p.breed ? ` ${p.breed}` : ''} | ${age ? age + 'a' : '?'} | ${p.weight ? p.weight + 'kg' : '?'} | ${p.gender === 'male' ? 'Macho' : 'Hembra'}${p.neutered ? ' castrado' : ''} | Clínica: ${(p as any).clinics?.name ?? '?'}`
}).join('\n') ?? 'Sin mascotas'}

HISTORIAL MÉDICO RECIENTE (${records?.length ?? 0} consultas):
${records?.slice(0, 50).map(r => {
  const pet = r.pets as any
  const vet = r.profiles as any
  const meds = Array.isArray(r.medications) ? r.medications.filter((m: any) => m.name).map((m: any) => `${m.name} ${m.dose}`).join(', ') : ''
  return `[${r.visit_date}] ${pet?.name ?? '?'} (${pet?.species ?? '?'}) · ${r.reason}${r.diagnosis ? ` → Dx: ${r.diagnosis}` : ''}${r.treatment ? ` · Tto: ${r.treatment}` : ''}${meds ? ` · Meds: ${meds}` : ''} · Dr: ${vet?.full_name ?? '?'}`
}).join('\n') ?? 'Sin historial'}
=== FIN CONTEXTO ===
`

  // Skills del agente
  const skillsText = (agent.skills ?? []).length > 0
    ? `\n\nCAPACIDADES ESPECIALES:\n${(agent.skills as string[]).map((s: string) => `• ${s}`).join('\n')}`
    : ''

  const systemPrompt = (agent.system_prompt || 'Eres Dr. Petfhans, veterinario experto.') + skillsText + '\n\n' + dbContext

  // ── Llamada a OpenAI ────────────────────────────────────────────────
  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10), // últimos 10 mensajes
      { role: 'user', content: message },
    ]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${agent.openai_api_key}`,
      },
      body: JSON.stringify({
        model:       agent.model ?? 'gpt-4o',
        messages,
        temperature: agent.temperature ?? 0.7,
        max_tokens:  2000,
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      return NextResponse.json({ error: err.error?.message ?? 'Error de OpenAI' }, { status: 400 })
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content ?? 'Sin respuesta'

    return NextResponse.json({ reply, model: agent.model })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
