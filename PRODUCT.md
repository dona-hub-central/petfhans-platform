# 🐾 Petfhans — Visión del Producto

## Qué es Petfhans

Petfhans es una plataforma veterinaria SaaS multi-tenant. Cada clínica opera en su propio subdominio (`clinica.petfhans.com`) con acceso aislado a sus datos. El producto tiene tres tipos de usuarios con experiencias completamente distintas:

| Rol | Quién es | Qué necesita |
|-----|----------|--------------|
| `superadmin` | El equipo de Petfhans | Gestionar clínicas, planes, facturación y el agente IA global |
| `vet_admin` / `veterinarian` | El personal de cada clínica | Gestionar pacientes, consultas, equipo e invitaciones |
| `pet_owner` | Los dueños de mascotas | Ver el historial de su mascota, fotos, documentos y solicitar citas |

---

## Rutas existentes por rol

### Superadmin (`/admin/*`)
- `/admin` — Dashboard global con métricas de clínicas, vets y mascotas
- `/admin/clinics` — Lista de clínicas registradas
- `/admin/clinics/new` — Crear nueva clínica + su primer vet_admin
- `/admin/clinics/[id]` — Detalle de clínica: equipo, uso, estado
- `/admin/subscriptions` — Gestión de planes y usuarios por clínica
- `/admin/plans` — Editor de planes de suscripción (precios, features)
- `/admin/tiers` — Tarifas por tramos de pacientes
- `/admin/user-plans` — Planes de usuario con permisos granulares por función
- `/admin/stripe` — Configuración de claves de Stripe y webhooks
- `/admin/agent` — Configuración del Agente IA global (Dr. Petfhans)

### Veterinaria (`/vet/*`)
- `/vet/dashboard` — Resumen: pacientes activos, consultas recientes, invitaciones activas
- `/vet/pets` — Lista de mascotas de la clínica
- `/vet/pets/new` — Registrar nueva mascota
- `/vet/pets/[id]` — Ficha completa: datos, dueño, historial, archivos
- `/vet/records` — Todas las consultas de la clínica
- `/vet/records/new` — Nueva consulta (exploración física completa, diagnóstico, meds, vacunas)
- `/vet/records/[id]` — Detalle de consulta
- `/vet/appointments` — Calendario de citas con panel de pendientes
- `/vet/appointments/schedule` — Configurar horarios de disponibilidad
- `/vet/invitations` — Invitaciones activas, usadas y expiradas
- `/vet/invitations/new` — Crear invitación para dueño o veterinario
- `/vet/team` — Equipo de la clínica
- `/vet/ai` — Chat con IA clínica (Dr. Petfhans) con contexto del paciente

### Dueño de mascota (`/owner/*`)
- `/owner/dashboard` — Lista de sus mascotas
- `/owner/pets/[id]` — Vista de mascota: ficha, galería, docs, historial, citas

---

## Rutas que FALTAN y deben crearse

### Superadmin
- `/admin/profile` — Perfil del superadmin: nombre, email, cambio de contraseña

### Veterinaria
- `/vet/profile` — Perfil del veterinario/admin: datos personales, cambio de contraseña, foto
- `/vet/settings` — Configuración de la clínica: nombre, slug, datos de contacto, logo
- `/vet/billing` — Estado de suscripción actual, plan contratado, límites de uso (pacientes usados vs máximo), enlace a portal de Stripe para gestionar pago

### Dueño
- `/owner/profile` — Perfil del dueño: nombre, teléfono, cambio de contraseña

---

## Límites del plan y su impacto en la UI

Cada clínica tiene un `max_patients` definido en su plan. Cuando una clínica se acerca o supera este límite:

- El botón "+ Nueva mascota" en `/vet/pets` debe mostrar un aviso o deshabilitarse
- El dashboard del vet debe mostrar un indicador de uso: `X / Y pacientes`
- Al intentar crear una mascota con el límite alcanzado, redirigir a `/vet/billing`
- En `/vet/billing` mostrar claramente el plan actual, el uso y una CTA para hacer upgrade

Esto aplica también a nivel de usuario: si el `user_plan` de una clínica no incluye acceso a la IA (`permissions.ai = false`), el enlace a `/vet/ai` no debe aparecer en la navegación.

---

## Modelo de negocio

- **Petfhans cobra a las clínicas** — no a los dueños ni veterinarios individuales
- Los planes se basan en número de pacientes (mascotas activas) y funcionalidades
- Planes actuales: Trial (gratis, 50 pacientes), Basic, Pro
- El `superadmin` puede cambiar el plan de cualquier clínica manualmente desde `/admin/subscriptions`
- Stripe gestiona la facturación recurrente
- Resend gestiona los emails transaccionales (invitaciones, bienvenida, confirmación de citas)

---

## Flujos de usuario críticos

### Flujo 1 — Onboarding de nueva clínica
```
Superadmin crea clínica en /admin/clinics/new
  → Se crea el registro en clinics + el primer vet_admin
  → vet_admin recibe email con credenciales
  → vet_admin entra a /vet/dashboard
  → Invita a su equipo desde /vet/invitations/new
  → Registra sus primeras mascotas en /vet/pets/new
  → Invita a los dueños desde /vet/invitations/new (rol pet_owner)
```

### Flujo 2 — Consulta clínica diaria
```
Vet entra a /vet/dashboard
  → Ve citas pendientes del día
  → Abre /vet/appointments → confirma citas
  → Busca mascota en /vet/pets
  → Abre ficha en /vet/pets/[id]
  → Crea nueva consulta en /vet/records/new
  → Opcionalmente consulta a la IA en /vet/ai
```

### Flujo 3 — Dueño consulta a su mascota
```
Dueño recibe invitación por email
  → Crea cuenta en /auth/invite?token=xxx
  → Entra a /owner/dashboard → ve su mascota
  → Abre /owner/pets/[id] → revisa historial, fotos, docs
  → Solicita cita desde la pestaña Citas
  → Recibe confirmación por email
```

---

## Stack técnico relevante para la UI

- **Framework**: Next.js 16 con App Router
- **Estilos**: Tailwind CSS 4 + CSS custom properties (`--accent: #EE726D`, `--bg: #f7f6f4`, etc.)
- **Componentes de layout**:
  - `src/components/admin/AdminLayout.tsx` — sidebar fijo para superadmin
  - `src/components/shared/VetLayout.tsx` — sidebar fijo para veterinaria
  - `src/components/owner/OwnerPetView.tsx` — vista mobile-first para dueños
- **Componentes compartidos**:
  - `PetAvatar` — avatar editable con subida de foto
  - `PetSearch` — buscador dropdown de mascotas
  - `PetFiles` — gestor de archivos adjuntos
  - `BreedSelect` — selector de raza con autocomplete
  - `InvitationCard` — tarjeta de invitación con copy/reenvío

---

## Principios de diseño actuales

- Colores: coral (`#EE726D`) como acento, fondo gris suave (`#f7f6f4`), texto oscuro (`#1a1a1a`)
- Bordes redondeados (12-20px) en cards y botones
- Sin sombras pesadas — bordes sutiles (`#ebebeb`)
- Mobile-first en el portal del dueño, desktop-first en el panel vet y admin
- Fuente: Roboto
- No hay dark mode actualmente
