import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import VetLayout from '@/components/shared/VetLayout'
import { PawPrint, User, XCircle, AlertTriangle } from 'lucide-react'

const speciesLabel: Record<string, string> = {
  dog: 'Perro', cat: 'Gato', bird: 'Ave', rabbit: 'Conejo', other: 'Otro'
}

export default async function PetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles')
    .select('*, clinics(name)').eq('user_id', user.id).single()

  const admin = createAdminClient()
  const [
    { data: pets },
    { data: clinic },
    { count: petCount },
  ] = await Promise.all([
    admin.from('pets')
      .select('*, profiles!pets_owner_id_fkey(full_name, email)')
      .eq('clinic_id', profile?.clinic_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    admin.from('clinics')
      .select('max_patients')
      .eq('id', profile?.clinic_id)
      .single(),
    admin.from('pets')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', profile?.clinic_id)
      .eq('is_active', true),
  ])

  const maxPats  = (clinic as { max_patients?: number } | null)?.max_patients ?? 0
  const count    = petCount ?? 0
  const atLimit  = maxPats > 0 && count >= maxPats
  const nearLimit = maxPats > 0 && count / maxPats >= 0.8 && !atLimit

  return (
    <VetLayout clinicName={(profile as { clinics?: { name: string } | null } | null)?.clinics?.name ?? ''} userName={profile?.full_name ?? ''}>

      {atLimit && (
        <div className="rounded-xl p-4 mb-4 flex items-center gap-3"
          style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <XCircle size={20} strokeWidth={2} style={{ color: '#dc2626', flexShrink: 0 }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#dc2626' }}>Límite de pacientes alcanzado ({count}/{maxPats})</p>
            <p className="text-xs mt-0.5" style={{ color: '#dc2626' }}>
              Mejora tu plan en <a href="/vet/billing" className="underline">Facturación</a> para registrar más pacientes.
            </p>
          </div>
        </div>
      )}

      {nearLimit && (
        <div className="rounded-xl p-4 mb-4 flex items-center gap-3"
          style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
          <AlertTriangle size={20} strokeWidth={2} style={{ color: '#d97706', flexShrink: 0 }} />
          <p className="text-sm" style={{ color: '#d97706' }}>
            Estás usando {count} de {maxPats} pacientes ({Math.round(count / maxPats * 100)}%).
            <a href="/vet/billing" className="underline ml-1">Ver plan →</a>
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--pf-ink)' }}>Mascotas</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--pf-muted)' }}>
            {count} pacientes activos{maxPats > 0 ? ` · máx ${maxPats}` : ''}
          </p>
        </div>
        {atLimit ? (
          <span className="px-5 py-2.5 text-sm rounded-xl font-medium cursor-not-allowed"
            style={{ background: 'var(--pf-bg)', color: 'var(--pf-muted)', border: '1px solid var(--pf-border)' }}>
            + Nueva mascota
          </span>
        ) : (
          <Link href="/vet/pets/new" className="btn-pf px-5 py-2.5 text-sm inline-flex items-center gap-2">
            + Nueva mascota
          </Link>
        )}
      </div>

      {pets && pets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pets.map((pet: any) => (
            <Link key={pet.id} href={`/vet/pets/${pet.id}`}
              className="bg-white rounded-2xl border p-5 hover:shadow-sm transition block"
              style={{ borderColor: 'var(--pf-border)' }}>
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)' }}>
                  <PawPrint size={24} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base truncate" style={{ color: 'var(--pf-ink)' }}>{pet.name}</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--pf-muted)' }}>
                    {speciesLabel[pet.species]}{pet.breed ? ` · ${pet.breed}` : ''}
                  </p>
                  {pet.birth_date && (
                    <p className="text-xs mt-1" style={{ color: 'var(--pf-muted)' }}>
                      {getAge(pet.birth_date)}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex items-center justify-between"
                style={{ borderColor: 'var(--pf-border)' }}>
                <div className="flex items-center gap-1.5">
                  <User size={12} strokeWidth={2} style={{ color: 'var(--pf-muted)' }} />
                  <span className="text-xs truncate max-w-[140px]" style={{ color: 'var(--pf-muted)' }}>
                    {pet.profiles?.full_name ?? 'Sin dueño asignado'}
                  </span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium`}
                  style={{ background: pet.neutered ? '#edfaf1' : 'var(--pf-bg)', color: pet.neutered ? '#1a7a3c' : 'var(--pf-muted)' }}>
                  {pet.gender === 'male' ? '♂' : '♀'}{pet.neutered ? ' · Castrado' : ''}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border p-16 text-center" style={{ borderColor: 'var(--pf-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: 'var(--pf-coral)' }}>
            <PawPrint size={44} strokeWidth={1.5} />
          </div>
          <p className="font-semibold" style={{ color: 'var(--pf-ink)' }}>No hay mascotas registradas</p>
          <p className="text-sm mt-1 mb-6" style={{ color: 'var(--pf-muted)' }}>Agrega el primer paciente de la clínica</p>
          <Link href="/vet/pets/new" className="btn-pf px-6 py-2.5 text-sm inline-block">
            + Nueva mascota
          </Link>
        </div>
      )}
    </VetLayout>
  )
}

function getAge(birthDate: string) {
  const birth = new Date(birthDate)
  const now = new Date()
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (months < 12) return `${months} meses`
  const years = Math.floor(months / 12)
  return `${years} año${years !== 1 ? 's' : ''}`
}
