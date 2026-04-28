import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const petId = searchParams.get('pet_id')
  if (!petId) return NextResponse.json({ error: 'pet_id requerido' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles')
    .select('id').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })

  // Verify pet_access ownership
  const { data: access } = await admin.from('pet_access')
    .select('pet_id').eq('owner_id', profile.id).eq('pet_id', petId).maybeSingle()
  if (!access) return NextResponse.json({ error: 'Sin acceso a esta mascota' }, { status: 403 })

  const { data: pet } = await admin.from('pets').select('*').eq('id', petId).single()
  if (!pet) return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })

  const { data: records } = await admin.from('medical_records')
    .select('visit_date, reason, diagnosis, treatment')
    .eq('pet_id', petId)
    .order('visit_date', { ascending: false })
    .limit(5)

  const { data: agent } = await admin.from('ai_agent')
    .select('openai_api_key, model, is_active').eq('id', 'default').single()
  if (!agent?.openai_api_key || !agent.is_active) {
    return NextResponse.json({ error: 'Agente IA no configurado' }, { status: 503 })
  }

  const speciesLabel: Record<string, string> = { dog: 'Perro', cat: 'Gato', bird: 'Ave', rabbit: 'Conejo', other: 'Otro' }
  const age = pet.birth_date ? calcAge(pet.birth_date) : 'desconocida'

  const context = [
    `Nombre: ${pet.name}`,
    `Especie: ${speciesLabel[pet.species] ?? pet.species}`,
    `Raza: ${pet.breed || 'N/D'}`,
    `Edad: ${age}`,
    `Peso: ${pet.weight ? `${pet.weight} kg` : 'N/D'}`,
    `Sexo: ${pet.gender === 'male' ? 'Macho' : 'Hembra'}`,
    `Castrado/a: ${pet.neutered ? 'Sí' : 'No'}`,
    pet.notes ? `Notas clínicas: ${pet.notes}` : null,
    records && records.length > 0
      ? `\nHistorial reciente:\n${records.map(r =>
          `- ${r.visit_date}: ${r.reason}${r.diagnosis ? ` (Dx: ${r.diagnosis})` : ''}${r.treatment ? ` / Tto: ${r.treatment}` : ''}`
        ).join('\n')}`
      : null,
  ].filter(Boolean).join('\n')

  const userPrompt = `Eres un veterinario experto y empático. Basándote en el perfil de esta mascota, genera 4 recomendaciones personalizadas y prácticas en español. Responde ÚNICAMENTE con JSON válido (sin markdown, sin texto extra):

${context}

Responde exactamente con este formato:
{
  "tips": [
    {
      "id": "nutricion",
      "title": "Nutrición",
      "content": "Recomendación específica y práctica sobre alimentación (2-3 oraciones directas y útiles)"
    },
    {
      "id": "ejercicio",
      "title": "Ejercicio",
      "content": "Recomendación sobre actividad física adecuada para esta mascota (2-3 oraciones)"
    },
    {
      "id": "salud",
      "title": "Salud preventiva",
      "content": "Recomendación sobre prevención, vacunas, desparasitación o controles (2-3 oraciones)"
    },
    {
      "id": "bienestar",
      "title": "Bienestar",
      "content": "Recomendación sobre enriquecimiento, socialización o higiene emocional (2-3 oraciones)"
    }
  ]
}`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${agent.openai_api_key}`,
    },
    body: JSON.stringify({
      model: agent.model ?? 'gpt-4o',
      messages: [
        { role: 'system', content: 'Eres un veterinario experto. Respondes siempre en JSON válido sin texto adicional.' },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 900,
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Error de IA' }, { status: 502 })
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
  const raw = data.choices?.[0]?.message?.content ?? ''

  try {
    const parsed = JSON.parse(raw) as { tips: Array<{ id: string; title: string; content: string }> }
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Respuesta IA inválida' }, { status: 502 })
  }
}

function calcAge(birthDate: string): string {
  const months = Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
  return months < 12 ? `${months} meses` : `${Math.floor(months / 12)} años`
}
