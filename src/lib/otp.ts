import crypto from 'crypto'

const SECRET = process.env.OTP_SECRET ?? 'petfhans-otp-dev-secret'
const EXPIRY_MS = 15 * 60 * 1000

export function generateCode(): string {
  const bytes = crypto.randomBytes(3)
  const num = ((bytes[0] << 16) | (bytes[1] << 8) | bytes[2]) % 900000 + 100000
  return String(num)
}

function sign(data: string): string {
  return crypto.createHmac('sha256', SECRET).update(data).digest('hex')
}

export function createOtpToken(userId: string, email: string, name: string, code: string): string {
  const exp = Date.now() + EXPIRY_MS
  const hash = sign(`${code}:${email}:${exp}`)
  const payload = JSON.stringify({ userId, email, name, hash, exp })
  const b64 = Buffer.from(payload).toString('base64url')
  return `${b64}.${sign(b64)}`
}

export function verifyOtpToken(
  token: string,
  enteredCode: string
): { userId: string; email: string } | null {
  try {
    const dot = token.lastIndexOf('.')
    if (dot === -1) return null
    const b64 = token.slice(0, dot)
    const sig = token.slice(dot + 1)
    if (sign(b64) !== sig) return null
    const { userId, email, hash, exp } = JSON.parse(Buffer.from(b64, 'base64url').toString())
    if (Date.now() > exp) return null
    if (sign(`${enteredCode}:${email}:${exp}`) !== hash) return null
    return { userId, email }
  } catch {
    return null
  }
}

// Decodes token without checking expiry or code — for resend flow
export function decodeOtpToken(token: string): { userId: string; email: string; name: string } | null {
  try {
    const dot = token.lastIndexOf('.')
    if (dot === -1) return null
    const b64 = token.slice(0, dot)
    const sig = token.slice(dot + 1)
    if (sign(b64) !== sig) return null
    const { userId, email, name } = JSON.parse(Buffer.from(b64, 'base64url').toString())
    if (!userId || !email) return null
    return { userId, email, name: name ?? '' }
  } catch {
    return null
  }
}
