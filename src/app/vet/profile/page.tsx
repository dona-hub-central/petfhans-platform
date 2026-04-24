import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { CheckCircle, XCircle, Users, CreditCard, Mail, Calendar, Building2, Shield } from 'lucide-react'
import AvatarUpload from '@/components/shared/AvatarUpload'
import LogoutButton from '@/components/shared/LogoutButton'

export const metadata = { title: 'Mi perfil · Petfhans' }

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  vet_admin:    { label: 'Admin de clínica',  color: '#7c3aed', bg: '#f5f3ff' },
  veterinarian: { label: 'Veterinario/a',     color: '#0891b2', bg: '#ecfeff' },
  superadmin:   { label: 'Super Admin',       color: '#dc2626', bg: '#fef2f2' },
}

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
    .select('role, full_name, phone, avatar_url, clinics(name, slug, subscription_plan)')
    .eq('user_id', user.id).single()

  const isVetAdmin = profile?.role === 'vet_admin'
  type ProfileRow = { role: string; full_name: string | null; phone: string | null; avatar_url: string | null; clinics: { name: string; slug: string; subscription_plan: string } | null }
  const clinic = (profile as ProfileRow | null)?.clinics
  const roleTag = ROLE_LABELS[profile?.role ?? '']

  async function saveProfile(formData: FormData) {
    'use server'
    const full_name = ((formData.get('full_name') as string) ?? '').trim()
    const phone = ((formData.get('phone') as string) ?? '').trim()
    const sb = await createClient()
    const { data: { user: u } } = await sb.auth.getUser()
    if (!u) redirect('/auth/login')
    const { error: updateErr } = await sb.from('profiles').update({ full_name, phone: phone || null }).eq('user_id', u.id)
    if (updateErr) redirect('/vet/profile?error=save')
    revalidatePath('/vet/profile')
    redirect('/vet/profile?success=profile')
  }

  async function changePassword(formData: FormData) {
    'use server'
    const current = formData.get('current_password') as string
    const next    = formData.get('new_password') as string
    const confirm = formData.get('confirm_password') as string
    if (!current || !next || !confirm) redirect('/vet/profile?error=fields')
    if (next !== confirm)              redirect('/vet/profile?error=match')
    if (next.length < 8)              redirect('/vet/profile?error=short')
    const sb = await createClient()
    const { data: { user: u } } = await sb.auth.getUser()
    if (!u) redirect('/auth/login')
    const { error: verifyErr } = await sb.auth.signInWithPassword({ email: u.email!, password: current })
    if (verifyErr) redirect('/vet/profile?error=wrong')
    const { error: updErr } = await sb.auth.updateUser({ password: next })
    if (updErr) redirect('/vet/profile?error=update')
    redirect('/vet/profile?success=password')
  }

  const inp = 'w-full rounded-xl border px-3 py-2.5 text-sm outline-none'
  const inpStyle = { borderColor: 'var(--pf-border)', color: 'var(--pf-ink)' }

  return (
    <div>

      {/* Alertas */}
      {(success || error) && (
        <div className="mb-4">
          {success === 'profile'  && <Alert ok msg="Perfil actualizado correctamente." />}
          {success === 'password' && <Alert ok msg="Contraseña cambiada correctamente." />}
          {error === 'match'  && <Alert msg="Las contraseñas no coinciden." />}
          {error === 'wrong'  && <Alert msg="Contraseña actual incorrecta." />}
          {error === 'short'  && <Alert msg="La contraseña debe tener mínimo 8 caracteres." />}
          {error === 'fields' && <Alert msg="Completa todos los campos." />}
          {error === 'update' && <Alert msg="No se pudo actualizar la contraseña." />}
          {error === 'save'   && <Alert msg="No se pudo guardar el perfil. Inténtalo de nuevo." />}
        </div>
      )}

      {/* Cabecera de perfil — ancho completo */}
      <div className="bg-white rounded-2xl border p-6 mb-4 flex items-center gap-5 flex-wrap"
        style={{ borderColor: 'var(--pf-border)' }}>
        <AvatarUpload currentUrl={profile?.avatar_url} name={profile?.full_name} size={72} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate" style={{ color: 'var(--pf-ink)' }}>
            {profile?.full_name ?? 'Sin nombre'}
          </h1>
          <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--pf-muted)' }}>{user.email}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {roleTag && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: roleTag.bg, color: roleTag.color }}>
                {roleTag.label}
              </span>
            )}
            {clinic?.name && (
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--pf-muted)' }}>
                <Building2 size={11} strokeWidth={2} />
                {clinic.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grid de dos columnas en desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Columna izquierda: datos personales + gestión (vet_admin) */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--pf-border)' }}>
            <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--pf-ink)' }}>Datos personales</h2>
            <form action={saveProfile} className="space-y-4">
              <Label text="Correo electrónico">
                <input value={user.email ?? ''} readOnly disabled className={inp}
                  style={{ ...inpStyle, background: 'var(--pf-bg)', color: 'var(--pf-muted)' }} />
              </Label>
              <Label text="Nombre completo">
                <input name="full_name" defaultValue={profile?.full_name ?? ''} required className={inp} style={inpStyle} />
              </Label>
              <Label text="Teléfono">
                <input name="phone" defaultValue={profile?.phone ?? ''} type="tel" className={inp} style={inpStyle} placeholder="+34 600 000 000" />
              </Label>
              <button type="submit" className="btn-pf px-5 py-2.5 text-sm">Guardar cambios</button>
            </form>
          </div>

          {/* Gestión de clínica — solo vet_admin */}
          {isVetAdmin && (
            <div className="bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--pf-border)' }}>
              <h2 className="font-semibold text-sm mb-4 flex items-center gap-1.5" style={{ color: 'var(--pf-ink)' }}>
                <Building2 size={14} strokeWidth={2} /> Gestión de clínica
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { href: '/vet/team',                  Icon: Users,      label: 'Equipo' },
                  { href: '/vet/billing',               Icon: CreditCard, label: 'Facturación' },
                  { href: '/vet/invitations',           Icon: Mail,       label: 'Invitaciones' },
                  { href: '/vet/appointments/schedule', Icon: Calendar,   label: 'Horario' },
                ].map(({ href, Icon, label }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-2.5 p-3 rounded-xl transition hover:bg-gray-50"
                    style={{ color: 'var(--pf-ink)', textDecoration: 'none', border: '1px solid var(--pf-border)' }}>
                    <Icon size={15} strokeWidth={1.75} style={{ color: 'var(--pf-coral)', flexShrink: 0 }} />
                    <span className="text-sm font-medium">{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Columna derecha: seguridad + logout */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--pf-border)' }}>
            <h2 className="font-semibold text-sm mb-4 flex items-center gap-1.5" style={{ color: 'var(--pf-ink)' }}>
              <Shield size={14} strokeWidth={2} /> Seguridad
            </h2>
            <form action={changePassword} className="space-y-4">
              <Label text="Contraseña actual">
                <input name="current_password" type="password" required className={inp} style={inpStyle} />
              </Label>
              <Label text="Nueva contraseña">
                <input name="new_password" type="password" required minLength={8} className={inp} style={inpStyle} placeholder="mínimo 8 caracteres" />
              </Label>
              <Label text="Confirmar contraseña">
                <input name="confirm_password" type="password" required minLength={8} className={inp} style={inpStyle} />
              </Label>
              <button type="submit" className="btn-pf px-5 py-2.5 text-sm">Cambiar contraseña</button>
            </form>
          </div>

          <LogoutButton variant="danger" />
        </div>

      </div>
    </div>
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
  const Icon = ok ? CheckCircle : XCircle
  return (
    <div className="rounded-xl p-4 mb-4 flex items-center gap-3"
      style={{ background: ok ? '#edfaf1' : '#fef2f2', border: `1px solid ${ok ? '#b2f0c9' : '#fecaca'}` }}>
      <Icon size={16} strokeWidth={2} style={{ color: ok ? '#1a7a3c' : '#dc2626', flexShrink: 0 }} />
      <p className="text-sm font-medium" style={{ color: ok ? '#1a7a3c' : '#dc2626' }}>{msg}</p>
    </div>
  )
}
