# Vet Panel UI Kit

High-fidelity recreation of the Petfhans `/vet/*` surface. Desktop-first, 1280×800+ target. Uses `colors_and_type.css` from root.

## Files
- `index.html` — full dashboard demo
- `VetSidebar.jsx` — fixed 220px sidebar with Lucide SVG nav + plan-usage footer
- `VetDashboard.jsx` — dashboard content: greeting, 3 stat cards, 4 quick actions, recent records list

## What's covered
- Sidebar in the design-system target state (Lucide SVGs, not emoji)
- Stat card pattern with coral/mint/amber tinted icon chips and staggered fade-up
- Quick-action card with correct hover (coral-mid border + soft coral shadow, no transform)
- AI entry uses purple semantic color — the only one allowed to

## What's intentionally simplified
- Species avatar in recent-records uses emoji because that's user-content territory (species marker), not nav
- No routing: all links are `href="#"`
- Real dashboard has counters that animate 0→value on mount; here values render final
