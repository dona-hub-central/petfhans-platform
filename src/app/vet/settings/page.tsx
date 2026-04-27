import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { CSSProperties, ReactNode } from 'react'
import { Settings, Globe, MapPin, Phone, Clock, Tag, PawPrint, CheckCircle, XCircle, Store } from 'lucide-react'
import type { ClinicPublicProfile, PetSpecies } from '@/types'

export const metadata = { title: 'Configuración · Petfhans' }

const SPECIES_OPTIONS: { value: PetSpecies; label: string }[] = [
  { value: 'dog',    label: 'Perros' },
  { value: 'cat',    label: 'Gatos' },
  { value: 'bird',   label: 'Aves' },
  { value: 'rabbit', label: 'Conejos' },
  { value: 'other',  label: 'Otros' },
]

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const { success, error } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, clinic_id')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'vet_admin') redirect('/vet/dashboard')
  if (!profile.clinic_id) redirect('/vet/dashboard')

  const { data: clinic } = await admin
    .from('clinics')
    .select('id, name, slug, public_profile')
    .eq('id', profile.clinic_id)
    .single()

  if (!clinic) redirect('/vet/dashboard')

  const pp = (clinic.public_profile ?? {}) as ClinicPublicProfile

  async function saveBasic(formData: FormData) {
    'use server'
    const sb = await createClient()
    const { data: { user: u } } = await sb.auth.getUser()
    if (!u) redirect('/auth/login')

    const adm = createAdminClient()
    const { data: p } = await adm.from('profiles').select('role, clinic_id').eq('user_id', u.id).single()
    if (!p || p.role !== 'vet_admin' || !p.clinic_id) redirect('/vet/dashboard')

    const name = ((formData.get('name') as string) ?? '').trim()
    if (!name) redirect('/vet/settings?error=name')

    const slug = ((formData.get('slug') as string) ?? '')
      .trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    if (!slug) redirect('/vet/settings?error=slug')

    // Check slug uniqueness (excluding own clinic)
    const { data: existing } = await adm
      .from('clinics').select('id').eq('slug', slug).neq('id', p.clinic_id).maybeSingle()
    if (existing) redirect('/vet/settings?error=slug_taken')

    const { error: updErr } = await adm
      .from('clinics').update({ name, slug }).eq('id', p.clinic_id)
    if (updErr) redirect('/vet/settings?error=save')

    revalidatePath('/vet', 'layout')
    redirect('/vet/settings?success=basic')
  }

  async function savePublicProfile(formData: FormData) {
    'use server'
    const sb = await createClient()
    const { data: { user: u } } = await sb.auth.getUser()
    if (!u) redirect('/auth/login')

    const adm = createAdminClient()
    const { data: p } = await adm.from('profiles').select('role, clinic_id').eq('user_id', u.id).single()
    if (!p || p.role !== 'vet_admin' || !p.clinic_id) redirect('/vet/dashboard')

    const { data: current } = await adm.from('clinics').select('public_profile').eq('id', p.clinic_id).single()
    const prev = (current?.public_profile ?? {}) as ClinicPublicProfile

    const description = ((formData.get('description') as string) ?? '').trim() || undefined
    const city        = ((formData.get('city') as string) ?? '').trim() || undefined
    const address     = ((formData.get('address') as string) ?? '').trim() || undefined
    const phone       = ((formData.get('phone') as string) ?? '').trim() || undefined
    const hours       = ((formData.get('hours') as string) ?? '').trim() || undefined

    const specialtiesRaw = ((formData.get('specialties') as string) ?? '').trim()
    const specialties = specialtiesRaw
      ? specialtiesRaw.split(',').map(s => s.trim()).filter(Boolean)
      : undefined

    const speciesSelected = (formData.getAll('species') as string[]).filter(Boolean)
    const species = speciesSelected.length > 0 ? (speciesSelected as PetSpecies[]) : undefined

    const updated: ClinicPublicProfile = {
      ...prev,
      ...(description !== undefined && { description }),
      ...(city !== undefined && { city }),
      ...(address !== undefined && { address }),
      ...(phone !== undefined && { phone }),
      ...(hours !== undefined && { hours }),
      ...(specialties !== undefined && { specialties }),
      ...(species !== undefined && { species }),
    }

    // Remove keys that were explicitly cleared
    if (!description) delete updated.description
    if (!city) delete updated.city
    if (!address) delete updated.address
    if (!phone) delete updated.phone
    if (!hours) delete updated.hours
    if (!specialtiesRaw) delete updated.specialties
    if (speciesSelected.length === 0) delete updated.species

    const { error: updErr } = await adm
      .from('clinics').update({ public_profile: updated }).eq('id', p.clinic_id)
    if (updErr) redirect('/vet/settings?error=save')

    revalidatePath('/vet', 'layout')
    redirect('/vet/settings?success=profile')
  }

  const inp = 'w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-offset-0'
  const inpStyle = { borderColor: 'var(--pf-border)', color: 'var(--pf-ink)', '--tw-ring-color': 'var(--pf-coral-mid)' } as CSSProperties

  return (
    <div>
      {/* Alerts */}
      {(success || error) && (
        <div className="mb-4">
          {success === 'basic'   && <Alert ok msg="Datos de la clínica actualizados." />}
          {success === 'profile' && <Alert ok msg="Perfil público actualizado. Ya visible en el marketplace." />}
          {error === 'name'       && <Alert msg="El nombre de la clínica no puede estar vacío." />}
          {error === 'slug'       && <Alert msg="El slug no puede estar vacío." />}
          {error === 'slug_taken' && <Alert msg="Ese slug ya está en uso por otra clínica." />}
          {error === 'save'       && <Alert msg="No se pudo guardar. Inténtalo de nuevo." />}
        </div>
      )}

      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--pf-r-sm)',
            background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Settings size={18} strokeWidth={2} />
          </div>
          <div>
            <h1 style={{ font: 'var(--pf-text-h1)', margin: 0, color: 'var(--pf-ink)' }}>Configuración</h1>
            <p style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-muted)', margin: '2px 0 0' }}>
              Datos de la clínica y perfil visible en el marketplace
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Col izquierda: datos básicos ── */}
        <div className="space-y-4">
          <section className="bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--pf-border)' }}>
            <h2 className="font-semibold text-sm mb-4 flex items-center gap-1.5" style={{ color: 'var(--pf-ink)' }}>
              <Globe size={14} strokeWidth={2} style={{ color: 'var(--pf-coral)' }} />
              Datos de la clínica
            </h2>
            <form action={saveBasic} className="space-y-4">
              <Label text="Nombre de la clínica">
                <input
                  name="name"
                  defaultValue={clinic.name}
                  required
                  className={inp}
                  style={inpStyle}
                  placeholder="Clínica Veterinaria Ejemplo"
                />
              </Label>
              <Label text="Slug (URL)">
                <div className="relative">
                  <input
                    name="slug"
                    defaultValue={clinic.slug}
                    required
                    className={inp}
                    style={{ ...inpStyle, paddingLeft: '8.5rem' }}
                    placeholder="mi-clinica"
                  />
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none select-none"
                    style={{ color: 'var(--pf-muted)' }}
                  >
                    petfhans.com/
                  </span>
                </div>
              </Label>
              <button type="submit" className="btn-pf px-5 py-2.5 text-sm">Guardar datos</button>
            </form>
          </section>
        </div>

        {/* ── Col derecha: perfil público ── */}
        <div className="space-y-4">
          <section className="bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--pf-border)' }}>
            <h2 className="font-semibold text-sm mb-1 flex items-center gap-1.5" style={{ color: 'var(--pf-ink)' }}>
              <Store size={14} strokeWidth={2} style={{ color: 'var(--pf-coral)' }} />
              Perfil en el marketplace
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--pf-muted)' }}>
              Esta información aparece en tu página pública cuando los dueños buscan clínicas.
            </p>
            <form action={savePublicProfile} className="space-y-4">
              <Label text="Descripción">
                <textarea
                  name="description"
                  defaultValue={pp.description ?? ''}
                  rows={3}
                  className={inp}
                  style={{ ...inpStyle, resize: 'vertical' }}
                  placeholder="Cuéntanos sobre tu clínica, equipo y valores…"
                />
              </Label>

              <div className="grid grid-cols-2 gap-3">
                <Label text="Ciudad">
                  <div className="relative">
                    <MapPin size={13} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--pf-muted)' }} />
                    <input
                      name="city"
                      defaultValue={pp.city ?? ''}
                      className={inp}
                      style={{ ...inpStyle, paddingLeft: '2rem' }}
                      placeholder="Barcelona"
                    />
                  </div>
                </Label>
                <Label text="Teléfono">
                  <div className="relative">
                    <Phone size={13} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--pf-muted)' }} />
                    <input
                      name="phone"
                      type="tel"
                      defaultValue={pp.phone ?? ''}
                      className={inp}
                      style={{ ...inpStyle, paddingLeft: '2rem' }}
                      placeholder="+34 600 000 000"
                    />
                  </div>
                </Label>
              </div>

              <Label text="Dirección">
                <input
                  name="address"
                  defaultValue={pp.address ?? ''}
                  className={inp}
                  style={inpStyle}
                  placeholder="Calle Mayor 1, Local 3"
                />
              </Label>

              <Label text="Horario">
                <div className="relative">
                  <Clock size={13} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--pf-muted)' }} />
                  <input
                    name="hours"
                    defaultValue={pp.hours ?? ''}
                    className={inp}
                    style={{ ...inpStyle, paddingLeft: '2rem' }}
                    placeholder="Lun–Vie 9:00–20:00 · Sáb 10:00–14:00"
                  />
                </div>
              </Label>

              <Label text="Especialidades (separadas por coma)">
                <div className="relative">
                  <Tag size={13} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--pf-muted)' }} />
                  <input
                    name="specialties"
                    defaultValue={(pp.specialties ?? []).join(', ')}
                    className={inp}
                    style={{ ...inpStyle, paddingLeft: '2rem' }}
                    placeholder="Cirugía, Dermatología, Oftalmología"
                  />
                </div>
              </Label>

              <div>
                <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--pf-ink)' }}>
                  <PawPrint size={13} strokeWidth={2} style={{ color: 'var(--pf-coral)' }} />
                  Especies que atienden
                </p>
                <div className="flex flex-wrap gap-2">
                  {SPECIES_OPTIONS.map(({ value, label }) => {
                    const checked = (pp.species ?? []).includes(value)
                    return (
                      <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          name="species"
                          value={value}
                          defaultChecked={checked}
                          style={{ accentColor: 'var(--pf-coral)', width: 14, height: 14 }}
                        />
                        <span className="text-sm" style={{ color: 'var(--pf-ink)' }}>{label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <button type="submit" className="btn-pf px-5 py-2.5 text-sm">Guardar perfil</button>
            </form>
          </section>
        </div>

      </div>
    </div>
  )
}

function Label({ text, children }: { text: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--pf-muted)' }}>{text}</label>
      {children}
    </div>
  )
}

function Alert({ ok, msg }: { ok?: boolean; msg: string }) {
  const Icon = ok ? CheckCircle : XCircle
  return (
    <div className="rounded-xl p-4 flex items-center gap-3"
      style={{ background: ok ? '#edfaf1' : '#fef2f2', border: `1px solid ${ok ? '#b2f0c9' : '#fecaca'}` }}>
      <Icon size={16} strokeWidth={2} style={{ color: ok ? '#1a7a3c' : '#dc2626', flexShrink: 0 }} />
      <p className="text-sm font-medium" style={{ color: ok ? '#1a7a3c' : '#dc2626' }}>{msg}</p>
    </div>
  )
}
