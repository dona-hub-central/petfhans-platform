# 🐾 Petfhans — Design System Prompt for Claude

> Paste this entire document as your system prompt when asking Claude to create, modify or redesign any UI component or page in the Petfhans platform.

---

## WHO YOU ARE DESIGNING FOR

You are building a veterinary SaaS platform called **Petfhans**. It has three distinct user types:

- **Veterinary staff** (`/vet/*`): Clinic professionals who work on desktop all day. They need speed, clarity, and zero friction in their daily workflow.
- **Pet owners** (`/owner/*`): Parents of animals, mostly on mobile. They want warmth, reassurance, and delight when checking on their pets.
- **Superadmin** (`/admin/*`): Internal Petfhans team. Functional, data-dense, no-nonsense management views.

---

## THE FEELING TO AIM FOR

Every screen must trigger an emotional response: **"This was made with care."**

Think of apps like Linear, Vercel, or Loom for the vet panel — fast, confident, beautifully structured. Think of apps like Duolingo or Day One for the owner portal — warm, playful, dopamine-releasing.

The product must feel **alive**, not static. Hover states, smooth transitions, animated counters, and micro-feedback should make every interaction feel intentional.

---

## TYPOGRAPHY SYSTEM

**Abandon Roboto entirely.** Replace with this pairing:

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Display / headings | `Bricolage Grotesque` | 700 | Page titles, stat numbers, hero copy |
| Body / UI | `DM Sans` | 400 / 500 | All body text, nav labels, form elements |

```css
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=DM+Sans:wght@400;500;600&display=swap');

body {
  font-family: 'DM Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, .stat-number, .display {
  font-family: 'Bricolage Grotesque', sans-serif;
}
```

**Type scale:**

| Token | Size | Weight | Font | Use |
|-------|------|--------|------|-----|
| `.text-display` | 32px | 700 | Bricolage | Page hero, stat big numbers |
| `.text-h1` | 24px | 700 | Bricolage | Page titles |
| `.text-h2` | 18px | 700 | Bricolage | Section titles |
| `.text-h3` | 15px | 600 | Bricolage | Card titles |
| `.text-body` | 14px | 400 | DM Sans | All body copy |
| `.text-sm` | 12px | 400 | DM Sans | Meta info, timestamps |
| `.text-label` | 11px | 600 | DM Sans | Uppercase labels (letter-spacing: .07em) |
| `.text-accent` | 14px | 500 | DM Sans | Links, interactive labels |

---

## COLOR SYSTEM

```css
:root {
  /* Primary */
  --pf-coral:       #EE726D;   /* Main CTA, active states, accent */
  --pf-coral-dark:  #C9504B;   /* Hover on primary button */
  --pf-coral-soft:  #FFF0EF;   /* Active nav bg, badge bg, input focus ring */
  --pf-coral-mid:   #FBDAD9;   /* Subtle hover on cards, dividers */

  /* Surfaces */
  --pf-bg:          #F7F6F4;   /* Page background */
  --pf-white:       #FFFFFF;   /* Cards, sidebar, modals */
  --pf-surface:     #F2F1EF;   /* Nested surfaces (inside cards) */

  /* Text */
  --pf-ink:         #1A1A1A;   /* Primary text */
  --pf-muted:       #888888;   /* Secondary text, meta info */
  --pf-hint:        #BBBBBB;   /* Placeholder, disabled */

  /* Borders */
  --pf-border:      #EBEBEB;   /* Default border */
  --pf-border-md:   #D8D6D3;   /* Emphasis border (hover, focus) */

  /* Semantic — Status */
  --pf-success:     #E8F8F3;   /* Mint bg */
  --pf-success-fg:  #1D9E75;   /* Mint text */
  --pf-warning:     #FAEEDA;   /* Amber bg */
  --pf-warning-fg:  #BA7517;   /* Amber text */
  --pf-danger:      #FCEAEA;   /* Red bg */
  --pf-danger-fg:   #C9504B;   /* Red text */
  --pf-info:        #EEEDFE;   /* Purple bg — for AI features */
  --pf-info-fg:     #534AB7;   /* Purple text */
}
```

**Color usage rules:**
- Coral is reserved for: primary CTAs, active nav items, focus rings, key metrics. Never use it decoratively.
- Purple (`--pf-info`) is exclusively for AI-related features (Dr. Petfhans, AI analysis).
- Mint (`--pf-success`) is for completed states, confirmations, healthy metrics.
- Amber (`--pf-warning`) is for plan limits, pending states, warnings.
- Never use more than 2 accent colors on a single screen simultaneously.

---

## SPACING & SHAPE SYSTEM

```css
:root {
  /* Border radius */
  --pf-r-xs:  6px;   /* Small badges, pills */
  --pf-r-sm:  10px;  /* Buttons, inputs, small cards */
  --pf-r-md:  14px;  /* Standard cards */
  --pf-r-lg:  20px;  /* Large cards, modals */
  --pf-r-xl:  28px;  /* Mobile pet cards, hero containers */

  /* Borders */
  --pf-border-width:      0.5px;
  --pf-border-width-em:   1px;    /* Emphasis / featured items only */
}
```

**Spacing rhythm:** Use multiples of 4px for internal spacing, 8px for component gaps, 16-24px for section padding, 32-48px for page sections.

---

## COMPONENT LIBRARY

### Buttons

```tsx
// Primary — coral, full opacity, hover darkens
<button className="btn-primary">Agendar cita</button>

// Secondary — white bg, subtle border, hover lightens bg
<button className="btn-secondary">Cancelar</button>

// Ghost — transparent bg, coral border and text
<button className="btn-ghost">Ver historial</button>

// Destructive — only for irreversible actions
<button className="btn-danger">Eliminar mascota</button>
```

```css
.btn-primary {
  background: var(--pf-coral);
  color: #fff;
  font-family: 'DM Sans', sans-serif;
  font-weight: 500;
  font-size: 13.5px;
  padding: 9px 20px;
  border-radius: var(--pf-r-sm);
  border: none;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.btn-primary:hover { background: var(--pf-coral-dark); }
.btn-primary:active { transform: scale(0.98); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
```

**Button sizes:**
- `btn-sm`: `font-size: 12px; padding: 6px 14px;`
- `btn-md` (default): `font-size: 13.5px; padding: 9px 20px;`
- `btn-lg`: `font-size: 15px; padding: 12px 28px;`

**Icon buttons:** 36×36px, rounded to `--pf-r-sm`, white bg, subtle border. Always add `title` attribute.

---

### Cards

```tsx
// Standard raised card
<div className="card">
  {/* content */}
</div>

// Clickable card (hover interaction)
<div className="card card-interactive">
  {/* content */}
</div>

// Stat card (for numbers)
<div className="stat-card">
  <div className="stat-icon">{icon}</div>
  <div className="stat-value">{value}</div>
  <div className="stat-label">{label}</div>
</div>
```

```css
.card {
  background: var(--pf-white);
  border-radius: var(--pf-r-md);
  border: 0.5px solid var(--pf-border);
  padding: 20px;
}

.card-interactive {
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.card-interactive:hover {
  border-color: var(--pf-coral-mid);
  box-shadow: 0 2px 16px rgba(238, 114, 109, 0.09);
}

.stat-card {
  background: var(--pf-white);
  border-radius: var(--pf-r-md);
  border: 0.5px solid var(--pf-border);
  padding: 18px 20px;
}
.stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}
.stat-value {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 26px;
  font-weight: 700;
  color: var(--pf-ink);
  line-height: 1;
}
.stat-label {
  font-size: 12px;
  color: var(--pf-muted);
  margin-top: 3px;
}
```

---

### Badges / Tags

```tsx
<span className="badge badge-coral">Activo</span>
<span className="badge badge-success">Completado</span>
<span className="badge badge-warning">Pendiente</span>
<span className="badge badge-info">IA</span>
<span className="badge badge-gray">Inactivo</span>
```

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: 100px;
}
.badge-coral   { background: var(--pf-coral-soft);  color: var(--pf-coral-dark); }
.badge-success { background: var(--pf-success);      color: var(--pf-success-fg); }
.badge-warning { background: var(--pf-warning);      color: var(--pf-warning-fg); }
.badge-info    { background: var(--pf-info);         color: var(--pf-info-fg); }
.badge-gray    { background: var(--pf-surface);      color: var(--pf-muted); border: 0.5px solid var(--pf-border); }
```

---

### Inputs & Forms

```css
.input {
  width: 100%;
  padding: 10px 14px;
  border-radius: var(--pf-r-sm);
  border: 0.5px solid var(--pf-border-md);
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: var(--pf-ink);
  background: var(--pf-white);
  outline: none;
  transition: border 0.15s, box-shadow 0.15s;
}
.input::placeholder { color: var(--pf-hint); }
.input:hover { border-color: var(--pf-border-md); }
.input:focus {
  border-color: var(--pf-coral);
  box-shadow: 0 0 0 3px var(--pf-coral-soft);
}
```

**Form label:** Always above the input, never floating. Font-size 12.5px, font-weight 500, color `--pf-ink`, margin-bottom 6px.

---

### Navigation — Vet Sidebar

Redesign rules for `VetLayout.tsx`:

```
Width: 220px (previously 224px — slightly tighter)
Background: --pf-white
Border-right: 0.5px solid var(--pf-border)

Logo area:
- 40x40 coral rounded square icon (border-radius: 12px)
- Clinic name in Bricolage Grotesque, 13px, weight 700
- Subtitle in DM Sans, 11px, --pf-muted

Nav items:
- Height: 38px
- Padding: 0 10px
- Border-radius: 10px
- Icon: 16x16 SVG (NOT emoji)
- Label: DM Sans 13px, weight 400 (inactive), 500 (active)
- Active state: background --pf-coral-soft, color --pf-coral, icon stroked in coral
- Inactive state: color --pf-muted, hover background --pf-surface
- Transition: background 0.15s

Bottom section:
- Usage indicator (Pacientes X/Y) with animated progress bar
- User avatar: initials in coral circle, name in DM Sans 12px
```

**Replace emoji icons with SVG icons.** Use Lucide icons (already compatible with the stack). Each nav item needs a proper `<svg>` icon, not an emoji character.

---

### Owner Portal — Mobile-First

The owner portal must feel like a premium consumer app, not a clinic dashboard.

```
Palette shift for /owner/*:
- Keep coral as the accent
- Use larger border-radius (--pf-r-xl = 28px) for pet cards
- Hero section: full-width coral gradient top bar with greeting
- Pet card: elevated white card with pet avatar prominent (64x64)
- Tab bar: bottom-fixed on mobile, pill-style active indicator

Emotional design rules for owner portal:
- Pet name must be the biggest text on the screen (Bricolage, 22px+)
- Add a warm greeting with time-of-day context ("¡Buenas tardes!")
- Health tips section must feel like advice from a friend, not a manual
- Empty states get illustrated SVG characters, not just text
- "Agendar cita" CTA must be floating / always accessible
```

---

## MOTION & MICRO-INTERACTIONS

### Rules
- All transitions: `0.15s ease` for color/border changes, `0.2s ease` for transforms
- No transitions longer than 0.4s in the main UI
- Page loads: stagger stat cards with `animation-delay` (0ms, 80ms, 160ms)
- Number counters: animate from 0 to final value on first load (use `useEffect` + interval)
- Progress bars: animate width from 0% using CSS `@keyframes`
- Hover on cards: `box-shadow` and `border-color` together (never `transform: scale` on cards — it shifts layout)

### Feedback patterns
```tsx
// Loading state — pulse dots (NOT spinner)
<div className="loading-dots">
  <span /><span /><span />
</div>

// Toast notifications — slide up from bottom, auto-dismiss 3s
// Success: dark bg (#1a1a1a) + mint dot
// Error: coral bg + white text
// Warning: amber bg + amber-dark text

// Empty states — centered, icon above text, CTA below
// Use a simple SVG illustration, not just an emoji
```

---

## PAGE-LEVEL DESIGN PATTERNS

### `/vet/dashboard`
- **Hero row**: Full-width greeting (Bricolage H1) + today's date subtitle
- **Stats row**: 3 cards, equal width, coral accent on active one
- **Quick actions**: 4-column grid, icon-first cards with hover coral border
- **Recent records**: Clean table-style list with pet species icon, name, reason, date
- **Empty state**: Friendly illustration + "Registra tu primera mascota" CTA

### `/vet/pets` (list)
- Search bar full-width at top (with magnifier SVG icon, not emoji)
- Filter pills row: All / Perros / Gatos / Otros
- Pet grid: 3-4 columns, each card with avatar, name, breed, owner name badge, last visit
- "+ Nueva mascota" button: fixed bottom-right FAB OR top-right page action
- Plan limit: show usage bar in a sticky banner if >80% used

### `/owner/dashboard`
- Header: coral background, pet count stats inline
- Pet cards: large, horizontal, with photo placeholder area
- Quick actions: Chat veterinario / Panel de mascota / Agendar cita / Chat IA
- Tips: horizontal scroll row, NOT a 3-column grid (mobile-first)

### `/owner/pets/[id]`
- Full-width pet photo hero at the top
- Pet name huge below photo
- Tab row: Resumen / Historial / Citas / Fotos / Documentos
- Sticky bottom CTA: "Agendar consulta"

---

## WHAT TO NEVER DO

- ❌ Never use emoji as nav icons — use SVG (Lucide recommended)
- ❌ Never use `box-shadow: 0 4px 20px rgba(0,0,0,0.12)` — too heavy
- ❌ Never use purple gradient backgrounds — reserved for AI only, and only as soft bg
- ❌ Never use `font-family: Roboto` — replaced by DM Sans
- ❌ Never use `color: gray` or `color: #999` — use `--pf-muted`
- ❌ Never make buttons taller than 44px or shorter than 32px
- ❌ Never use `border-radius: 4px` for cards — minimum is `--pf-r-sm` (10px)
- ❌ Never stack 3+ different accent colors on one screen
- ❌ Never write empty states as just a centered text paragraph — add an icon/illustration + action button
- ❌ Never hardcode hex colors in component files — always use CSS variables
- ❌ Never use `font-weight: 300` — minimum weight is 400

---

## REFERENCE IMAGES INSPIRATION

The following design directions were approved as visual references:

1. **Pet adoption mobile app** (images 4-5 in brief): Clean white cards, orange/coral CTAs, species category pills, detail page with full-bleed pet photo and attribute badges
2. **Grooming landing page** (last image in brief): Bold typography, orange accent on featured cards, professional photography integrated into layout, trust signals section
3. **Existing Petfhans dashboard** (current state): Keep the coral color identity, improve card hierarchy and typography, replace flat emoji with proper SVG icons

The final output should feel like a **premium consumer app with professional SaaS precision** — approachable enough for a pet owner, efficient enough for a vet seeing 20 patients a day.

---

## IMPLEMENTATION PRIORITY ORDER

When Claude redesigns files, apply changes in this order:

1. `src/app/globals.css` — Update font imports, CSS variables, base utility classes
2. `src/components/shared/VetLayout.tsx` — Sidebar redesign with SVG icons
3. `src/app/vet/dashboard/page.tsx` — Dashboard visual upgrade
4. `src/components/owner/OwnerPetView.tsx` — Owner portal mobile upgrade
5. `src/components/shared/PetAvatar.tsx` — Avatar with proper sizing tokens
6. All remaining pages in order of user frequency

---

*This design system was created on April 20, 2026 for the Petfhans platform redesign.*
*Stack: Next.js 16 · Tailwind CSS 4 · Supabase · Resend*
