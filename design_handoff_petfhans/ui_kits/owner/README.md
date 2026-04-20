# Owner Portal UI Kit

Mobile-first pet detail view for `/owner/pets/[id]`. Feels like a premium consumer app — warm, playful, reassuring. Uses `colors_and_type.css` from root.

## Files
- `index.html` — full interactive pet detail with clickable tabs
- `OwnerPetView.jsx` — hero, tab bar, info/historial/citas tabs, sticky CTA

## What's covered
- Coral gradient hero (the ONE gradient in the system) with pet avatar, name in Bricolage, next-visit pill
- Tab bar with Lucide SVG icons over the darkened hero
- Info tab: 18px-radius info card, coral-soft "next visit" reminder, clinic chip
- Historial tab: per-record cards with date pill, vet, dx/tx, next visit
- Citas tab: simple booking form with date/time chips
- Sticky bottom CTA "Agendar consulta"

## What's intentionally simplified
- Pet photo uses an emoji placeholder — swap for a real `<img>` with `border-radius:28px` in production
- Galería and Docs tabs are empty-state stubs
- Calendar chips are hardcoded; real implementation fetches `/api/appointments/slots`
