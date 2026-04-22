# Security Checklist Extendida — Petfhans

Complementa `skills-ai/security-and-hardening/security-checklist.md` con checks adicionales para las integraciones de Stripe, Resend, OAuth y scripts externos.

---

## Pre-Commit Checks

- [ ] `git diff --cached | grep -iE "password|secret|api_key|token|sk_live|sk_test|eyJ"` — sin secretos staged
- [ ] `.gitignore` cubre: `.env.local`, `*.pem`, `*.key`
- [ ] `.env.local.example` usa placeholders, no valores reales
- [ ] `npm audit --audit-level=high` — sin vulnerabilidades críticas/altas

---

## Authentication & Sessions

- [ ] Contraseñas hasheadas con bcrypt (≥12 rounds), scrypt o argon2 — Supabase Auth lo maneja
- [ ] Session cookies: `httpOnly`, `secure`, `sameSite: 'lax'`
- [ ] Expiración de sesión configurada (max-age razonable)
- [ ] Rate limiting en login endpoint (≤10 intentos por 15 minutos)
- [ ] Tokens de reset/invitación: limitados en tiempo (≤24h), de un solo uso
- [ ] `validate-invite`: rate limiting por IP (ver H-6 en `security-invitation-flow/SKILL.md`)

---

## Authorization — Petfhans Específico

- [ ] Todo endpoint protegido llama `supabase.auth.getUser()` y retorna 401 si no hay usuario
- [ ] Todo acceso a recursos incluye `.eq('clinic_id', profile.clinic_id)`
- [ ] `createAdminClient()` solo en archivos sin `'use client'`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` no referenciado en Client Components
- [ ] Endpoints de superadmin verifican `role === 'superadmin'` explícitamente
- [ ] `accept-invite`: email/role/clinic_id vienen de la BD, nunca del body
- [ ] `create-invitation`: role validado contra `ALLOWED_INVITATION_ROLES`

---

## Input Validation

- [ ] Todo body de API route validado con Zod al inicio del handler
- [ ] Longitudes de string limitadas (min/max)
- [ ] Uploads: tipo verificado contra allowlist, tamaño < 50MB
- [ ] HTML usa React auto-escaping (no `dangerouslySetInnerHTML` sin sanitizar)
- [ ] URLs validadas antes de redirect (prevenir open redirect)

---

## Third-Party: Stripe

- [ ] Webhooks de Stripe verificados con `stripe.webhooks.constructEvent(body, sig, secret)` — no confiar solo en el payload
- [ ] El `webhookSecret` viene de `process.env.STRIPE_WEBHOOK_SECRET`, no hardcodeado
- [ ] No procesar eventos de Stripe sin verificar la firma
- [ ] `STRIPE_SECRET_KEY` nunca en variables `NEXT_PUBLIC_*`

```typescript
// Ejemplo de verificación correcta
const event = stripe.webhooks.constructEvent(
  await req.text(),          // raw body — no parsear antes
  req.headers.get('stripe-signature')!,
  process.env.STRIPE_WEBHOOK_SECRET!
)
```

---

## Third-Party: OpenAI

- [ ] `OPENAI_API_KEY` en env var, nunca en código
- [ ] Rate limiting antes de llamar a OpenAI (ver C-3 en `security-invitation-flow/SKILL.md`)
- [ ] Respuestas de OpenAI validadas antes de usar en lógica de negocio
- [ ] No enviar datos médicos de múltiples clínicas en el mismo context
- [ ] El context de IA contiene solo datos de la clínica del usuario autenticado

---

## Third-Party: Resend

- [ ] `RESEND_API_KEY` en env var
- [ ] Templates de email no exponen IDs internos ni datos sensibles
- [ ] Links en emails usan dominio propio (no redirigir por dominios de terceros)
- [ ] `EMAIL_FROM` configurado con dominio verificado en Resend

---

## Security Headers (via Next.js)

Verificar en `next.config.ts`:

```typescript
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]
```

---

## OWASP Top 10 — Quick Reference Petfhans

| # | Vulnerabilidad | Prevención en Petfhans |
|---|---|---|
| 1 | Broken Access Control | `.eq('clinic_id', ...)` en todos los queries admin |
| 2 | Cryptographic Failures | HTTPS, env vars para secrets, Supabase maneja hashing |
| 3 | Injection | Supabase parametriza automáticamente; validar con Zod |
| 4 | Insecure Design | Auth + ownership check en cada API route |
| 5 | Security Misconfiguration | No exponer stack traces; verificar env vars al startup |
| 6 | Vulnerable Components | `npm audit` antes de releases |
| 7 | Auth Failures | Supabase Auth maneja sesiones; siempre verificar server-side |
| 8 | Data Integrity Failures | Validar Stripe webhooks con firma; validar respuestas OpenAI |
| 9 | Logging Failures | Loguear errores server-side, nunca passwords/tokens |
| 10 | SSRF | Validar URLs antes de fetch; no permitir redirect a dominios externos |
