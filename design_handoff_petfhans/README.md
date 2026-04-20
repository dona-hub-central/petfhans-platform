# Handoff: Petfhans Design System Migration

## Overview

Apply the new Petfhans design system to the existing `dona-hub-central/petfhans-platform` Next.js 16 repo. The target is to migrate the shipped product from its current state (Roboto + emoji nav icons + `--accent` color vars) to the approved system (Bricolage Grotesque + DM Sans, Lucide SVG icons, `--pf-*` token namespace).

## About the design files

The files in this bundle are **design references created as HTML/JSX prototypes**, not code to copy verbatim. Your task is to **recreate the visual/behavioral intent inside the existing Next.js 16 + TypeScript + Tailwind CSS 4 codebase**, using its established patterns (App Router, server components, Tailwind utilities, `lucide-react`).

Specifically:
- `colors_and_type.css` **IS** meant to replace `src/app/globals.css` directly (tokens + utility classes). This one file is production-ready.
- Everything under `ui_kits/` is JSX *for display in a standalone HTML harness* — translate the structure and styling into real `.tsx` files inside `src/components/` and `src/app/`. Don't copy the `Object.assign(window, …)` plumbing.

## Fidelity

**High-fidelity.** All colors, radii, typography, spacing and hover states in this handoff are final. Match them pixel-for-pixel. If you find a conflict between this bundle and the repo's own `DESIGN_SYSTEM.md`, prefer this bundle — it's the resolved target.

---

## Migration plan (do in this order, one PR each)

### PR 1 — Tokens & fonts
1. Replace `src/app/globals.css` with `colors_and_type.css` from this bundle.
2. Remove the Roboto import. Bricolage Grotesque + DM Sans come from Google Fonts at the top of the new file.
3. In `src/app/layout.tsx`: make sure `<body>` has no hardcoded `font-family`; it inherits from globals now.
4. **Do a find-and-replace across `src/`:**
   | Find | Replace |
   |---|---|
   | `var(--accent-s)` | `var(--pf-coral-soft)` |
   | `var(--accent-h)` | `var(--pf-coral-dark)` |
   | `var(--accent)` | `var(--pf-coral)` |
   | `var(--text)` | `var(--pf-ink)` |
   | `var(--muted)` | `var(--pf-muted)` |
   | `var(--border)` | `var(--pf-border)` |
   | `var(--bg)` | `var(--pf-bg)` |
   | `var(--white)` | `var(--pf-white)` |
   | `'Roboto'` | *(delete)* |
   | `font-family: 'Roboto', sans-serif;` | *(delete; inherit)* |
5. Old utility classes `.btn-pf`, `.bg-pf-*`, `.text-pf-*` — grep for them and migrate to `.pf-btn .pf-btn-primary` etc.

**Smoke test:** app compiles, pages load, colors look the same or very close (coral is identical; now using DM Sans for body).

### PR 2 — Sidebar (`src/components/shared/VetLayout.tsx`)
Reference: `ui_kits/vet/VetSidebar.jsx`. Key changes:
- Width 224 → **220px** (both the `<aside>` and the `ml-*` offset on `<main>`).
- Emoji → Lucide icons (package is already a dependency):
  ```tsx
  import { Home, Calendar, PawPrint, ClipboardList, Mail, Sparkles, Users, CreditCard } from 'lucide-react'
  const nav = [
    { href:'/vet/dashboard',    Icon: Home,          label:'Inicio' },
    { href:'/vet/appointments', Icon: Calendar,      label:'Citas' },
    { href:'/vet/pets',         Icon: PawPrint,      label:'Mascotas' },
    { href:'/vet/records',      Icon: ClipboardList, label:'Consultas' },
    { href:'/vet/invitations',  Icon: Mail,          label:'Invitaciones' },
    { href:'/vet/ai',           Icon: Sparkles,      label:'IA Clínica', tint:'purple' },
    { href:'/vet/team',         Icon: Users,         label:'Equipo' },
    { href:'/vet/billing',      Icon: CreditCard,    label:'Facturación' },
  ]
  ```
- Icon size: `<Icon size={16} strokeWidth={2} />`.
- Active state: `background: var(--pf-coral-soft); color: var(--pf-coral);` — the AI item gets `var(--pf-info)` / `var(--pf-info-fg)` instead (purple is reserved for AI).
- Inactive: `color: var(--pf-muted)`. Hover inactive: `background: var(--pf-surface)`.
- Logo block: 32×32 coral squircle (radius 10) with the paw SVG (use `assets/logo-icon.svg`), then "Petfhans" in Bricolage 700 13px + clinic name in DM Sans 11px muted.
- Usage bar styling already matches; just replace `--accent` vars.

### PR 3 — Vet dashboard (`src/app/vet/dashboard/page.tsx`)
Reference: `ui_kits/vet/VetDashboard.jsx`.
- Greeting: `Hola, {firstName}` in `font: var(--pf-text-display)` (32/700 Bricolage, letter-spacing -0.01em). Remove the `👋` emoji.
- Subtitle: today's date in `es-ES` locale long form, `textTransform: capitalize`.
- **Stat cards**: 3-up grid. Each card has a 36×36 tinted icon chip (radius 10), 26px Bricolage number, 12px muted label. Use Lucide `PawPrint`, `ClipboardCheck`, `Mail`. Stagger animation: 0 / 80 / 160ms with `@keyframes fadeUp`.
- **Quick actions**: 4-up grid, card structure = icon chip + title (`var(--pf-text-h3)`) + muted desc. Hover: border → `var(--pf-coral-mid)`, `box-shadow: 0 2px 16px rgba(238,114,109,.09)`. AI card uses purple tint.
- **Recent records list**: white card with 14px radius, row = species glyph chip + name + reason + date + chevron. Replace the inline emoji fallback with small species SVGs when you have them; until then, keeping 🐶🐱🐰 inside rows is acceptable because it's data, not chrome.

### PR 4 — Owner pet view (`src/components/owner/OwnerPetView.tsx`)
Reference: `ui_kits/owner/OwnerPetView.jsx`. The existing component is close; mainly:
- Gradient stays: `linear-gradient(170deg,#EE726D 0%,#f9a394 100%)` — this is the ONE gradient in the system.
- Pet name: Bricolage Grotesque 700, 28–30px white.
- Tab bar icons: convert from emoji to inline Lucide SVGs (`PawPrint`, `Calendar`, `Camera`, `FileText`, `ClipboardList`).
- Next-visit pill and record date pills: `var(--pf-coral-soft)` / `var(--pf-coral-dark)` pair.
- Sticky bottom CTA "Agendar consulta" stays.

### PR 5+ — Remaining pages
Order of user frequency (per `DESIGN_SYSTEM.md`): `/vet/pets` (list + new) → `/vet/records/new` → `/vet/appointments` → `/vet/ai` (apply purple theme) → `/vet/billing` → `/owner/dashboard` → `/admin/*`.

Apply the same primitives everywhere: stat cards, list rows, ghost/secondary buttons, coral focus ring on inputs, 0.5px borders, badges.

---

## Design tokens (reference)

All tokens live in `colors_and_type.css`. Quick cheat sheet:

```
Coral       #EE726D    --pf-coral       CTAs, active nav, focus
Coral-dark  #C9504B    --pf-coral-dark  Primary hover
Coral-soft  #FFF0EF    --pf-coral-soft  Active nav bg, badge bg
Coral-mid   #FBDAD9    --pf-coral-mid   Card hover border, dividers
Bg          #F7F6F4    --pf-bg          Page background (warm off-white)
White       #FFFFFF    --pf-white       Cards, sidebar, modals
Surface     #F2F1EF    --pf-surface     Nested surfaces
Ink         #1A1A1A    --pf-ink         Primary text
Muted       #888888    --pf-muted       Secondary text
Hint        #BBBBBB    --pf-hint        Placeholders
Border      #EBEBEB    --pf-border      0.5px default border
Success fg  #1D9E75    bg #E8F8F3       Completed states
Warning fg  #BA7517    bg #FAEEDA       Plan limits, pending
Danger  fg  #C9504B    bg #FCEAEA       Errors
Info    fg  #534AB7    bg #EEEDFE       AI surfaces ONLY

Radii: 6 / 10 / 14 / 20 / 28 / 100
Border default: 0.5px
Hover shadow: 0 2px 16px rgba(238,114,109,.09)
Focus ring:   0 0 0 3px var(--pf-coral-soft)

Fonts:  Bricolage Grotesque 700  (display/headings)
        DM Sans 400/500/600      (body/UI)
Scale:  32 / 24 / 18 / 15 / 14 / 12 / 11
```

## Non-negotiables
- Never Roboto. Never font-weight 300.
- Never emoji as nav icons — Lucide SVG.
- Max 2 accent colors per screen. Purple ONLY for AI.
- Borders: 0.5px `#EBEBEB`. Never `border-radius: 4px` on cards (min 10).
- Never `box-shadow: 0 4px 20px rgba(0,0,0,.12)` — too heavy.
- Cards never `transform: scale()` on hover (layout shift).
- Transitions: 0.15s color/border, 0.2s transform. Never > 0.4s.

## Files in this bundle

| Path | What |
|---|---|
| `00_SYSTEM_README.md` | Full narrative design system (context, tone, visual foundations, iconography) |
| `colors_and_type.css` | **Drop-in replacement for `src/app/globals.css`** |
| `SKILL.md` | Agent-skill manifest (safe to ignore if you're not using Claude skills) |
| `assets/logo-icon.svg` | Coral paw squircle — use as favicon and in sidebar logo slot |
| `assets/og-image.svg` | Social share card |
| `ui_kits/vet/index.html` | Runnable HTML preview of vet dashboard (open in browser) |
| `ui_kits/vet/VetSidebar.jsx` | Reference JSX for sidebar migration (PR 2) |
| `ui_kits/vet/VetDashboard.jsx` | Reference JSX for dashboard migration (PR 3) |
| `ui_kits/vet/README.md` | Vet kit notes |
| `ui_kits/owner/index.html` | Runnable HTML preview of owner pet view |
| `ui_kits/owner/OwnerPetView.jsx` | Reference JSX for owner migration (PR 4) |
| `ui_kits/owner/README.md` | Owner kit notes |

## How to use this with Claude Code

1. Drop this entire folder inside your repo at the root (e.g. `petfhans-platform/design_handoff_petfhans/`).
2. Commit it on a feature branch so it's visible to Claude Code.
3. Prompt: *"Read `design_handoff_petfhans/README.md` and implement PR 1 (tokens & fonts). Stop and show me the diff before moving to PR 2."*
4. Review. Move to PR 2. Repeat until PR 5+.
5. Delete `design_handoff_petfhans/` once migration is complete (or keep as living reference).
