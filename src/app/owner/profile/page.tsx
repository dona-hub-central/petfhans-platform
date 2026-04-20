import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

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
    .select('full_name, phone').eq('user_id', user.id).single()

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
    if (next !== confirm) redirect('/owner/profile?error=match')
    if (next.length < 6) redirect('/owner/profile?error=short')
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
        .prof { min-height:100svh; }
        .prof-header { background:linear-gradient(135deg,#EE726D 0%,#f9a394 100%); padding:48px 18px 24px; display:flex; align-items:center; gap:12px; }
        .prof-back { color:rgba(255,255,255,.85); font-size:22px; text-decoration:none; line-height:1; }
        .prof-title { color:#fff; font-size:22px; font-weight:800; margin:0; }
        .prof-body { padding:16px 14px 48px; }
        .card { background:#fff; border-radius:20px; padding:20px; margin-bottom:14px; box-shadow:0 1px 3px rgba(0,0,0,.06); }
        .card-title { font-size:15px; font-weight:700; color:#1c1c1e; margin:0 0 16px; }
        .field { margin-bottom:14px; }
        .field label { display:block; font-size:12px; font-weight:600; color:#8e8e93; margin-bottom:5px; }
        .field input { width:100%; padding:11px 14px; border-radius:12px; border:1.5px solid #e5e5ea; font-size:14px; color:#1c1c1e; background:#fff; box-sizing:border-box; outline:none; }
        .field input:focus { border-color:#EE726D; }
        .field input:disabled { background:#f9f9f9; color:#8e8e93; }
        .btn-save { width:100%; padding:13px; border-radius:14px; background:#EE726D; color:#fff; font-size:15px; font-weight:700; border:none; cursor:pointer; }
        .alert { padding:12px 16px; border-radius:14px; margin-bottom:14px; display:flex; align-items:center; gap:10px; font-size:13px; font-weight:600; }
        .alert-ok { background:#edfaf1; border:1px solid #b2f0c9; color:#1a7a3c; }
        .alert-err { background:#fef2f2; border:1px solid #fecaca; color:#dc2626; }
        @media(min-width:768px){
          .prof { max-width:600px; margin:0 auto; }
          .prof-header { background:none; padding:32px 0 0; }
          .prof-back { color:#EE726D; }
          .prof-title { color:#1c1c1e; font-size:26px; }
          .prof-body { padding:20px 0 48px; }
        }
      `}</style>

      <div className="prof">
        <div className="prof-header">
          <Link href="/owner/dashboard" className="prof-back">←</Link>
          <h1 className="prof-title">Mi perfil</h1>
        </div>

        <div className="prof-body">
          {success === 'profile'  && <div className="alert alert-ok">✅ Perfil actualizado correctamente.</div>}
          {success === 'password' && <div className="alert alert-ok">✅ Contraseña cambiada correctamente.</div>}
          {error === 'match'   && <div className="alert alert-err">❌ Las contraseñas no coinciden.</div>}
          {error === 'wrong'   && <div className="alert alert-err">❌ Contraseña actual incorrecta.</div>}
          {error === 'short'   && <div className="alert alert-err">❌ La contraseña debe tener al menos 6 caracteres.</div>}
          {error === 'fields'  && <div className="alert alert-err">❌ Completa todos los campos de contraseña.</div>}
          {error === 'update'  && <div className="alert alert-err">❌ No se pudo actualizar la contraseña.</div>}

          {/* Datos personales */}
          <div className="card">
            <p className="card-title">Datos personales</p>
            <form action={saveProfile}>
              <div className="field">
                <label>Correo electrónico (solo lectura)</label>
                <input value={user.email ?? ''} readOnly disabled />
              </div>
              <div className="field">
                <label>Nombre completo</label>
                <input name="full_name" defaultValue={profile?.full_name ?? ''} required />
              </div>
              <div className="field">
                <label>Teléfono</label>
                <input name="phone" defaultValue={profile?.phone ?? ''} type="tel" />
              </div>
              <button type="submit" className="btn-save">Guardar cambios</button>
            </form>
          </div>

          {/* Cambiar contraseña */}
          <div className="card">
            <p className="card-title">Cambiar contraseña</p>
            <form action={changePassword}>
              <div className="field">
                <label>Contraseña actual</label>
                <input name="current_password" type="password" required />
              </div>
              <div className="field">
                <label>Nueva contraseña</label>
                <input name="new_password" type="password" required minLength={6} />
              </div>
              <div className="field">
                <label>Confirmar contraseña</label>
                <input name="confirm_password" type="password" required minLength={6} />
              </div>
              <button type="submit" className="btn-save">Cambiar contraseña</button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
