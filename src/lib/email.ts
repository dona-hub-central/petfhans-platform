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
// Email: Verificación de cuenta (registro propio)
// =============================================
export async function sendVerificationEmail({
  to,
  name,
  verifyLink,
}: {
  to: string
  name: string
  verifyLink: string
}) {
  const firstName = name.split(' ')[0]
  const subject = `Verifica tu cuenta en Petfhans 🐾`

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
    .logo-icon { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #fff0ef; border-radius: 16px; }
    .logo-name { display: block; font-size: 20px; font-weight: 700; color: #1a1a1a; margin-top: 8px; }
    h1 { font-size: 22px; font-weight: 700; color: #1a1a1a; margin: 0 0 12px; }
    p { font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 20px; }
    .btn { display: block; text-align: center; background: #EE726D; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 15px; padding: 16px 32px; border-radius: 12px; margin: 28px 0; }
    .link-box { background: #f7f6f4; border-radius: 10px; padding: 12px 16px; font-size: 12px; color: #888; word-break: break-all; margin-bottom: 24px; }
    .footer { text-align: center; font-size: 12px; color: #aaa; margin-top: 32px; }
    .divider { border: none; border-top: 1px solid #ebebeb; margin: 28px 0; }
    .steps { list-style: none; padding: 0; margin: 0; }
    .steps li { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; font-size: 14px; color: #444; }
    .step-num { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; background: #EE726D; color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="logo">
        <span class="logo-icon"><img src="https://petfhans.com/logo-icon.svg" width="36" height="36" alt="" /></span>
        <span class="logo-name">Petfhans</span>
      </div>

      <h1>¡Hola, ${firstName}!</h1>
      <p>Gracias por registrarte en Petfhans. Para activar tu cuenta haz clic en el botón de abajo.</p>

      <a href="${verifyLink}" class="btn">Verificar mi cuenta →</a>

      <div style="background:#f7f6f4; border-radius:12px; padding:20px; margin-bottom:24px;">
        <p style="font-size:13px; font-weight:600; margin:0 0 12px; color:#1a1a1a;">¿Qué pasa después?</p>
        <ul class="steps">
          <li><span class="step-num">1</span>Verifica tu email con el botón de arriba</li>
          <li><span class="step-num">2</span>Agrega los datos de tu mascota (opcional)</li>
          <li><span class="step-num">3</span>Conecta con tu clínica veterinaria</li>
        </ul>
      </div>

      <hr class="divider">

      <p style="font-size:13px; color:#888;">Si el botón no funciona, copia este enlace en tu navegador:</p>
      <div class="link-box">${verifyLink}</div>

      <p style="font-size:12px; color:#aaa;">Si no creaste esta cuenta, puedes ignorar este email.</p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} Petfhans · Plataforma veterinaria</div>
  </div>
</body>
</html>`

  return resend.emails.send({ from: FROM, to, subject, html })
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
