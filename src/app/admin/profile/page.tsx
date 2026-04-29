import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import AdminLayout from '@/components/admin/AdminLayout'

export const metadata = { title: 'Mi perfil · Petfhans Admin' }

export default async function AdminProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const { success, error } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles')
    .select('role, full_name, phone').eq('user_id', user.id).single()
  if (profile?.role !== 'superadmin') redirect('/auth/login')

  async function saveProfile(formData: FormData) {
    'use server'
    const full_name = (formData.get('full_name') as string).trim()
    const phone = (formData.get('phone') as string).trim()
    const sb = await createClient()
    const { data: { user: u } } = await sb.auth.getUser()
    if (!u) return
    const adminSb = createAdminClient()
    await adminSb.from('profiles').update({ full_name, phone: phone || null }).eq('user_id', u.id)
    revalidatePath('/admin/profile')
    redirect('/admin/profile?success=profile')
  }

  async function changePassword(formData: FormData) {
    'use server'
    const current = formData.get('current_password') as string
    const next    = formData.get('new_password') as string
    const confirm = formData.get('confirm_password') as string
    if (!current || !next || !confirm) redirect('/admin/profile?error=fields')
    if (next !== confirm) redirect('/admin/profile?error=match')
    if (next.length < 6) redirect('/admin/profile?error=short')
    const sb = await createClient()
    const { data: { user: u } } = await sb.auth.getUser()
    if (!u) redirect('/auth/login')
    const { error: verifyErr } = await sb.auth.signInWithPassword({ email: u.email!, password: current })
    if (verifyErr) redirect('/admin/profile?error=wrong')
    const { error: updErr } = await sb.auth.updateUser({ password: next })
    if (updErr) redirect('/admin/profile?error=update')
    redirect('/admin/profile?success=password')
  }

  const userName = profile?.full_name ?? 'Admin'
  const inp = 'w-full rounded-xl border px-3 py-2.5 text-sm outline-none'
  const inpStyle = { borderColor: 'var(--pf-border)', color: 'var(--pf-ink)' }

  return (
    <AdminLayout userName={userName}>
      <div className="adm-pg" style={{ maxWidth: 560 }}>
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--pf-ink)' }}>Mi perfil</h1>

        {success === 'profile'  && <Alert ok msg="Perfil actualizado correctamente." />}
        {success === 'password' && <Alert ok msg="Contraseña cambiada correctamente." />}
        {error === 'match'   && <Alert msg="Las contraseñas no coinciden." />}
        {error === 'wrong'   && <Alert msg="Contraseña actual incorrecta." />}
        {error === 'short'   && <Alert msg="La contraseña debe tener al menos 6 caracteres." />}
        {error === 'fields'  && <Alert msg="Completa todos los campos de contraseña." />}
        {error === 'update'  && <Alert msg="No se pudo actualizar la contraseña." />}

        {/* Datos personales */}
        <div className="bg-white rounded-2xl border p-6 mb-4" style={{ borderColor: 'var(--pf-border)' }}>
          <h2 className="font-semibold mb-4" style={{ color: 'var(--pf-ink)' }}>Datos personales</h2>
          <form action={saveProfile} className="space-y-4">
            <Label text="Correo electrónico (solo lectura)">
              <input value={user.email ?? ''} readOnly disabled className={inp}
                style={{ ...inpStyle, background: 'var(--pf-bg)', color: 'var(--pf-muted)' }} />
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
        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--pf-border)' }}>
          <h2 className="font-semibold mb-4" style={{ color: 'var(--pf-ink)' }}>Cambiar contraseña</h2>
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
    </AdminLayout>
  )
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--pf-muted)' }}>{text}</label>
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
