import { Resend } from 'resend'

const FROM = process.env.EMAIL_FROM ?? 'Petfhans <onboarding@resend.dev>'
const SUPPORT_TO = process.env.SUPPORT_EMAIL ?? 'soporte@petfhans.com'

function resend() {
  return new Resend(process.env.RESEND_API_KEY)
}

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

  return resend().emails.send({ from: FROM, to, subject, html })
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

  return resend().emails.send({
    from: FROM,
    to,
    subject: `${code} es tu código de Petfhans`,
    html,
  })
}

// =============================================
// Email: Bienvenida (invitación aceptada)
// =============================================
// =============================================
// Email: Notificación a soporte de nueva solicitud
// =============================================
export async function sendSupportRequestEmail({
  type,
  subject,
  message,
  fromName,
  fromEmail,
  contactPhone,
  clinicName,
}: {
  type: 'clinic_creation' | 'general'
  subject: string
  message: string
  fromName: string
  fromEmail: string
  contactPhone?: string
  clinicName?: string
}) {
  const typeLabel = type === 'clinic_creation'
    ? 'Solicitud de creación de clínica + vet_admin'
    : 'Consulta general'

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;background:#f7f6f4;font-family:Arial,sans-serif;padding:40px 20px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #ebebeb;padding:32px;">
    <h1 style="font-size:18px;color:#1a1a1a;margin:0 0 4px;">Nueva solicitud de soporte</h1>
    <p style="font-size:13px;color:#888;margin:0 0 20px;">${typeLabel}</p>

    <div style="background:#fff0ef;border-radius:12px;padding:16px 18px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#666;">De</p>
      <p style="margin:2px 0 0;font-size:15px;color:#1a1a1a;font-weight:600;">${fromName}</p>
      <p style="margin:2px 0 0;font-size:13px;color:#666;">${fromEmail}${contactPhone ? ` · ${contactPhone}` : ''}</p>
      ${clinicName ? `<p style="margin:8px 0 0;font-size:13px;color:#666;">Clínica propuesta: <strong>${clinicName}</strong></p>` : ''}
    </div>

    <p style="font-size:13px;color:#888;margin:0 0 4px;">Asunto</p>
    <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:0 0 16px;">${subject}</p>

    <p style="font-size:13px;color:#888;margin:0 0 4px;">Mensaje</p>
    <p style="font-size:14px;color:#333;line-height:1.6;margin:0;white-space:pre-wrap;">${message}</p>

    <hr style="border:none;border-top:1px solid #ebebeb;margin:24px 0;">
    <p style="font-size:12px;color:#aaa;margin:0;">Revisa esta solicitud en el panel de admin.</p>
  </div>
</body>
</html>`

  return resend().emails.send({
    from: FROM,
    to: SUPPORT_TO,
    replyTo: fromEmail,
    subject: `[Soporte] ${typeLabel}: ${subject}`,
    html,
  })
}

// =============================================
// Email: Confirmación al usuario que envió la solicitud
// =============================================
export async function sendSupportRequestConfirmationEmail({
  to,
  name,
  type,
}: {
  to: string
  name: string
  type: 'clinic_creation' | 'general'
}) {
  const firstName = name ? name.split(' ')[0] : 'Hola'
  const isClinic = type === 'clinic_creation'

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;background:#f7f6f4;font-family:Arial,sans-serif;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #ebebeb;padding:36px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:36px;">📨</span>
      <p style="font-size:16px;font-weight:700;color:#1a1a1a;margin:8px 0 0;">Petfhans</p>
    </div>

    <h1 style="font-size:20px;color:#1a1a1a;margin:0 0 12px;">¡Hola, ${firstName}!</h1>
    <p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 16px;">
      Recibimos tu solicitud de ${isClinic ? '<strong>creación de clínica y asignación como administrador veterinario</strong>' : 'soporte'}.
    </p>
    ${isClinic ? `
    <p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 16px;">
      Para proteger a los dueños y mascotas, nuestro equipo verifica cada clínica y veterinario antes de activar la cuenta. Te contactaremos por email en las próximas 48 horas para validar la documentación.
    </p>` : `
    <p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 16px;">
      Te responderemos lo antes posible al email asociado a tu cuenta.
    </p>`}
    <p style="font-size:13px;color:#888;margin:16px 0 0;">Gracias por confiar en Petfhans.</p>
  </div>
</body>
</html>`

  return resend().emails.send({
    from: FROM,
    to,
    subject: isClinic
      ? 'Recibimos tu solicitud de verificación de clínica'
      : 'Recibimos tu consulta de soporte',
    html,
  })
}

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
  return resend().emails.send({
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
