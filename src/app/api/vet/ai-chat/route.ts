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

  const { message, pet_id, history = [] } = await req.json()
  const admin = createAdminClient()

  const { data: agent } = await admin.from('ai_agent').select('*').eq('id', 'default').single()
  if (!agent?.openai_api_key) {
    return NextResponse.json({ reply: 'El agente IA no está configurado.' })
  }
  if (!agent.is_active) {
    return NextResponse.json({ reply: 'El agente IA está inactivo.' })
  }

  let petContext = ''
  if (pet_id) {
    const { data: pet } = await admin.from('pets')
      .select('*, profiles!pets_owner_id_fkey(full_name)')
      .eq('id', pet_id).single()

    const { data: records } = await admin.from('medical_records')
      .select('*').eq('pet_id', pet_id).order('visit_date', { ascending: false }).limit(10)

    if (pet) {
      petContext = `
PACIENTE ACTIVO:
- Nombre: ${pet.name} | Especie: ${pet.species} | Raza: ${pet.breed ?? 'N/D'}
- Edad: ${pet.birth_date ? calcAge(pet.birth_date) : 'N/D'} | Peso: ${pet.weight ? `${pet.weight} kg` : 'N/D'}
- Sexo: ${pet.gender === 'male' ? 'Macho' : 'Hembra'} | Castrado: ${pet.neutered ? 'Sí' : 'No'}
- Dueño: ${(pet.profiles as { full_name: string } | null)?.full_name ?? 'N/D'}
${pet.notes ? `- Notas: ${pet.notes}` : ''}

HISTORIAL (${records?.length ?? 0} consultas):
${records?.map(r => `[${r.visit_date}] ${r.reason} → Dx: ${r.diagnosis ?? 'N/D'} · Tto: ${r.treatment ?? 'N/D'}`).join('\n') ?? 'Sin consultas'}`
    }
  }

  const systemPrompt = (agent.system_prompt || 'Eres Dr. Petfhans, veterinario experto.') +
    (petContext ? `\n\n${petContext}` : '\n\nNo hay paciente seleccionado.') +
    '\n\nIMPORTANTE: No reemplazas el criterio clínico del veterinario. Eres un apoyo de decisión.'

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10).map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
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
      max_tokens:  1500,
    }),
  })

  if (!response.ok) {
    const err = await response.json() as { error?: { message?: string } }
    return NextResponse.json({ reply: `Error de IA: ${err.error?.message ?? 'Revisa la API key'}` }, { status: 502 })
  }

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  const reply = data.choices?.[0]?.message?.content ?? 'Sin respuesta'
  return NextResponse.json({ reply })
}

export const POST = withMetrics('/api/vet/ai-chat', handler)

function calcAge(birthDate: string) {
  const months = Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
  return months < 12 ? `${months} meses` : `${Math.floor(months / 12)} años`
}
