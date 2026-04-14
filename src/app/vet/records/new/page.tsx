'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import VetLayout from '@/components/shared/VetLayout'

// ── Tipos ──────────────────────────────────────────────────────────────
type Medication = { name: string; dose: string; route: string; frequency: string; duration: string }
type Vaccine    = { name: string; lot: string; next_date: string }
type PhysicalExam = {
  weight: string; temperature: string; heart_rate: string; respiratory_rate: string
  general_state: string; mucous: string; hydration: string; lymph_nodes: string
  cardiovascular: string; respiratory: string; digestive: string; musculoskeletal: string; skin: string; other: string
}

const VISIT_TYPES = [
  { value: 'consultation', label: '🩺 Consulta',       color: '#2563eb' },
  { value: 'emergency',    label: '🚨 Urgencia',        color: '#dc2626' },
  { value: 'surgery',      label: '🔪 Cirugía',         color: '#7c3aed' },
  { value: 'followup',     label: '🔄 Seguimiento',     color: '#0891b2' },
  { value: 'vaccination',  label: '💉 Vacunación',      color: '#16a34a' },
  { value: 'checkup',      label: '✅ Control',          color: '#d97706' },
]

const GENERAL_STATES   = ['Bueno', 'Regular', 'Malo', 'Crítico']
const MUCOUS_OPTIONS   = ['Normales', 'Pálidas', 'Ictéricas', 'Cianóticas', 'Congestionadas']
const HYDRATION_OPTIONS= ['Normal', 'Deshidratación leve (<5%)', 'Deshidratación moderada (5-8%)', 'Deshidratación grave (>8%)']
const ROUTES           = ['Oral', 'IV', 'IM', 'SC', 'Tópica', 'Oftálmica', 'Ótica']

const emptyExam: PhysicalExam = {
  weight: '', temperature: '', heart_rate: '', respiratory_rate: '',
  general_state: '', mucous: '', hydration: '', lymph_nodes: '',
  cardiovascular: '', respiratory: '', digestive: '', musculoskeletal: '', skin: '', other: '',
}

// ── Componentes auxiliares ─────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
        <span>{icon}</span>
        <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>
        {label}{required && <span style={{ color: 'var(--accent)' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

// ── Formulario principal ───────────────────────────────────────────────
function NewRecordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const petId = searchParams.get('pet')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pets, setPets] = useState<any[]>([])
  const [clinicName, setClinicName] = useState('')
  const [userName, setUserName] = useState('')

  const [form, setForm] = useState({
    pet_id:     petId ?? '',
    visit_date: new Date().toISOString().split('T')[0],
    visit_type: 'consultation',
    reason:     '',
    diagnosis:  '',
    prognosis:  '',
    treatment:  '',
    notes:      '',
    next_visit: '',
  })

  const [exam, setExam] = useState<PhysicalExam>(emptyExam)
  const [meds, setMeds] = useState<Medication[]>([])
  const [vaccines, setVaccines] = useState<Vaccine[]>([])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles')
        .select('id, clinic_id, full_name, clinics(name)').eq('user_id', user.id).single()
      const { data } = await supabase.from('pets')
        .select('id, name, species, breed, weight').eq('clinic_id', profile?.clinic_id).eq('is_active', true)
      setPets(data ?? [])
      setClinicName((profile as any)?.clinics?.name ?? '')
      setUserName(profile?.full_name ?? '')

      // Pre-cargar peso si hay mascota seleccionada
      if (petId && data) {
        const pet = data.find(p => p.id === petId)
        if (pet?.weight) setExam(e => ({ ...e, weight: String(pet.weight) }))
      }
    }
    load()
  }, [petId])

  const set  = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))
  const setE = (k: keyof PhysicalExam, v: string) => setExam(e => ({ ...e, [k]: v }))

  const addMed     = () => setMeds(m => [...m, { name: '', dose: '', route: 'Oral', frequency: '', duration: '' }])
  const updateMed  = (i: number, k: keyof Medication, v: string) => setMeds(m => m.map((x, idx) => idx === i ? { ...x, [k]: v } : x))
  const removeMed  = (i: number) => setMeds(m => m.filter((_, idx) => idx !== i))

  const addVaccine    = () => setVaccines(v => [...v, { name: '', lot: '', next_date: '' }])
  const updateVaccine = (i: number, k: keyof Vaccine, v: string) => setVaccines(vs => vs.map((x, idx) => idx === i ? { ...x, [k]: v } : x))
  const removeVaccine = (i: number) => setVaccines(v => v.filter((_, idx) => idx !== i))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('profiles')
      .select('id, clinic_id').eq('user_id', user.id).single()

    const { data: record, error: err } = await supabase.from('medical_records').insert({
      pet_id:       form.pet_id,
      clinic_id:    profile!.clinic_id,
      vet_id:       profile!.id,
      visit_date:   form.visit_date,
      visit_type:   form.visit_type,
      reason:       form.reason,
      diagnosis:    form.diagnosis || null,
      prognosis:    form.prognosis || null,
      treatment:    form.treatment || null,
      notes:        form.notes || null,
      next_visit:   form.next_visit || null,
      medications:  meds.filter(m => m.name),
      vaccines:     vaccines.filter(v => v.name),
      physical_exam: exam,
    }).select().single()

    if (err) { setError(err.message); setLoading(false); return }
    router.push(`/vet/records/${record.id}?created=true`)
  }

  const inp = "w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition"
  const inpS = { borderColor: 'var(--border)', color: 'var(--text)', background: '#fff' }
  const f = { onFocus: (e: any) => e.target.style.borderColor = 'var(--accent)', onBlur: (e: any) => e.target.style.borderColor = 'var(--border)' }
  const speciesIcon: Record<string, string> = { dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', other: '🐾' }

  const selectedPet = pets.find(p => p.id === form.pet_id)

  return (
    <VetLayout clinicName={clinicName} userName={userName}>
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <a href={form.pet_id ? `/vet/pets/${form.pet_id}` : '/vet/pets'}
              className="text-xs mb-1 inline-block" style={{ color: 'var(--muted)' }}>← Volver</a>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Nueva consulta</h1>
          </div>
          <button type="submit" disabled={loading}
            className="btn-pf px-6 py-2.5 text-sm font-semibold">
            {loading ? 'Guardando…' : '✓ Guardar consulta'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: '#fee2e2', color: '#dc2626' }}>{error}</div>
        )}

        <div className="space-y-4">

          {/* ── 1. IDENTIFICACIÓN ── */}
          <Section title="Identificación" icon="📋">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Field label="Paciente" required>
                <select value={form.pet_id} onChange={e => set('pet_id', e.target.value)} required className={inp} style={inpS}>
                  <option value="">Seleccionar mascota</option>
                  {pets.map(p => <option key={p.id} value={p.id}>{speciesIcon[p.species]} {p.name}</option>)}
                </select>
              </Field>
              <Field label="Fecha" required>
                <input type="date" value={form.visit_date} onChange={e => set('visit_date', e.target.value)} required className={inp} style={inpS} {...f} />
              </Field>
              <Field label="Próxima visita">
                <input type="date" value={form.next_visit} onChange={e => set('next_visit', e.target.value)} className={inp} style={inpS} {...f} />
              </Field>
            </div>

            {/* Tipo de visita */}
            <Field label="Tipo de consulta">
              <div className="flex gap-2 flex-wrap mt-1">
                {VISIT_TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => set('visit_type', t.value)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition"
                    style={{
                      background: form.visit_type === t.value ? t.color + '18' : '#fff',
                      borderColor: form.visit_type === t.value ? t.color : 'var(--border)',
                      color: form.visit_type === t.value ? t.color : 'var(--muted)',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </Field>
          </Section>

          {/* ── 2. EXPLORACIÓN FÍSICA ── */}
          <Section title="Exploración física" icon="🩺">
            {/* Constantes vitales */}
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--muted)' }}>Constantes vitales</p>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { k: 'weight',           label: 'Peso (kg)',   ph: selectedPet?.weight ? String(selectedPet.weight) : '0.0' },
                { k: 'temperature',      label: 'Temp. (°C)',  ph: '38.5' },
                { k: 'heart_rate',       label: 'FC (lpm)',    ph: '80' },
                { k: 'respiratory_rate', label: 'FR (rpm)',    ph: '20' },
              ].map(({ k, label, ph }) => (
                <Field key={k} label={label}>
                  <input type="number" step="0.1" value={(exam as any)[k]}
                    onChange={e => setE(k as keyof PhysicalExam, e.target.value)}
                    placeholder={ph} className={inp} style={inpS} {...f} />
                </Field>
              ))}
            </div>

            {/* Estado general */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Field label="Estado general">
                <select value={exam.general_state} onChange={e => setE('general_state', e.target.value)} className={inp} style={inpS}>
                  <option value="">—</option>
                  {GENERAL_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Mucosas">
                <select value={exam.mucous} onChange={e => setE('mucous', e.target.value)} className={inp} style={inpS}>
                  <option value="">—</option>
                  {MUCOUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Hidratación">
                <select value={exam.hydration} onChange={e => setE('hydration', e.target.value)} className={inp} style={inpS}>
                  <option value="">—</option>
                  {HYDRATION_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            {/* Exploración por sistemas */}
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--muted)' }}>Exploración por sistemas</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['cardiovascular',  'Cardiovascular'],
                ['respiratory',     'Respiratorio'],
                ['digestive',       'Digestivo'],
                ['musculoskeletal', 'Locomotor'],
                ['skin',            'Piel y anejos'],
                ['lymph_nodes',     'Nódulos linfáticos'],
              ].map(([k, label]) => (
                <div key={k}>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>{label}</label>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
                    {['Normal', 'Leve', 'Moderado', 'Grave', 'N/E'].map(opt => {
                      const colors: Record<string, string> = { Normal: '#16a34a', Leve: '#d97706', Moderado: '#ea580c', Grave: '#dc2626', 'N/E': '#64748b' }
                      const active = (exam as any)[k] === opt
                      return (
                        <button key={opt} type="button" onClick={() => setE(k as keyof PhysicalExam, active ? '' : opt)}
                          style={{
                            padding: '4px 10px', borderRadius: 20, border: 'none',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            background: active ? colors[opt] : '#f2f2f7',
                            color: active ? '#fff' : '#8e8e93',
                            transition: 'all .15s',
                          }}>{opt}</button>
                      )
                    })}
                  </div>
                </div>
              ))}
              <div className="col-span-2">
                <Field label="Observaciones adicionales">
                  <input value={exam.other} onChange={e => setE('other', e.target.value)}
                    placeholder="Otras observaciones…" className={inp} style={inpS} {...f} />
                </Field>
              </div>
            </div>
          </Section>

          {/* ── 3. ANAMNESIS Y DIAGNÓSTICO ── */}
          <Section title="Anamnesis y diagnóstico" icon="📝">
            <div className="space-y-3">
              <Field label="Motivo de consulta" required>
                <input value={form.reason} onChange={e => set('reason', e.target.value)} required
                  placeholder="Describe el motivo de la visita…" className={inp} style={inpS} {...f} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Diagnóstico">
                  <textarea value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)}
                    rows={3} placeholder="Diagnóstico principal…"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition resize-none"
                    style={inpS}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                </Field>
                <Field label="Pronóstico">
                  <textarea value={form.prognosis} onChange={e => set('prognosis', e.target.value)}
                    rows={3} placeholder="Pronóstico…"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition resize-none"
                    style={inpS}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                </Field>
              </div>
            </div>
          </Section>

          {/* ── 4. TRATAMIENTO ── */}
          <Section title="Plan terapéutico" icon="💊">
            <Field label="Tratamiento indicado">
              <textarea value={form.treatment} onChange={e => set('treatment', e.target.value)}
                rows={2} placeholder="Descripción del tratamiento…"
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition resize-none mb-4"
                style={inpS}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </Field>

            {/* Medicamentos */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Medicamentos</p>
              <button type="button" onClick={addMed}
                className="text-xs font-semibold px-3 py-1 rounded-lg"
                style={{ background: 'var(--accent-s)', color: 'var(--accent)' }}>
                + Añadir
              </button>
            </div>

            {meds.length === 0 && (
              <p className="text-xs text-center py-3" style={{ color: 'var(--muted)' }}>Sin medicamentos añadidos</p>
            )}

            {meds.map((med, i) => (
              <div key={i} className="rounded-xl border p-3 mb-2" style={{ borderColor: 'var(--border)' }}>
                <div className="grid grid-cols-5 gap-2 mb-2">
                  <div className="col-span-2">
                    <input value={med.name} onChange={e => updateMed(i, 'name', e.target.value)}
                      placeholder="Medicamento" className={inp} style={inpS} {...f} />
                  </div>
                  <input value={med.dose} onChange={e => updateMed(i, 'dose', e.target.value)}
                    placeholder="Dosis" className={inp} style={inpS} {...f} />
                  <select value={med.route} onChange={e => updateMed(i, 'route', e.target.value)} className={inp} style={inpS}>
                    {ROUTES.map(r => <option key={r}>{r}</option>)}
                  </select>
                  <button type="button" onClick={() => removeMed(i)}
                    className="text-xs rounded-xl border px-2"
                    style={{ borderColor: '#fecaca', color: '#dc2626', background: '#fee2e2' }}>
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={med.frequency} onChange={e => updateMed(i, 'frequency', e.target.value)}
                    placeholder="Frecuencia (ej: cada 12h)" className={inp} style={inpS} {...f} />
                  <input value={med.duration} onChange={e => updateMed(i, 'duration', e.target.value)}
                    placeholder="Duración (ej: 7 días)" className={inp} style={inpS} {...f} />
                </div>
              </div>
            ))}
          </Section>

          {/* ── 5. VACUNAS ── */}
          <Section title="Vacunación / Desparasitación" icon="💉">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Registra las vacunas o desparasitaciones administradas hoy</p>
              <button type="button" onClick={addVaccine}
                className="text-xs font-semibold px-3 py-1 rounded-lg flex-shrink-0"
                style={{ background: 'var(--accent-s)', color: 'var(--accent)' }}>
                + Añadir
              </button>
            </div>

            {vaccines.length === 0 && (
              <p className="text-xs text-center py-3" style={{ color: 'var(--muted)' }}>Ninguna vacuna en esta consulta</p>
            )}

            {vaccines.map((v, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 mb-2 items-center">
                <div className="col-span-2">
                  <input value={v.name} onChange={e => updateVaccine(i, 'name', e.target.value)}
                    placeholder="Nombre vacuna / producto" className={inp} style={inpS} {...f} />
                </div>
                <input value={v.lot} onChange={e => updateVaccine(i, 'lot', e.target.value)}
                  placeholder="Lote" className={inp} style={inpS} {...f} />
                <div className="flex gap-1 items-center">
                  <input type="date" value={v.next_date} onChange={e => updateVaccine(i, 'next_date', e.target.value)}
                    className={inp} style={inpS} {...f} title="Próxima dosis" />
                  <button type="button" onClick={() => removeVaccine(i)}
                    className="text-xs rounded-xl border px-2 py-2.5 flex-shrink-0"
                    style={{ borderColor: '#fecaca', color: '#dc2626', background: '#fee2e2' }}>✕</button>
                </div>
              </div>
            ))}
          </Section>

          {/* ── 6. NOTAS ── */}
          <Section title="Notas y observaciones" icon="📌">
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={3} placeholder="Observaciones adicionales, instrucciones para el dueño…"
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition resize-none"
              style={inpS}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          </Section>

          {/* ── GUARDAR ── */}
          <div className="flex gap-3 pb-8">
            <a href={form.pet_id ? `/vet/pets/${form.pet_id}` : '/vet/pets'}
              className="flex-1 py-3 text-sm font-semibold rounded-xl border text-center"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              Cancelar
            </a>
            <button type="submit" disabled={loading} className="btn-pf flex-2 px-8 py-3 text-sm">
              {loading ? 'Guardando…' : '✓ Guardar consulta'}
            </button>
          </div>

        </div>
      </form>
    </VetLayout>
  )
}

export default function NewRecordPage() {
  return <Suspense><NewRecordForm /></Suspense>
}
