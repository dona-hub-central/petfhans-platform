import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const clinic_id = searchParams.get('clinic_id')
  const date      = searchParams.get('date')
  if (!clinic_id || !date) return NextResponse.json({ slots: [] })

  const admin = createAdminClient()
  const dayOfWeek = new Date(date + 'T12:00:00').getDay()

  // Horario configurado para ese día
  const { data: schedules } = await admin.from('clinic_schedules')
    .select('*').eq('clinic_id', clinic_id).eq('day_of_week', dayOfWeek).eq('is_active', true)

  if (!schedules?.length) return NextResponse.json({ slots: [] })

  // Citas ya reservadas ese día
  const { data: booked } = await admin.from('appointments')
    .select('appointment_time').eq('clinic_id', clinic_id)
    .eq('appointment_date', date).in('status', ['pending', 'confirmed'])

  const bookedTimes = new Set(booked?.map(b => b.appointment_time.slice(0, 5)) ?? [])

  // Generar slots
  const slots: string[] = []
  for (const schedule of schedules) {
    const [sh, sm] = schedule.start_time.split(':').map(Number)
    const [eh, em] = schedule.end_time.split(':').map(Number)
    let current = sh * 60 + sm
    const end   = eh * 60 + em

    while (current + schedule.slot_duration <= end) {
      const h = Math.floor(current / 60).toString().padStart(2, '0')
      const m = (current % 60).toString().padStart(2, '0')
      const time = `${h}:${m}`
      if (!bookedTimes.has(time)) slots.push(time)
      current += schedule.slot_duration
    }
  }

  return NextResponse.json({ slots: slots.sort() })
}
