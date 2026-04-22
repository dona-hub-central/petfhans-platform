# Accessibility Checklist WCAG 2.1 AA — Petfhans

Complementa `skills-ai/frontend-ui-engineering/accessibility-checklist.md` con patrones HTML específicos y herramientas de testing.

---

## Estado actual del codebase — Gaps conocidos

| Componente | Gap | Fix |
|---|---|---|
| `VetLayout` nav links | No `aria-current="page"` | `aria-current={active ? 'page' : undefined}` |
| `AdminLayout` nav links | No `aria-current="page"` | Igual que VetLayout |
| `OwnerPetView` tabs | No `role="tablist"`, `role="tab"`, `aria-selected` | Ver patrón abajo |
| `BreedSelect` | No `role="combobox"`, `aria-expanded` | Ver patrón abajo |
| `PetGallery` lightbox | No `aria-modal`, sin focus trap, Escape no cierra | Ver patrón abajo |
| `src/app/layout.tsx` | `maximumScale: 1` bloquea zoom iOS | Eliminar `maximumScale` |
| Todos los portales | Sin skip-to-content link | Añadir `<a href="#main-content">` |

---

## Checks esenciales antes de merge

### Navegación por teclado
- [ ] Todos los elementos interactivos son focusables via Tab
- [ ] El orden de foco sigue el orden visual/lógico
- [ ] El foco es visible (nunca `outline: none` sin reemplazo)
- [ ] Widgets custom: Enter para activar, Escape para cerrar
- [ ] Sin keyboard traps
- [ ] Modales atrapan foco mientras están abiertos, devuelven foco al cerrar

### Screen Readers
- [ ] Todas las imágenes tienen `alt` descriptivo (o `alt=""` para decorativas)
- [ ] Todos los inputs tienen `<label>` con `htmlFor` vinculado al `id`
- [ ] Botones con solo icono tienen `aria-label`
- [ ] La página tiene un `<h1>` y los headings no saltan niveles
- [ ] `aria-live` en contenido dinámico (toasts, mensajes de estado, errores)

### Visual
- [ ] Contraste de texto ≥ 4.5:1 (normal) o ≥ 3:1 (grande, 18px+)
- [ ] El color no es el único indicador de estado (siempre añadir icono o texto)
- [ ] Touch targets ≥ 44×44px en mobile
- [ ] Sin `maximumScale: 1` en viewport

### Formularios
- [ ] Cada input tiene label visible con `htmlFor` coincidiendo con `id`
- [ ] Campos requeridos marcados (no solo por color)
- [ ] Mensajes de error asociados con `aria-describedby`
- [ ] Estado de error visible por más que color (borde + texto)

---

## Patrones HTML correctos — Petfhans

### Nav link con estado activo
```tsx
<Link
  href={item.href}
  aria-current={active ? 'page' : undefined}
  style={{ background: active ? 'var(--pf-coral-soft)' : 'transparent' }}
>
  <item.Icon size={16} strokeWidth={2} aria-hidden="true" />
  {item.label}
</Link>
```

### Tab list (OwnerPetView)
```tsx
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
      <Icon size={17} strokeWidth={2} aria-hidden="true" />
      {label}
    </button>
  ))}
</div>
<div
  role="tabpanel"
  id={`panel-${tab}`}
  aria-labelledby={`tab-${tab}`}
>
  {/* contenido del tab activo */}
</div>
```

### Modal / Lightbox con focus trap
```tsx
// Cerrar con Escape
useEffect(() => {
  if (!isOpen) return
  const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
  document.addEventListener('keydown', handler)
  return () => document.removeEventListener('keydown', handler)
}, [isOpen, onClose])

// Markup
<div
  role="dialog"
  aria-modal="true"
  aria-label="Foto ampliada"
  style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
>
  <button aria-label="Cerrar" onClick={onClose}>✕</button>
  {/* contenido */}
</div>
```

### Combobox (BreedSelect)
```tsx
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
    <div
      key={breed}
      id={`breed-option-${breed}`}
      role="option"
      aria-selected={breed === value}
    >
      {breed}
    </div>
  ))}
</div>
```

### Botón con solo icono
```tsx
// ✅ CORRECTO
<button aria-label="Cerrar diálogo">
  <X size={16} aria-hidden="true" />
</button>

// ❌ MAL
<button>
  <X size={16} />
</button>
```

### Skip-to-content link (root layout)
```tsx
// src/app/layout.tsx — primer hijo del <body>
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0"
  style={{
    background: 'var(--pf-coral)', color: '#fff',
    padding: '8px 16px', zIndex: 9999,
  }}
>
  Ir al contenido principal
</a>
```

---

## Herramientas de testing

```bash
# Extensión de browser — correr en cada página antes de merge
# axe DevTools (Chrome / Firefox)

# CLI
npx axe http://localhost:3000/vet/dashboard
npx axe http://localhost:3000/owner/dashboard

# Screen reader
# macOS: VoiceOver (Cmd + F5)
# Windows: NVDA (gratis)
```

---

## Anti-patrones a evitar

| Anti-patrón | Problema | Fix |
|---|---|---|
| `<div onClick={...}>` | No focusable, sin soporte de teclado | Usar `<button>` |
| `outline: none` sin reemplazo | Usuarios no ven el foco | Añadir `box-shadow: var(--pf-shadow-focus)` |
| Estado de error solo por color | Invisible para daltónicos | Añadir icono + mensaje de texto |
| `alt={file.file_name}` | Nombre técnico, no descriptivo | `alt={file.notes \|\| 'Documento adjunto'}` |
| Emoji como botón de icono | Sin label accesible | Lucide + `aria-label` |
| `tabIndex > 0` | Rompe el orden natural de tab | Usar `tabIndex={0}` o `-1` únicamente |
| Modal sin focus trap | El foco escapa detrás del overlay | Implementar focus trap con `useEffect` |
