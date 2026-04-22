# SKILL: Calidad de Diseño Frontend — Petfhans Platform

> Usa esta skill cada vez que crees o modifiques un archivo `.tsx` que el usuario va a ver.
> Cubre: tokens del design system, patrones de componentes reales, micro-interacciones, reglas visuales y checklist de calidad.

---

## 0. Antes de escribir una línea de UI

Lee estos tres archivos en este orden:

```
src/app/globals.css          ← fuente de verdad de TODOS los tokens
src/components/shared/VetLayout.tsx  ← patrón de sidebar y navegación
src/app/vet/dashboard/page.tsx       ← patrón de página con stats, cards y listas
```

Si el componente es del portal del dueño, además lee:
```
src/components/owner/OwnerPetView.tsx  ← patrón mobile-first con hero coral
```

Nunca inventes tokens ni valores de color. Si no está en `globals.css`, no existe.

---

## 1. Sistema de tokens — referencia canónica

Todos los valores viven en `src/app/globals.css`. Esta es la tabla completa:

### Colores

```css
/* Coral — el único color de acción */
--pf-coral:        #EE726D   /* CTAs, nav activo, focus ring */
--pf-coral-dark:   #C9504B   /* Hover de botón primario */
--pf-coral-soft:   #FFF0EF   /* Fondo de nav activo, badge bg, focus glow */
--pf-coral-mid:    #FBDAD9   /* Hover de borde en cards, divisores */

/* Superficies */
--pf-bg:           #F7F6F4   /* Fondo de página */
--pf-white:        #FFFFFF   /* Cards, sidebar, modales */
--pf-surface:      #F2F1EF   /* Superficies anidadas dentro de cards */

/* Texto */
--pf-ink:          #1A1A1A   /* Texto primario */
--pf-muted:        #888888   /* Texto secundario, metainfo */
--pf-hint:         #BBBBBB   /* Placeholder, deshabilitado */

/* Bordes */
--pf-border:       #EBEBEB   /* Borde por defecto (0.5px) */
--pf-border-md:    #D8D6D3   /* Borde en hover/focus */

/* Semánticos — úsalos solo para su función */
--pf-success:      #E8F8F3   --pf-success-fg: #1D9E75  /* Completado, saludable */
--pf-warning:      #FAEEDA   --pf-warning-fg: #BA7517  /* Límites de plan, pendiente */
--pf-danger:       #FCEAEA   --pf-danger-fg:  #C9504B  /* Error, destructivo */
--pf-info:         #EEEDFE   --pf-info-fg:    #534AB7  /* IA EXCLUSIVAMENTE */
```

### Radios

```css
--pf-r-xs:   6px    /* Badges pequeños, pills */
--pf-r-sm:  10px    /* Botones, inputs, cards pequeñas */
--pf-r-md:  14px    /* Cards estándar — el más usado */
--pf-r-lg:  20px    /* Cards grandes, modales */
--pf-r-xl:  28px    /* Cards de mascota en mobile, hero containers */
--pf-r-pill: 100px  /* Badges, pills de nav */
```

### Tipografía

```css
/* Escala completa — usa el shorthand `font:` */
--pf-text-display: 700 32px/1.1  Bricolage  /* Números grandes, saludo hero */
--pf-text-h1:      700 24px/1.2  Bricolage  /* Títulos de página */
--pf-text-h2:      700 18px/1.25 Bricolage  /* Títulos de sección */
--pf-text-h3:      600 15px/1.35 Bricolage  /* Títulos de card */
--pf-text-body:    400 14px/1.5  DM Sans    /* Todo el texto de cuerpo */
--pf-text-sm:      400 12px/1.4  DM Sans    /* Metainfo, timestamps */
--pf-text-label:   600 11px/1    DM Sans    /* Labels uppercase */
--pf-text-accent:  500 14px/1.4  DM Sans    /* Links, "Ver todos →" */
```

### Sombras y transiciones

```css
--pf-shadow-card-hover: 0 2px 16px rgba(238, 114, 109, 0.09)
--pf-shadow-focus:      0 0 0 3px var(--pf-coral-soft)
--pf-shadow-sm:         0 1px 3px rgba(0, 0, 0, 0.05)

--pf-t-fast: 0.15s ease   /* Color, border */
--pf-t-med:  0.2s ease    /* Transforms, shadows */
```

---

## 2. El patrón `tintMap` — úsalo en todas las páginas nuevas

El dashboard ya implementa este patrón. Cópialo y extiéndelo:

```typescript
// Siempre define tintMap como const en el archivo donde lo uses
const tintMap = {
  coral:  { bg: 'var(--pf-coral-soft)',  fg: 'var(--pf-coral)' },
  mint:   { bg: 'var(--pf-success)',     fg: 'var(--pf-success-fg)' },
  amber:  { bg: 'var(--pf-warning)',     fg: 'var(--pf-warning-fg)' },
  purple: { bg: 'var(--pf-info)',        fg: 'var(--pf-info-fg)' },
  danger: { bg: 'var(--pf-danger)',      fg: 'var(--pf-danger-fg)' },
} as const

type Tint = keyof typeof tintMap
```

Usa el tint correcto según el contenido:
- `coral` — acción principal, estado activo
- `mint` — completado, éxito, saludable
- `amber` — pendiente, advertencia, límites de plan
- `purple` — todo lo relacionado con IA (SOLO IA)
- `danger` — error, acción destructiva

---

## 3. Clases utilitarias de `globals.css` — úsalas primero

Antes de escribir estilos inline, verifica si ya existe una clase:

```tsx
// Tipografía
<h1 className="pf-display">     {/* 700 32px Bricolage */}
<h2 className="pf-h1">          {/* 700 24px Bricolage */}
<h3 className="pf-h2">          {/* 700 18px Bricolage */}
<p  className="pf-body">        {/* 400 14px DM Sans */}
<span className="pf-sm">        {/* 400 12px DM Sans muted */}
<span className="pf-label">     {/* 600 11px uppercase */}
<a  className="pf-accent">      {/* 500 14px coral */}

// Cards
<div className="pf-card">                          {/* card base */}
<div className="pf-card pf-card-interactive">      {/* card clickeable con hover */}

// Botones
<button className="pf-btn pf-btn-primary">        {/* coral */}
<button className="pf-btn pf-btn-secondary">      {/* blanco con borde */}
<button className="pf-btn pf-btn-ghost">          {/* transparente, borde coral */}
<button className="pf-btn pf-btn-sm pf-btn-primary">  {/* pequeño */}
<button className="pf-btn pf-btn-lg pf-btn-primary">  {/* grande */}

// Inputs
<input className="pf-input" />

// Badges
<span className="pf-badge pf-badge-coral">Activo</span>
<span className="pf-badge pf-badge-success">Completado</span>
<span className="pf-badge pf-badge-warning">Pendiente</span>
<span className="pf-badge pf-badge-info">IA</span>
<span className="pf-badge pf-badge-danger">Error</span>
<span className="pf-badge pf-badge-gray">Inactivo</span>
```

---

## 4. Patrones de componente — cómo se construye cada bloque

### 4.1 Stat card (número + label + icono)

Este es el patrón exacto del dashboard. Úsalo en cualquier página que muestre métricas:

```tsx
import { type LucideIcon } from 'lucide-react'

function StatCard({
  Icon, label, value, tint, delay = 0
}: {
  Icon: LucideIcon
  label: string
  value: number | string
  tint: Tint
  delay?: number  // ms para stagger animation
}) {
  const { bg, fg } = tintMap[tint]
  return (
    <div style={{
      background: 'var(--pf-white)',
      border: '0.5px solid var(--pf-border)',
      borderRadius: 'var(--pf-r-md)',
      padding: '18px 20px',
      animation: `fadeUp 0.5s ${delay}ms both`,
    }}>
      {/* Chip de icono */}
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: bg, color: fg,
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', marginBottom: 10,
      }}>
        <Icon size={20} strokeWidth={2} />
      </div>
      {/* Número */}
      <div style={{
        font: 'var(--pf-text-display)',
        fontSize: 26, color: 'var(--pf-ink)', lineHeight: 1,
      }}>
        {value}
      </div>
      {/* Label */}
      <div style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-muted)', marginTop: 3 }}>
        {label}
      </div>
    </div>
  )
}

// CSS necesario en el bloque <style> de la página:
// @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }

// Uso en grid de 3 columnas:
// <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
//   <StatCard Icon={PawPrint} label="Pacientes" value={count} tint="coral" delay={0} />
//   <StatCard Icon={Check}    label="Completados" value={done} tint="mint"  delay={80} />
//   <StatCard Icon={Clock}    label="Pendientes" value={pend} tint="amber" delay={160} />
// </section>
```

### 4.2 Fila de lista (row en card con hover)

```tsx
// CSS en bloque <style>:
// .pf-list-row { display:flex; align-items:center; gap:12px; padding:14px 20px;
//   text-decoration:none; border-top:0.5px solid var(--pf-border);
//   transition:background var(--pf-t-fast); }
// .pf-list-row:hover { background:var(--pf-bg); }

<Link href={`/vet/records/${r.id}`} className="pf-list-row">
  {/* Chip de especie/tipo */}
  <div style={{
    width: 36, height: 36, borderRadius: 12,
    background: 'var(--pf-surface)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  }}>
    <PawPrint size={18} strokeWidth={1.75} style={{ color: 'var(--pf-coral)' }} />
  </div>

  {/* Texto principal + subtexto */}
  <div style={{ flex: 1, minWidth: 0 }}>
    <p style={{ font: 'var(--pf-text-body)', fontWeight: 500, color: 'var(--pf-ink)', margin: 0 }}>
      {r.name}
    </p>
    <p style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-muted)', margin: '2px 0 0' }}>
      {r.reason}
    </p>
  </div>

  {/* Meta derecha + chevron */}
  <span style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-muted)', flexShrink: 0 }}>
    {formatDate(r.date)}
  </span>
  <span style={{ color: 'var(--pf-hint)', marginLeft: 4 }}>›</span>
</Link>
```

### 4.3 Quick action card (4 columnas)

```tsx
// CSS:
// .qa-card { background:var(--pf-white); border:0.5px solid var(--pf-border);
//   border-radius:14px; padding:16px; display:flex; flex-direction:column; gap:10px;
//   text-decoration:none; transition:border-color var(--pf-t-med), box-shadow var(--pf-t-med); }
// .qa-card:hover { border-color:var(--pf-coral-mid); box-shadow:var(--pf-shadow-card-hover); }

<Link href="/vet/pets/new" className="qa-card">
  <div style={{
    width: 34, height: 34, borderRadius: 10,
    background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <Plus size={18} strokeWidth={2} />
  </div>
  <div>
    <div style={{ font: 'var(--pf-text-h3)', color: 'var(--pf-ink)' }}>Nueva mascota</div>
    <p style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-muted)', margin: '2px 0 0' }}>Registrar paciente</p>
  </div>
</Link>
```

### 4.4 Sección con header + lista

Estructura estándar para cualquier card con lista de items:

```tsx
<section style={{
  background: 'var(--pf-white)',
  borderRadius: 'var(--pf-r-md)',
  border: '0.5px solid var(--pf-border)',
  overflow: 'hidden',
}}>
  {/* Header con título y enlace */}
  <header style={{
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '16px 20px',
  }}>
    <h3 style={{ font: 'var(--pf-text-h3)', color: 'var(--pf-ink)', margin: 0 }}>
      Título de la sección
    </h3>
    <Link href="/vet/records"
      style={{ font: 'var(--pf-text-accent)', color: 'var(--pf-coral)', textDecoration: 'none' }}>
      Ver todos →
    </Link>
  </header>

  {/* Filas */}
  {items.map(item => (
    <Link key={item.id} href={`/vet/records/${item.id}`} className="pf-list-row">
      {/* ... */}
    </Link>
  ))}

  {/* Empty state */}
  {items.length === 0 && (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <p style={{ font: 'var(--pf-text-body)', color: 'var(--pf-muted)' }}>
        No hay registros aún
      </p>
    </div>
  )}
</section>
```

### 4.5 Formulario con label + input

```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
  <div>
    {/* Label: siempre arriba, nunca flotante */}
    <label
      htmlFor="pet-name"
      style={{
        display: 'block',
        font: 'var(--pf-text-sm)',
        fontWeight: 500,
        color: 'var(--pf-ink)',
        marginBottom: 6,
      }}
    >
      Nombre de la mascota
    </label>
    <input
      id="pet-name"
      className="pf-input"
      type="text"
      placeholder="Ej: Luna"
    />
  </div>

  {/* Mensaje de error */}
  {error && (
    <p style={{ font: 'var(--pf-text-sm)', color: 'var(--pf-danger-fg)', margin: 0 }}>
      {error}
    </p>
  )}

  {/* Submit */}
  <button type="submit" className="pf-btn pf-btn-primary" disabled={loading}>
    {loading ? 'Guardando…' : 'Guardar'}
  </button>
</div>
```

---

## 5. Estructura de página nueva — plantilla base

Toda página nueva de `/vet/*` sigue esta estructura:

```tsx
// src/app/vet/[nueva-seccion]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { IconName } from 'lucide-react'

export const metadata = { title: 'Nombre Sección · Petfhans' }

export default async function NuevaSeccionPage() {
  // 1. Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // 2. Datos
  const { data: profile } = await supabase
    .from('profiles').select('clinic_id, full_name').eq('user_id', user.id).single()

  // 3. Render
  return (
    <>
      {/* CSS scoped de la página */}
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(8px) }
          to   { opacity:1; transform:none }
        }
        /* Clases específicas de esta página aquí */
      `}</style>

      {/* Header de página */}
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ font: 'var(--pf-text-h1)', margin: 0, color: 'var(--pf-ink)' }}>
          Nombre de la sección
        </h1>
        <p style={{ font: 'var(--pf-text-body)', color: 'var(--pf-muted)', margin: '4px 0 0' }}>
          Descripción corta opcional
        </p>
      </header>

      {/* Contenido */}
    </>
  )
}
```

---

## 6. Iconos — reglas de uso

### Fuente única: `lucide-react`

```tsx
// ✅ CORRECTO
import { PawPrint, Calendar, ClipboardList, Mail, Sparkles, Users } from 'lucide-react'
<PawPrint size={16} strokeWidth={2} />

// ❌ NUNCA emoji como icono de navegación o acción
<span>🐾</span>  // MAL en nav items, botones, chips de acción
```

### Tamaños estándar según contexto

| Contexto | Size | StrokeWidth |
|---|---|---|
| Nav sidebar | 16 | 2 |
| Chip de icono (stat card, quick action) | 18–20 | 2 |
| Fila de lista | 18 | 1.75 |
| Botón con icono | 15–16 | 2 |
| Icono decorativo grande | 24–32 | 1.5 |

### Excepción documentada: emoji en datos

Los emoji solo son aceptables dentro del contenido de datos (especie de mascota en una fila), nunca como chrome de la interfaz:

```tsx
// ✅ ACEPTABLE — es un dato, no un icono de UI
<span title={speciesLabel[pet.species]}>
  {speciesEmoji[pet.species]}
</span>

// ❌ NUNCA — emoji como icono de acción o navegación
<button>📅 Agendar</button>  // MAL
<button><Calendar size={16} /> Agendar</button>  // BIEN
```

---

## 7. Reglas visuales — lo que NUNCA debes hacer

```
❌ Nunca Roboto ni font-weight 300
❌ Nunca hexadecimal hardcodeado en style — siempre var(--pf-*)
❌ Nunca border-radius: 4px en cards (mínimo var(--pf-r-sm) = 10px)
❌ Nunca box-shadow pesada: 0 4px 20px rgba(0,0,0,.12)
❌ Nunca transform:scale() en hover de cards — genera layout shift
❌ Nunca purple (#534AB7) fuera de features de IA
❌ Nunca coral de forma decorativa — solo CTAs, nav activo, focus
❌ Nunca más de 2 colores de acento en una sola pantalla
❌ Nunca transiciones > 0.4s en la UI principal
❌ Nunca emoji como icono de navegación, botón o chip de acción
❌ Nunca border-width > 1px en elementos no-emphasis
❌ Nunca color: gray o color: #999 — usar var(--pf-muted)
❌ Nunca font-family hardcodeada — heredar o usar var(--pf-font-body)
```

---

## 8. Empty states — siempre con acción

Nunca dejes un empty state solo con texto. Siempre incluye un CTA:

```tsx
// ✅ CORRECTO
<div style={{ padding: '48px 20px', textAlign: 'center' }}>
  {/* Icono SVG o Lucide grande */}
  <div style={{
    width: 56, height: 56, borderRadius: 'var(--pf-r-lg)',
    background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px',
  }}>
    <PawPrint size={28} strokeWidth={1.5} />
  </div>
  <p style={{ font: 'var(--pf-text-h3)', color: 'var(--pf-ink)', margin: '0 0 6px' }}>
    Sin mascotas registradas
  </p>
  <p style={{ font: 'var(--pf-text-body)', color: 'var(--pf-muted)', margin: '0 0 20px' }}>
    Registra tu primera mascota para empezar.
  </p>
  <Link href="/vet/pets/new" className="pf-btn pf-btn-primary">
    + Nueva mascota
  </Link>
</div>

// ❌ MAL
<p style={{ color: '#8e8e93' }}>No hay mascotas aún</p>
```

---

## 9. Gradiente — solo uno en todo el sistema

```css
/* El ÚNICO gradiente permitido: hero del portal del dueño en mobile */
background: linear-gradient(170deg, #EE726D 0%, #f9a394 100%);

/* Todo lo demás es fondo plano con var(--pf-*) */
```

---

## 10. Responsividad por portal

| Portal | Approach | Media query principal |
|---|---|---|
| `/vet/*` | Desktop-first, sidebar fijo 220px | `@media (max-width: 767px)` para hamburger |
| `/admin/*` | Desktop-first, sidebar fijo 220px | `@media (max-width: 767px)` para hamburger |
| `/owner/*` | **Mobile-first**, sin sidebar | `@media (min-width: 768px)` para layout de 2 columnas |

El `<main>` del portal vet tiene `marginLeft: 220px`. En mobile, VetLayout añade la clase `pf-main-content` que sobrescribe ese margen a 0 y añade `paddingTop: 56px` para el header fijo.

---

## 11. Checklist visual antes de hacer commit

```
□ Todos los colores usan var(--pf-*), ningún hex hardcodeado
□ Todas las fuentes heredan o usan var(--pf-font-body) / var(--pf-font-display)
□ Todos los border-radius son var(--pf-r-*), mínimo var(--pf-r-sm) en cards
□ El hover de cards usa border-color + box-shadow, nunca transform:scale
□ Los iconos de UI son Lucide SVG con size correcto, no emoji
□ El color purple solo aparece si hay algo de IA en la pantalla
□ Los empty states tienen icono + texto + CTA
□ Los inputs tienen label encima con htmlFor vinculado al id
□ Las animaciones usan var(--pf-t-fast) o var(--pf-t-med), nunca > 0.4s
□ Las stat cards tienen stagger de 0 / 80 / 160ms con fadeUp
□ Los links de "Ver todos" usan font:var(--pf-text-accent) + color:var(--pf-coral)
□ El portal del dueño es mobile-first con max-width en desktop
□ No hay box-shadow: 0 4px 20px rgba(0,0,0,.12)
□ No hay valores mágicos hardcodeados que deberían ser un token
```

---

*Skill creada el 2026-04-22. Basada en el estado real de `src/app/globals.css` y `src/app/vet/dashboard/page.tsx`.*
*Stack: Next.js 16.2.3 · Tailwind CSS 4 · Lucide React · Bricolage Grotesque + DM Sans*
