---
name: code-review-and-quality
description: Multi-axis code review before merging. Use when reviewing code written by yourself, another agent, or a human. Five axes: correctness, readability, architecture, security, performance.
---

# Code Review and Quality

## Overview

Every change reviewed before merge — no exceptions. Approval standard: approve when the change definitively improves code health, even if not perfect.

## The Five-Axis Review

### 1. Correctness
- Matches spec/task requirements?
- Edge cases: null clinicId, empty arrays, 0 patients, expired invitations
- Error paths handled — not just happy path

### 2. Readability & Simplicity
- Names descriptive and consistent with the codebase?
- Could this be done in fewer lines? (898 inline styles where CSS classes exist is a failure)
- Abstractions earning their complexity?
- Dead code: unused variables, old token names (`var(--accent)`), `// TODO` without tickets

### 3. Architecture
- Server/Client Component boundary respected?
- `createAdminClient()` only in server-side files?
- `VetLayout` not manually imported in pages (should use `layout.tsx`)?
- No circular imports between `@/lib`, `@/components`, `@/app`?

### 4. Security (full detail: `skills-ai/security-and-hardening/SKILL.md`)
```
- [ ] createAdminClient() queries have .eq('clinic_id', userClinicId)
- [ ] API routes verify user before any data access
- [ ] No NEXT_PUBLIC_ on secret keys
- [ ] Input validated with Zod before Supabase
- [ ] Error responses are generic (no stack traces, no Supabase strings)
```

### 5. Performance (full detail: `skills-ai/performance-optimization/SKILL.md`)
```
- [ ] No N+1 Supabase queries (no loop calling .from() per item)
- [ ] createSignedUrls() not createSignedUrl() in a loop
- [ ] List queries have .range() pagination
- [ ] New img tags use next/image
```

## Comment Severity Labels

| Prefix | Meaning | Action |
|--------|---------|--------|
| *(none)* | Required | Must fix before merge |
| **Critical:** | Blocks merge | Security bug, data loss, broken auth |
| **Nit:** | Optional | Style preference |
| **Consider:** | Suggestion | Not required |
| **FYI** | Informational | No action needed |

## The Review Checklist

```markdown
### Correctness
- [ ] Matches requirements
- [ ] Edge cases handled (null, empty, 0)
- [ ] Error paths handled

### Readability
- [ ] Clear names, CSS vars not hardcoded hex
- [ ] No unnecessary complexity

### Architecture
- [ ] Server/Client boundary correct
- [ ] createAdminClient in server files only

### Security
- [ ] .eq('clinic_id') on admin queries
- [ ] Auth verified before data access
- [ ] No secrets in code

### Performance
- [ ] No N+1 Supabase
- [ ] Pagination on lists
- [ ] next/image for new img tags

### Verification
- [ ] npx tsc --noEmit passes
- [ ] npm run build succeeds

### Verdict: Approve / Request changes
```

## Dependency Discipline

Before adding any dependency:
1. Does existing stack solve this? (lucide-react, Tailwind, Supabase cover most needs)
2. Bundle size impact? (`npx @next/bundle-analyzer`)
3. Maintained? (last commit date, open issues)
4. `npm audit` — known vulnerabilities?

**Note:** `@anthropic-ai/sdk` is installed but unused — dead weight. Never add deps without a confirmed use.

## Honesty in Review

- Don't rubber-stamp. "LGTM" without evidence helps no one.
- AI code needs more scrutiny, not less. It's confident even when wrong.
- Quantify: "This N+1 adds ~80ms per pet" > "this could be slow".

## Red Flags

- PRs merged without review
- Security-sensitive changes without security review
- AI code accepted without checking IDOR / missing ownership scoping
- No regression test with a bug fix
- `var(--accent)` in new code (old token namespace)
