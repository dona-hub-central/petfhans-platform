---
name: petfhans-design
description: Use this skill to generate well-branded interfaces and assets for Petfhans, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping the veterinary SaaS platform.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Key files
- `README.md` — brand, tone, visual foundations, iconography
- `colors_and_type.css` — all tokens (import in every HTML artifact)
- `assets/` — logo + OG image
- `ui_kits/vet/` — desktop vet panel (sidebar + dashboard)
- `ui_kits/owner/` — mobile owner portal (pet detail)

## Non-negotiables
- Fonts: Bricolage Grotesque 700 (display) + DM Sans 400/500/600 (body). Never Roboto. Never weight 300.
- Coral `#EE726D` for CTAs, active nav, focus only. Never decoratively. Max 2 accent colors per screen.
- Purple `#534AB7` / `#EEEDFE` is exclusively for AI features.
- Icons: Lucide SVGs (16×16 in nav), never emoji as nav icons.
- Borders: 0.5px `#EBEBEB` default. Cards radius 14, buttons 10, owner pet cards 28, badges 100.
- One gradient in the system: owner portal mobile hero (`linear-gradient(170deg,#EE726D,#f9a394)`).
- Hover: coral-mid border + soft coral shadow. No scale transforms on cards.
