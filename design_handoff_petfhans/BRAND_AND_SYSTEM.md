# 🐾 Petfhans Design System

Veterinary SaaS platform. Multi-tenant (each clinic on its own subdomain), three very different user types, one coherent visual language.

## Product snapshot

**Petfhans** is a Spanish-language veterinary SaaS (🐾 — "Pet hands"). Clinics manage patients, consultations, appointments and AI clinical analysis; pet owners check on their animals from a mobile-first portal; a Petfhans super-admin team manages the whole fleet.

### Three product surfaces

| Route prefix | Who | Feeling |
|---|---|---|
| `/admin/*` | Petfhans internal team (superadmin) | Functional, data-dense, no-nonsense |
| `/vet/*`   | Clinic staff (vet_admin, veterinarian) | Fast, confident, Linear/Vercel-like |
| `/owner/*` | Pet parents, mostly mobile | Warm, playful, Duolingo/Day One-like |

Every screen must read: **"this was made with care."** The product feels *alive* — hover states, smooth transitions, animated counters, micro-feedback.

### Stack
- Next.js 16 + App Router · TypeScript · Tailwind CSS 4
- Supabase (Postgres + Auth + Storage) · Stripe · Resend
- Claude API for clinical AI ("Dr. Petfhans")
- Lucide icons (`lucide-react` 1.8.0)

### Modules / core routes

**Vet panel** — `/vet/dashboard`, `/vet/pets`, `/vet/pets/[id]`, `/vet/records`, `/vet/records/new`, `/vet/appointments`, `/vet/invitations`, `/vet/team`, `/vet/ai`, `/vet/billing`, `/vet/profile`, `/vet/settings`

**Owner portal** — `/owner/dashboard`, `/owner/pets/[id]` (tabs: Resumen / Historial / Citas / Fotos / Documentos), `/owner/profile`

**Super admin** — `/admin`, `/admin/clinics`, `/admin/subscriptions`, `/admin/plans`, `/admin/tiers`, `/admin/user-plans`, `/admin/stripe`, `/admin/agent`, `/admin/profile`

### Business model
Petfhans charges **clinics** (not owners or vets). Plans are based on `max_patients` and feature gates (AI on/off, etc). Trial = 50 patients. When a clinic nears its limit, `/vet/pets` surfaces a usage banner and "+ Nueva mascota" gets disabled → redirect to `/vet/billing`.

---

## Sources

This system was reverse-engineered from a shared repository the user attached.

- **Repo:** `dona-hub-central/petfhans-platform` (GitHub, default branch `main`)
- **Canonical design doc:** `DESIGN_SYSTEM.md` at repo root (~15KB) — THE source of truth
- **Product spec:** `PRODUCT.md` at repo root — routes, flows, business rules
- **Key component references:**
  - `src/components/shared/VetLayout.tsx` — sidebar (currently uses emoji, **must** migrate to SVG)
  - `src/components/owner/OwnerPetView.tsx` — mobile-first pet detail with hero + tabs
  - `src/app/vet/dashboard/page.tsx` — canonical dashboard layout
  - `src/app/globals.css` — current CSS variables (pre-redesign: still uses Roboto, `--accent` instead of `--pf-coral`)
- **Assets imported:** `public/favicon.svg` → `assets/logo-icon.svg`, `public/og-image.svg` → `assets/og-image.svg`

The repo is actively transitioning from Roboto + emoji icons to **Bricolage Grotesque + DM Sans + Lucide SVGs**; this design system represents the *target* state, not the currently-shipped one. Flag any old emoji-icon patterns as legacy.

---

## CONTENT FUNDAMENTALS

**Language:** Spanish throughout. Addresses user with **tú**, not usted — conversational, close, slightly warm. Titles are sentence case, never Title Case or ALL CAPS (except the `pf-label` micro-UI label, which is uppercase with letter-spacing for hierarchy only).

**Tone by surface:**
- **Vet panel** — direct, functional, no fluff. "Pacientes activos", "Nueva consulta", "Ver todas →". No exclamation marks. No emoji in copy (emoji were historically used as icons — migrate away).
- **Owner portal** — warm, reassuring, personal. Greetings use time of day ("¡Buenas tardes!"), always include the user's first name. Pet name is the largest element on screen. Health tips read like advice from a friend, not a product manual. CTA like "Agendar consulta" is written to feel simple and safe.
- **Super admin** — terse, data-first. Labels over sentences.

**Copy patterns to echo:**
- Greetings: `Hola, {firstName}` (no comma drama, followed by a muted subtitle like "Resumen de hoy")
- Empty states: never a bare sentence. Always **illustration/icon + one short line + action button**. e.g. "No hay consultas aún" with a "Registrar primera consulta" ghost button.
- Stat labels: plural noun, lowercase ("Pacientes activos", "Consultas registradas", "Invitaciones activas")
- Action card titles: verb + noun ("Nueva mascota", "Invitar dueño")
- Action card descriptions: 2–3 word fragments ("Registrar paciente", "Enviar link acceso")
- Date formatting: `es-ES` locale, short month. "24 abr" for lists, "lunes, 24 de abril" for hero context.
- Links / "see all": low-key coral text with `→` suffix ("Ver todas →")
- Dr. prefix: `Dr/a.` for inclusive gender ("Dr/a. Marta")

**Things to avoid:**
- ❌ Emoji **inside** prose (only survive in legacy components; strip them from new copy)
- ❌ Marketing exclamations ("¡Increíble!") outside the owner hero
- ❌ "Click here" / "aquí" as link text
- ❌ Bureaucratic full forms ("Por favor, haga clic para…") — keep it short, tú form

---

## VISUAL FOUNDATIONS

### Color philosophy
Single-accent system. **Coral `#EE726D` is sacred** — used only for primary CTAs, active nav, focus rings, key metrics. Never decoratively. Max **2 accent colors on one screen** (coral + one semantic).

Backgrounds are warm off-white (`#F7F6F4`) — not pure gray, not bright white. Cards are pure white to pop against the warm background. Nested surfaces step down one level to `#F2F1EF`.

**Purple (`#EEEDFE` / `#534AB7`) is reserved for AI features only** — the `/vet/ai` Dr. Petfhans chat, AI analysis badges. Never use purple decoratively.

### Typography
- **Bricolage Grotesque 700** — headings, stat numbers, hero copy, clinic name. Slight letter-spacing `-0.01em` at display sizes.
- **DM Sans 400 / 500 / 600** — everything else: body, nav labels, form elements, badges.
- **Minimum weight anywhere is 400**, never 300.
- Scale: 32 / 24 / 18 / 15 / 14 / 12 / 11. Micro-label (11px / 600) uses `letter-spacing: .07em` uppercase — the only uppercase typography in the system.
- Fonts are loaded from Google Fonts CDN (see top of `colors_and_type.css`).

### Backgrounds & imagery
- No full-bleed photography in chrome. The owner portal uses **one** hero photo per pet (full-bleed, slightly darkened for readable white text).
- No repeating patterns, no textures, no noise.
- **One gradient in the entire system:** the owner-portal mobile hero (`linear-gradient(170deg, #EE726D 0%, #f9a394 100%)`). Everything else is flat.
- No hand-drawn illustrations. Empty states get a simple SVG character/icon (Lucide style or custom minimal line art) — never a raw emoji standing alone.
- Pet photos appear prominently; imagery is warm but not filtered — natural light, no grain, no heavy duotone.

### Borders
- Default border: `0.5px solid #EBEBEB`. The **0.5px** matters — thinner than default 1px gives the refined SaaS feel. Honor this strictly.
- Emphasis border: `1px solid #D8D6D3` — only for focused/selected states.
- Coral border (`1.5–2px solid #EE726D`) appears only on ghost buttons and FAB-adjacent elements.

### Corner radii
- `6px` badges/pills · `10px` buttons and inputs · `14px` standard cards · `20px` large cards, modals · `28px` owner-portal pet cards and hero containers · `100px` pill badges.
- **Never** `border-radius: 4px` on cards — minimum for cards is 10px.

### Shadows
Shadows are minimal. Two patterns:
1. **Card hover:** `0 2px 16px rgba(238, 114, 109, 0.09)` — soft coral bloom combined with a border-color change to `--pf-coral-mid`.
2. **Focus ring:** `0 0 0 3px var(--pf-coral-soft)` on inputs/buttons.

Never `box-shadow: 0 4px 20px rgba(0,0,0,0.12)` — too heavy. Avoid inner shadows entirely.

### Motion
- All color/border transitions: `0.15s ease`. All transforms: `0.2s ease`. Nothing longer than `0.4s` in the main UI.
- Cards never `transform: scale()` on hover (layout shift). Scale-down on active press is `0.98`, buttons only.
- Stat cards stagger in on page load: `animation-delay: 0ms, 80ms, 160ms`.
- Number counters animate from 0 to final value on first render (useEffect + interval).
- Progress bars animate width from 0% via `@keyframes`.
- Loading state: 3 pulsing dots, never a spinner.

### Hover / press
- Buttons: primary darkens coral `→ --pf-coral-dark`; secondary background `→ --pf-surface`; ghost gets `--pf-coral-soft` fill. No outline change.
- Cards: border becomes `--pf-coral-mid`, add soft coral shadow. No background change, no scale.
- Nav items (inactive): background `→ --pf-surface`. Active: `--pf-coral-soft` fill + coral text + coral-stroked icon.
- Press: buttons `transform: scale(0.98)`; nothing else shrinks.

### Transparency & blur
- Mobile hero overlay uses `rgba(0,0,0,0.15)` for the tab bar over the coral gradient — the only routine transparency.
- Logout button on hero: `1.5px solid rgba(255,255,255,.5)` on transparent ground.
- No `backdrop-filter: blur()` anywhere in the system.

### Layout rules
- Vet sidebar: fixed, 220px, `z-index: 10`. Content offset `margin-left: 220px`, page padding `p-8`.
- Owner portal mobile: sticky CTA "Agendar consulta" at bottom. Tabs under hero.
- Owner portal desktop (≥768px): centered max-w 1100px, two-column grid `300px | 1fr` for pet detail.
- Spacing rhythm: multiples of 4px internal, 8px between components, 16–24px section padding, 32–48px page sections.
- Min tappable target on mobile: 44px. Buttons: 32–44px tall, never outside that range.

### Cards
A card is: white bg, `14px` radius, `0.5px #EBEBEB` border, `20px` padding. Interactive cards add the coral hover shadow. Stat cards always lead with a `36×36` coral-soft icon chip (`10px` radius), then big Bricolage number, then tiny muted label.

---

## Index — what's in this folder

| Path | What |
|---|---|
| `README.md` | You are here |
| `colors_and_type.css` | All design tokens — import this in every prototype |
| `SKILL.md` | Agent-skill manifest for cross-tool use |
| `assets/` | Logos, icons, OG image |
| `preview/` | Design-system tab cards (colors, type, spacing, components) |
| `ui_kits/vet/` | Vet panel UI kit — dashboard, pets, records, sidebar |
| `ui_kits/owner/` | Owner portal UI kit — mobile pet detail, dashboard |

---

## ICONOGRAPHY

**Library: Lucide** (already in `package.json` as `lucide-react`). Used everywhere — nav, buttons, empty states, card icons. **Never emoji as a nav icon** (the shipped VetLayout uses emoji; design-system state is Lucide SVG).

**Specs:**
- Stroke-based (not filled). Stroke-width `2` default; `1.75` for dense surfaces.
- Sizes: `16×16` in nav/sidebar, `18–20` in buttons, `22–28` in stat card chips, `32–36` in empty states.
- Color: `currentColor` — inherits from parent text color. Active nav: coral. Inactive nav: `--pf-muted`.

**In HTML prototypes:** load from the Lucide CDN:
```html
<script src="https://unpkg.com/lucide@latest"></script>
<i data-lucide="home"></i>  <!-- then lucide.createIcons() -->
```

**Nav icon mapping (canonical):**
| Route | Lucide |
|---|---|
| /vet/dashboard | `home` |
| /vet/appointments | `calendar` |
| /vet/pets | `paw-print` |
| /vet/records | `clipboard-list` |
| /vet/invitations | `mail` |
| /vet/ai | `sparkles` (purple tint — AI surface) |
| /vet/team | `users` |
| /vet/billing | `credit-card` |

**Emoji:** never for icons. Acceptable only inside user-generated content (a pet owner's note). The repo's legacy code still uses 🐾📅📋 as nav icons — this is explicitly marked "replace with SVG" in DESIGN_SYSTEM.md.

**Unicode chars:** the `›` chevron on mobile list rows and `→` in "Ver todas →" are intentional and stay.

**Logos / brand marks:**
- `assets/logo-icon.svg` — coral squircle with a 4-toe paw mark. This is *the* app icon (also the favicon). Do not restyle.
- `assets/og-image.svg` — social share card.
- No wordmark exists yet — pair the squircle icon with "Petfhans" in Bricolage Grotesque 700.
