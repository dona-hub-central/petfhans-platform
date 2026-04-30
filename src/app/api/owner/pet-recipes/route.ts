import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export type PetRecipe = {
  id: string
  title: string
  subtitle: string
  type: 'comida_natural' | 'snack'
  prep_time: number
  rating: number
  emoji: string
  ingredients: string[]
  preparation: string[]
  nutritional_tip: string
}

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

  const { data: accessRow } = await admin.from('pet_access')
    .select('pet_id').eq('owner_id', profile.id).eq('pet_id', petId).maybeSingle()
  if (!accessRow) {
    const { data: owned } = await admin.from('pets')
      .select('id').eq('id', petId).eq('owner_id', profile.id).maybeSingle()
    if (!owned) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const { data: pet } = await admin.from('pets').select('*').eq('id', petId).single()
  if (!pet) return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })

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
    `Castrado/a: ${pet.neutered ? 'Sí' : 'No'}`,
    pet.notes ? `Notas: ${pet.notes}` : null,
  ].filter(Boolean).join('\n')

  const prompt = `Eres un nutricionista veterinario experto. Genera recetas de alimentación natural personalizadas para esta mascota. Responde ÚNICAMENTE con JSON válido (sin markdown, sin texto extra):

${context}

Crea 3 recetas de "comida_natural" (platos principales nutritivos) y 2 recetas de "snack" (snacks caseros saludables). Usa emojis de comida relevantes. Responde exactamente con este formato:
{
  "recipes": [
    {
      "id": "recipe_1",
      "title": "Nombre atractivo de la receta",
      "subtitle": "Descripción del beneficio principal en 1 oración corta",
      "type": "comida_natural",
      "prep_time": 25,
      "rating": 4,
      "emoji": "🍲",
      "ingredients": ["100g de pechuga de pollo picada finamente", "50g de arroz blanco muy cocido"],
      "preparation": ["Paso 1: Cocinar el arroz hasta que quede muy blando.", "Paso 2: Triturar el pollo cocido."],
      "nutritional_tip": "Beneficio nutricional clave de esta receta en 1-2 oraciones."
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
        { role: 'system', content: 'Eres un nutricionista veterinario. Respondes siempre en JSON válido sin texto adicional.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  })

  if (!res.ok) return NextResponse.json({ error: 'Error de IA' }, { status: 502 })

  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
  const raw = data.choices?.[0]?.message?.content ?? ''

  try {
    const parsed = JSON.parse(raw) as { recipes: PetRecipe[] }
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Respuesta IA inválida' }, { status: 502 })
  }
}

function calcAge(birthDate: string): string {
  const months = Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
  return months < 12 ? `${months} meses` : `${Math.floor(months / 12)} años`
}
