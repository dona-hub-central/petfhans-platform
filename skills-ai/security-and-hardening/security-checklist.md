# Security Checklist — Petfhans

Quick reference for web application security. Use alongside `skills-ai/security-and-hardening/SKILL.md`.

## Pre-Commit Checks

- [ ] No secrets in staged code (`git diff --cached | grep -iE "password|secret|api_key|token|sk_live"`)
- [ ] `.gitignore` covers: `.env.local`, `*.pem`, `*.key`
- [ ] `.env.local.example` uses placeholder values (not real secrets)

## Authentication & Authorization

- [ ] Every protected API route calls `supabase.auth.getUser()` and returns 401 if no user
- [ ] Every resource access scoped to `profile.clinic_id` (prevents IDOR)
- [ ] `createAdminClient()` only used in files without `'use client'`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` not referenced in any Client Component
- [ ] Superadmin endpoints verify `role === 'superadmin'` explicitly

## Input Validation

- [ ] All API route bodies validated with Zod schema at the top of the handler
- [ ] String lengths constrained (min/max)
- [ ] File uploads: type checked against allowlist, size < 50MB
- [ ] HTML output uses React auto-escaping (no `dangerouslySetInnerHTML` with unsanitized input)

## Environment Variables

- [ ] No `NEXT_PUBLIC_` prefix on: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`
- [ ] Every `process.env.*` usage has a null check with a descriptive error
- [ ] No hardcoded API keys, tokens, or passwords in source files

## Data Protection

- [ ] Error responses return generic messages (no stack traces, no Supabase error strings)
- [ ] Sensitive fields excluded from API responses
- [ ] AI routes have rate limiting (max requests per hour per user)

## OWASP Top 10 Quick Reference

| # | Vulnerability | Prevention |
|---|---|---|
| 1 | Broken Access Control | `.eq('clinic_id', userClinicId)` on every admin query |
| 2 | Cryptographic Failures | HTTPS, env vars for secrets, Supabase handles hashing |
| 3 | Injection | Supabase parameterizes automatically; validate with Zod |
| 4 | Insecure Design | Auth + ownership check on every API route |
| 5 | Security Misconfiguration | Never expose stack traces; check env vars on startup |
| 6 | Vulnerable Components | `npm audit` before releases |
| 7 | Auth Failures | Supabase Auth handles sessions; always verify server-side |
| 8 | Data Integrity Failures | Zod schema validation at boundaries |
| 9 | Logging Failures | Log errors server-side, never log passwords/tokens |
| 10 | SSRF | Validate URLs before fetch; no user-controlled redirect targets |
