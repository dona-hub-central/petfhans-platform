# Accessibility Checklist — Petfhans (WCAG 2.1 AA)

Quick reference. Use alongside `skills-ai/frontend-ui-engineering/SKILL.md`.

## Status: Current Gaps in the Codebase

These are **known issues** that need to be fixed as each component is touched:

| Component | Gap | Fix |
|---|---|---|
| `VetLayout` nav links | No `aria-current="page"` | Add `aria-current={active ? 'page' : undefined}` |
| `AdminLayout` nav links | No `aria-current="page"` | Same as above |
| `OwnerPetView` tabs | No `role="tablist"`, `role="tab"`, `aria-selected` | Add ARIA tab pattern |
| `BreedSelect` | No `role="combobox"`, `aria-expanded` | Add combobox ARIA |
| `PetGallery` lightbox | No `aria-modal`, no focus trap, no Escape close | Add dialog ARIA + keyboard |
| `src/app/layout.tsx` | `maximumScale: 1` blocks iOS zoom | Remove `maximumScale` |
| All portals | No skip-to-content link | Add `<a href="#main-content">` |

## Essential Checks Before Shipping

### Keyboard Navigation
- [ ] All interactive elements focusable via Tab
- [ ] Focus order follows visual/logical order
- [ ] Focus is visible (never `outline: none` without a custom focus style)
- [ ] Custom widgets: Enter to activate, Escape to close
- [ ] No keyboard traps
- [ ] Modals trap focus while open, return focus on close

### Screen Readers
- [ ] All images: descriptive `alt` text (or `alt=""` for decorative)
- [ ] All form inputs have associated `<label>` with matching `htmlFor` / `id`
- [ ] Icon-only buttons have `aria-label`
- [ ] Page has one `<h1>` and headings don't skip levels
- [ ] `aria-live` on dynamic content (toast notifications, status updates)

### Petfhans-Specific Patterns

```tsx
// Nav link active state
<Link
  href={item.href}
  aria-current={active ? 'page' : undefined}
  style={{ background: active ? 'var(--pf-coral-soft)' : 'transparent' }}
>
  <item.Icon size={16} strokeWidth={2} />
  {item.label}
</Link>

// Tab list (OwnerPetView)
<div role="tablist" aria-label="Secciones de la mascota" className="mob-tabs">
  {TABS.map(({ key, Icon, label }) => (
    <button
      key={key}
      role="tab"
      id={`tab-${key}`}
      aria-selected={tab === key}
      aria-controls={`panel-${key}`}
      onClick={() => setTab(key)}
      className={`mob-tab${tab === key ? ' active' : ''}`}
    >
      <Icon size={17} strokeWidth={2} />
      {label}
    </button>
  ))}
</div>
<div
  role="tabpanel"
  id={`panel-${tab}`}
  aria-labelledby={`tab-${tab}`}
  className="scroll-area"
>
  {/* active tab content */}
</div>

// Modal/lightbox
<div
  role="dialog"
  aria-modal="true"
  aria-label="Foto ampliada"
  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 9999 }}
>
  <button aria-label="Cerrar" onClick={() => setLightbox(null)}>✕</button>
  {/* content */}
</div>

// Combobox (BreedSelect)
<input
  role="combobox"
  aria-expanded={open}
  aria-autocomplete="list"
  aria-controls="breed-listbox"
  aria-activedescendant={highlighted ? `breed-option-${highlighted}` : undefined}
  value={query}
  onChange={e => { setQuery(e.target.value); setOpen(true) }}
/>
<div id="breed-listbox" role="listbox">
  {filtered.map(breed => (
    <div key={breed} id={`breed-option-${breed}`} role="option" aria-selected={breed === value}>
      {breed}
    </div>
  ))}
</div>
```

### Visual
- [ ] Text contrast ≥ 4.5:1 (normal text) or ≥ 3:1 (large text 18px+)
- [ ] `--pf-muted` (#888) on `--pf-white` (#FFF): ratio 3.54:1 — use only for large/secondary text
- [ ] Color is not the only way to convey information (always add icon or text)
- [ ] Touch targets ≥ 44×44px on mobile
- [ ] No `maximumScale: 1` in viewport (blocks iOS zoom)

### Forms
- [ ] Every input has a visible `<label>` with `htmlFor` matching `id`
- [ ] Required fields marked (not by color alone)
- [ ] Error messages associated with fields via `aria-describedby`
- [ ] Error state visible by more than color (border + text message)

## Testing Tools

```bash
# Browser extension — run on every page before shipping
# axe DevTools (Chrome/Firefox extension)

# CLI
npx axe http://localhost:3000/vet/dashboard

# Screen reader testing
# macOS: VoiceOver (Cmd + F5)
# Windows: NVDA (free)
```

## Common Anti-Patterns to Avoid

| Anti-Pattern | Problem | Fix |
|---|---|---|
| `<div onClick={...}>` | Not focusable, no keyboard | Use `<button>` |
| `outline: none` without replacement | Users can't see focus | Add `box-shadow: var(--pf-shadow-focus)` |
| Color-only error state | Invisible to color-blind | Add icon + text message |
| `alt={file.file_name}` | Technical name, not descriptive | Use `alt={file.notes || 'Documento adjunto'}` |
| Emoji as icon buttons | No accessible label | Use Lucide + `aria-label` |
| `tabIndex > 0` | Breaks natural tab order | Use `tabIndex={0}` or `-1` only |
| Modal without focus trap | Focus escapes behind overlay | Implement focus trap with `useEffect` |
