import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import AvatarUpload from '@/components/shared/AvatarUpload'
import LogoutButton from '@/components/shared/LogoutButton'

export const metadata = { title: 'Mi perfil · Petfhans' }

export default async function OwnerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const { success, error } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles')
    .select('full_name, phone, avatar_url, clinics(name)')
    .eq('user_id', user.id).single()

  const clinicName = (profile as any)?.clinics?.name

  async function saveProfile(formData: FormData) {
    'use server'
    const full_name = (formData.get('full_name') as string).trim()
    const phone = (formData.get('phone') as string).trim()
    const sb = await createClient()
    const { data: { user: u } } = await sb.auth.getUser()
    if (!u) return
    await sb.from('profiles').update({ full_name, phone: phone || null }).eq('user_id', u.id)
    revalidatePath('/owner/profile')
    redirect('/owner/profile?success=profile')
  }

  async function changePassword(formData: FormData) {
    'use server'
    const current = formData.get('current_password') as string
    const next    = formData.get('new_password') as string
    const confirm = formData.get('confirm_password') as string
    if (!current || !next || !confirm) redirect('/owner/profile?error=fields')
    if (next !== confirm)              redirect('/owner/profile?error=match')
    if (next.length < 8)              redirect('/owner/profile?error=short')
    const sb = await createClient()
    const { data: { user: u } } = await sb.auth.getUser()
    if (!u) redirect('/auth/login')
    const { error: verifyErr } = await sb.auth.signInWithPassword({ email: u.email!, password: current })
    if (verifyErr) redirect('/owner/profile?error=wrong')
    const { error: updErr } = await sb.auth.updateUser({ password: next })
    if (updErr) redirect('/owner/profile?error=update')
    redirect('/owner/profile?success=password')
  }

  return (
    <>
      <style>{`
        html, body { margin:0; padding:0; background:#f2f2f7; font-family:var(--pf-font-body); }
        .prof { min-height:100svh; max-width:600px; margin:0 auto; }
        .prof-header { background:linear-gradient(160deg,#EE726D 0%,#f9a394 100%); padding:calc(env(safe-area-inset-top) + 20px) 20px 28px; }
        .prof-header-inner { display:flex; align-items:center; gap:4px; margin-bottom:20px; }
        .prof-back { color:rgba(255,255,255,.85); font-size:22px; text-decoration:none; line-height:1; padding:4px 8px 4px 0; }
        .prof-title { color:#fff; font-size:20px; font-weight:800; margin:0; font-family:var(--pf-font-display); }
        .prof-hero { display:flex; align-items:center; gap:16px; }
        .prof-name { color:#fff; font-size:22px; font-weight:700; margin:0 0 3px; font-family:var(--pf-font-display); }
        .prof-email { color:rgba(255,255,255,.75); font-size:13px; margin:0; }
        .prof-clinic { display:inline-flex; align-items:center; gap:5px; margin-top:6px; background:rgba(255,255,255,.2); color:#fff; font-size:11px; font-weight:600; padding:3px 10px; border-radius:20px; }
        .prof-body { padding:16px 16px calc(env(safe-area-inset-bottom) + 32px); }
        .card { background:#fff; border-radius:20px; padding:20px; margin-bottom:14px; box-shadow:0 1px 3px rgba(0,0,0,.06); }
        .card-title { font-size:14px; font-weight:700; color:#1c1c1e; margin:0 0 16px; }
        .field { margin-bottom:14px; }
        .field label { display:block; font-size:12px; font-weight:600; color:#8e8e93; margin-bottom:5px; text-transform:uppercase; letter-spacing:.4px; }
        .field input { width:100%; padding:11px 14px; border-radius:12px; border:1.5px solid #e5e5ea; font-size:16px; color:#1c1c1e; background:#fff; box-sizing:border-box; outline:none; font-family:inherit; }
        .field input:focus { border-color:#EE726D; }
        .field input:disabled { background:#f9f9f9; color:#8e8e93; }
        .btn-save { width:100%; padding:13px; border-radius:14px; background:#EE726D; color:#fff; font-size:15px; font-weight:700; border:none; cursor:pointer; font-family:inherit; }
        .alert { padding:12px 16px; border-radius:14px; margin-bottom:14px; display:flex; align-items:center; gap:10px; font-size:13px; font-weight:600; }
        .alert-ok  { background:#edfaf1; border:1px solid #b2f0c9; color:#1a7a3c; }
        .alert-err { background:#fef2f2; border:1px solid #fecaca; color:#dc2626; }
        @media(min-width:768px){
          .prof-header { background:none; padding:32px 0 0; }
          .prof-back { color:#EE726D; }
          .prof-title { color:#1c1c1e; font-size:24px; }
          .prof-hero { flex-direction:column; align-items:flex-start; }
          .prof-name { color:#1c1c1e; }
          .prof-email { color:#8e8e93; }
          .prof-clinic { background:#f2f2f7; color:#1c1c1e; }
          .prof-body { padding:20px 0 64px; }
        }
      `}</style>

      <div className="prof">
        <div className="prof-header">
          <div className="prof-header-inner">
            <Link href="/owner/dashboard" className="prof-back">←</Link>
            <h1 className="prof-title">Mi perfil</h1>
          </div>
          <div className="prof-hero">
            <AvatarUpload currentUrl={profile?.avatar_url} name={profile?.full_name} size={68} />
            <div>
              <p className="prof-name">{profile?.full_name ?? 'Sin nombre'}</p>
              <p className="prof-email">{user.email}</p>
              {clinicName && (
                <span className="prof-clinic">🏥 {clinicName}</span>
              )}
            </div>
          </div>
        </div>

        <div className="prof-body">
          {success === 'profile'  && <div className="alert alert-ok">✓ Perfil actualizado correctamente.</div>}
          {success === 'password' && <div className="alert alert-ok">✓ Contraseña cambiada correctamente.</div>}
          {error === 'match'  && <div className="alert alert-err">Las contraseñas no coinciden.</div>}
          {error === 'wrong'  && <div className="alert alert-err">Contraseña actual incorrecta.</div>}
          {error === 'short'  && <div className="alert alert-err">La contraseña debe tener mínimo 8 caracteres.</div>}
          {error === 'fields' && <div className="alert alert-err">Completa todos los campos.</div>}
          {error === 'update' && <div className="alert alert-err">No se pudo actualizar la contraseña.</div>}

          {/* Datos personales */}
          <div className="card">
            <p className="card-title">Datos personales</p>
            <form action={saveProfile}>
              <div className="field">
                <label>Correo electrónico</label>
                <input value={user.email ?? ''} readOnly disabled />
              </div>
              <div className="field">
                <label>Nombre completo</label>
                <input name="full_name" defaultValue={profile?.full_name ?? ''} required />
              </div>
              <div className="field">
                <label>Teléfono</label>
                <input name="phone" defaultValue={profile?.phone ?? ''} type="tel" placeholder="+34 600 000 000" />
              </div>
              <button type="submit" className="btn-save">Guardar cambios</button>
            </form>
          </div>

          {/* Cambiar contraseña */}
          <div className="card">
            <p className="card-title">Seguridad</p>
            <form action={changePassword}>
              <div className="field">
                <label>Contraseña actual</label>
                <input name="current_password" type="password" required />
              </div>
              <div className="field">
                <label>Nueva contraseña</label>
                <input name="new_password" type="password" required minLength={8} placeholder="mínimo 8 caracteres" />
              </div>
              <div className="field">
                <label>Confirmar contraseña</label>
                <input name="confirm_password" type="password" required minLength={8} />
              </div>
              <button type="submit" className="btn-save">Cambiar contraseña</button>
            </form>
          </div>

          {/* Cerrar sesión */}
          <LogoutButton variant="danger" />
        </div>
      </div>
    </>
  )
}
