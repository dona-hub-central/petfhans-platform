import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { message, pet_id, history = [] } = await req.json()

    const admin = createAdminClient()

    // Construir contexto del paciente si hay uno seleccionado
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
- Nombre: ${pet.name}
- Especie: ${pet.species} | Raza: ${pet.breed ?? 'N/D'}
- Edad: ${pet.birth_date ? calcAge(pet.birth_date) : 'N/D'}
- Peso: ${pet.weight ? `${pet.weight} kg` : 'N/D'}
- Sexo: ${pet.gender === 'male' ? 'Macho' : 'Hembra'} | Castrado: ${pet.neutered ? 'Sí' : 'No'}
- Microchip: ${pet.microchip ?? 'N/D'}
- Dueño: ${(pet.profiles as any)?.full_name ?? 'N/D'}
${pet.notes ? `- Notas: ${pet.notes}` : ''}

HISTORIAL MÉDICO (últimas ${records?.length ?? 0} consultas):
${records?.map(r => `
  📅 ${r.visit_date} — ${r.reason}
  Diagnóstico: ${r.diagnosis ?? 'N/D'}
  Tratamiento: ${r.treatment ?? 'N/D'}
  Medicamentos: ${Array.isArray(r.medications) && r.medications.length > 0
    ? r.medications.map((m: any) => `${m.name} ${m.dose} ${m.frequency}`).join(', ')
    : 'Ninguno'}
  ${r.notes ? `Notas: ${r.notes}` : ''}
`).join('\n') ?? 'Sin consultas previas'}
`
      }
    }

    const systemPrompt = `Eres un asistente de IA clínica veterinaria para la plataforma Petfhans.
Ayudas a veterinarios con análisis clínicos, diagnósticos diferenciales, protocolos de tratamiento y consultas médicas.
Responde siempre en español, de forma clara y profesional.
Basa tus respuestas en medicina veterinaria basada en evidencia.
Si no tienes certeza, recomienda consultar literatura especializada o un especialista.
IMPORTANTE: No reemplazas el criterio clínico del veterinario. Eres un apoyo de decisión.
${petContext ? `\n${petContext}` : '\nNo hay paciente seleccionado actualmente.'}`

    const messages = [
      ...history.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message }
    ]

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ reply })

  } catch (err: any) {
    console.error('AI error:', err)
    return NextResponse.json({
      reply: 'Lo siento, hubo un error al conectar con la IA. Verifica que la API key de Anthropic esté configurada.'
    })
  }
}

function calcAge(birthDate: string) {
  const months = Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
  return months < 12 ? `${months} meses` : `${Math.floor(months / 12)} años`
}
