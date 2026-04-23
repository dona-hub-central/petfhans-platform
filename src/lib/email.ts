import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'Petfhans <onboarding@resend.dev>'

// =============================================
// Email: Invitación a dueño de mascota
// =============================================
export async function sendInvitationEmail({
  to,
  clinicName,
  petName,
  role,
  inviteLink,
  expiresAt,
}: {
  to: string
  clinicName: string
  petName?: string
  role: string
  inviteLink: string
  expiresAt: string
}) {
  const roleLabel: Record<string, string> = {
    pet_owner:    'dueño de mascota',
    veterinarian: 'veterinario',
    vet_admin:    'administrador',
  }

  const subject = petName
    ? `${clinicName} te invita a ver el perfil de ${petName} 🐾`
    : `${clinicName} te invita a unirte como ${roleLabel[role] ?? role}`

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background: #f7f6f4; font-family: 'Helvetica Neue', Arial, sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; padding: 0 20px; }
    .card { background: #ffffff; border-radius: 16px; padding: 40px; border: 1px solid #ebebeb; }
    .logo { text-align: center; margin-bottom: 32px; }
    .logo-icon { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #fff0ef; border-radius: 16px; font-size: 28px; }
    .logo-name { display: block; font-size: 20px; font-weight: 700; color: #1a1a1a; margin-top: 8px; }
    h1 { font-size: 22px; font-weight: 700; color: #1a1a1a; margin: 0 0 12px; }
    p { font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 20px; }
    .pet-badge { display: inline-block; background: #fff0ef; color: #EE726D; font-size: 13px; font-weight: 600; padding: 6px 14px; border-radius: 20px; margin-bottom: 24px; }
    .btn { display: block; text-align: center; background: #EE726D; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 15px; padding: 16px 32px; border-radius: 12px; margin: 28px 0; }
    .btn:hover { background: #e05e59; }
    .link-box { background: #f7f6f4; border-radius: 10px; padding: 12px 16px; font-size: 12px; color: #888; word-break: break-all; margin-bottom: 24px; }
    .footer { text-align: center; font-size: 12px; color: #aaa; margin-top: 32px; }
    .divider { border: none; border-top: 1px solid #ebebeb; margin: 28px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="logo">
        <span class="logo-icon">🐾</span>
        <span class="logo-name">Petfhans</span>
      </div>

      <h1>¡Te han invitado a Petfhans!</h1>
      <p><strong>${clinicName}</strong> te ha enviado una invitación para acceder a la plataforma veterinaria.</p>

      ${petName ? `<span class="pet-badge">🐾 ${petName}</span>` : ''}

      <p>Con tu acceso podrás:</p>
      <ul style="color:#555; font-size:15px; line-height:2;">
        ${role === 'pet_owner' ? `
          <li>Ver el historial médico de tu mascota</li>
          <li>Registrar hábitos de alimentación y ejercicio</li>
          <li>Recibir recordatorios de próximas visitas</li>
        ` : `
          <li>Gestionar fichas y consultas clínicas</li>
          <li>Acceder al historial médico de pacientes</li>
          <li>Usar la IA clínica para análisis de casos</li>
        `}
      </ul>

      <a href="${inviteLink}" class="btn">Aceptar invitación →</a>

      <hr class="divider">

      <p style="font-size:13px; color:#888;">Si el botón no funciona, copia este link:</p>
      <div class="link-box">${inviteLink}</div>

      <p style="font-size:12px; color:#aaa;">
        Este link expira el ${new Date(expiresAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.
      </p>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} Petfhans · Plataforma veterinaria
    </div>
  </div>
</body>
</html>`

  return resend.emails.send({ from: FROM, to, subject, html })
}

// =============================================
// Email: Código OTP de verificación (registro propio)
// =============================================
export async function sendOtpEmail({
  to,
  name,
  code,
}: {
  to: string
  name: string
  code: string
}) {
  const firstName = name ? name.split(' ')[0] : 'Hola'

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background: #f7f6f4; font-family: 'Helvetica Neue', Arial, sans-serif; }
    .wrapper { max-width: 480px; margin: 40px auto; padding: 0 20px; }
    .card { background: #ffffff; border-radius: 16px; padding: 40px; border: 1px solid #ebebeb; }
    .logo { text-align: center; margin-bottom: 28px; }
    .logo-name { font-size: 20px; font-weight: 700; color: #1a1a1a; }
    h1 { font-size: 20px; font-weight: 700; color: #1a1a1a; margin: 0 0 8px; }
    p { font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 16px; }
    .code-box { text-align: center; background: #fff0ef; border-radius: 16px; padding: 28px 20px; margin: 24px 0; }
    .code { font-size: 48px; font-weight: 800; letter-spacing: 10px; color: #EE726D; font-family: 'Courier New', monospace; display: block; }
    .code-label { font-size: 12px; color: #aaa; margin-top: 8px; }
    .footer { text-align: center; font-size: 12px; color: #aaa; margin-top: 28px; }
    .divider { border: none; border-top: 1px solid #ebebeb; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="logo">
        <span style="font-size:32px;">🐾</span>
        <span class="logo-name" style="display:block; margin-top:4px;">Petfhans</span>
      </div>

      <h1>¡Hola, ${firstName}!</h1>
      <p>Usa este código para verificar tu cuenta. Es válido por <strong>15 minutos</strong>.</p>

      <div class="code-box">
        <span class="code">${code}</span>
        <p class="code-label">Código de verificación · válido 15 min</p>
      </div>

      <hr class="divider">
      <p style="font-size:13px; color:#aaa;">Si no creaste esta cuenta en Petfhans, ignora este email.</p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} Petfhans · Plataforma veterinaria</div>
  </div>
</body>
</html>`

  return resend.emails.send({
    from: FROM,
    to,
    subject: `${code} es tu código de Petfhans`,
    html,
  })
}

// =============================================
// Email: Bienvenida (invitación aceptada)
// =============================================
export async function sendWelcomeEmail({
  to,
  name,
  clinicName,
  loginUrl,
}: {
  to: string
  name: string
  clinicName: string
  loginUrl: string
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `¡Bienvenido/a a ${clinicName}! 🐾`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; background: #f7f6f4; font-family: Arial, sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; padding: 0 20px; }
    .card { background: #fff; border-radius: 16px; padding: 40px; border: 1px solid #ebebeb; }
    h1 { color: #1a1a1a; font-size: 22px; }
    p { color: #555; font-size: 15px; line-height: 1.6; }
    .btn { display: block; text-align: center; background: #EE726D; color: #fff !important; text-decoration: none; font-weight: 700; padding: 16px; border-radius: 12px; margin: 28px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div style="text-align:center; margin-bottom:24px; font-size:40px;">🎉</div>
      <h1>¡Hola ${name}!</h1>
      <p>Ya eres parte de <strong>${clinicName}</strong> en Petfhans. Tu cuenta está lista.</p>
      <a href="${loginUrl}" class="btn">Ir a mi cuenta →</a>
      <p style="font-size:13px; color:#aaa;">Si no esperabas este email, ignóralo.</p>
    </div>
  </div>
</body>
</html>`,
  })
}
