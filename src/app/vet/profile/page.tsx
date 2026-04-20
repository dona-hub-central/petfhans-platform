import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import VetLayout from '@/components/shared/VetLayout'

export const metadata = { title: 'Mi perfil · Petfhans' }

export default async function VetProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const { success, error } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles')
    .select('*, clinics(name)').eq('user_id', user.id).single()

  async function saveProfile(formData: FormData) {
    'use server'
    const full_name = (formData.get('full_name') as string).trim()
    const phone = (formData.get('phone') as string).trim()
    const sb = await createClient()
    const { data: { user: u } } = await sb.auth.getUser()
    if (!u) return
    await sb.from('profiles').update({ full_name, phone: phone || null }).eq('user_id', u.id)
    revalidatePath('/vet/profile')
    redirect('/vet/profile?success=profile')
  }

  async function changePassword(formData: FormData) {
    'use server'
    const current = formData.get('current_password') as string
    const next    = formData.get('new_password') as string
    const confirm = formData.get('confirm_password') as string
    if (!current || !next || !confirm) redirect('/vet/profile?error=fields')
    if (next !== confirm) redirect('/vet/profile?error=match')
    if (next.length < 6) redirect('/vet/profile?error=short')
    const sb = await createClient()
    const { data: { user: u } } = await sb.auth.getUser()
    if (!u) redirect('/auth/login')
    const { error: verifyErr } = await sb.auth.signInWithPassword({ email: u.email!, password: current })
    if (verifyErr) redirect('/vet/profile?error=wrong')
    const { error: updErr } = await sb.auth.updateUser({ password: next })
    if (updErr) redirect('/vet/profile?error=update')
    redirect('/vet/profile?success=password')
  }

  const clinicName = (profile as { clinics?: { name: string } | null } | null)?.clinics?.name ?? ''
  const userName   = profile?.full_name ?? ''

  const inp = 'w-full rounded-xl border px-3 py-2.5 text-sm outline-none'
  const inpStyle = { borderColor: 'var(--border)', color: 'var(--text)' }

  return (
    <VetLayout clinicName={clinicName} userName={userName}>
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text)' }}>Mi perfil</h1>

        {success === 'profile'  && <Alert ok msg="Perfil actualizado correctamente." />}
        {success === 'password' && <Alert ok msg="Contraseña cambiada correctamente." />}
        {error === 'match'   && <Alert msg="Las contraseñas no coinciden." />}
        {error === 'wrong'   && <Alert msg="Contraseña actual incorrecta." />}
        {error === 'short'   && <Alert msg="La contraseña debe tener al menos 6 caracteres." />}
        {error === 'fields'  && <Alert msg="Completa todos los campos de contraseña." />}
        {error === 'update'  && <Alert msg="No se pudo actualizar la contraseña." />}

        {/* Datos personales */}
        <div className="bg-white rounded-2xl border p-6 mb-4" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Datos personales</h2>
          <form action={saveProfile} className="space-y-4">
            <Label text="Correo electrónico (solo lectura)">
              <input value={user.email ?? ''} readOnly disabled className={inp}
                style={{ ...inpStyle, background: 'var(--bg)', color: 'var(--muted)' }} />
            </Label>
            <Label text="Nombre completo">
              <input name="full_name" defaultValue={profile?.full_name ?? ''} required className={inp} style={inpStyle} />
            </Label>
            <Label text="Teléfono">
              <input name="phone" defaultValue={profile?.phone ?? ''} type="tel" className={inp} style={inpStyle} />
            </Label>
            <button type="submit" className="btn-pf px-5 py-2.5 text-sm">Guardar cambios</button>
          </form>
        </div>

        {/* Cambiar contraseña */}
        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Cambiar contraseña</h2>
          <form action={changePassword} className="space-y-4">
            <Label text="Contraseña actual">
              <input name="current_password" type="password" required className={inp} style={inpStyle} />
            </Label>
            <Label text="Nueva contraseña">
              <input name="new_password" type="password" required minLength={6} className={inp} style={inpStyle} />
            </Label>
            <Label text="Confirmar contraseña">
              <input name="confirm_password" type="password" required minLength={6} className={inp} style={inpStyle} />
            </Label>
            <button type="submit" className="btn-pf px-5 py-2.5 text-sm">Cambiar contraseña</button>
          </form>
        </div>
      </div>
    </VetLayout>
  )
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>{text}</label>
      {children}
    </div>
  )
}

function Alert({ ok, msg }: { ok?: boolean; msg: string }) {
  return (
    <div className="rounded-xl p-4 mb-4 flex items-center gap-3"
      style={{
        background: ok ? '#edfaf1' : '#fef2f2',
        border: `1px solid ${ok ? '#b2f0c9' : '#fecaca'}`,
      }}>
      <span>{ok ? '✅' : '❌'}</span>
      <p className="text-sm font-medium" style={{ color: ok ? '#1a7a3c' : '#dc2626' }}>{msg}</p>
    </div>
  )
}
