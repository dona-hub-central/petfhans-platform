# 🐾 Petfhans Platform

Plataforma veterinaria multi-tenant con IA clínica.

## Stack
- **Frontend:** Next.js 15 + TypeScript + Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL + Auth + Storage)
- **Pagos:** Stripe
- **IA:** Claude API (Anthropic)

## Módulos MVP
1. **Super Admin** — gestión global, métricas, suscripciones
2. **Panel Veterinaria** — equipo, fichas, invitaciones
3. **Vista Dueño** — perfil mascota, historial, hábitos
4. **IA Clínica** — análisis y comparativa de casos

## Setup

```bash
npm install
cp .env.local.example .env.local
# Rellenar variables de entorno
npm run dev
```

## Base de datos

Ejecutar migraciones en Supabase:
```
supabase/migrations/001_initial_schema.sql
```

## Roles
| Rol | Acceso |
|-----|--------|
| `superadmin` | Todo el sistema |
| `vet_admin` | Su clínica completa |
| `veterinarian` | Fichas y consultas |
| `pet_owner` | Sus mascotas (solo lectura) |
