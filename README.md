# Petfhans Platform

Plataforma veterinaria multi-tenant con IA clínica.

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 — App Router, Server Components |
| Lenguaje | TypeScript 5 strict |
| Estilos | Tailwind CSS 4 + CSS variables `--pf-*` |
| Base de datos / Auth | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Pagos | Stripe |
| IA clínica | OpenAI GPT-4o |
| Email | Resend |

---

## Requisitos previos

- Node.js 20+
- npm 10+
- Cuenta en [Supabase](https://supabase.com) con un proyecto creado
- (Opcional para pagos) Cuenta en [Stripe](https://stripe.com)
- (Opcional para email) Cuenta en [Resend](https://resend.com)

---

## Instalación local

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/dona-hub-central/petfhans-platform.git
cd petfhans-platform
git checkout Develop
npm install
```

### 2. Variables de entorno

Crea el archivo `.env.local` en la raíz del proyecto:

```bash
cp .env.local.example .env.local   # si existe
# o créalo manualmente con el contenido de abajo
```

Contenido de `.env.local`:

```env
# ── Supabase ──────────────────────────────────────────────
# Proyecto → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# ── Stripe (opcional) ─────────────────────────────────────
# Dashboard → Developers → API keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# ── Resend (opcional) ─────────────────────────────────────
# resend.com → API Keys
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@tudominio.com

# ── App ───────────────────────────────────────────────────
NEXT_PUBLIC_BASE_DOMAIN=localhost:3000
```

> Las variables `NEXT_PUBLIC_*` son expuestas al navegador.  
> `SUPABASE_SERVICE_ROLE_KEY` y `STRIPE_SECRET_KEY` son secretas — nunca las subas al repositorio.

### 3. Base de datos — ejecutar migraciones

En el [SQL Editor de Supabase](https://supabase.com/dashboard/project/_/sql), ejecuta cada migración **en orden**:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_auth_trigger.sql
supabase/migrations/003_pet_files.sql
supabase/migrations/004_medical_records_extended.sql
supabase/migrations/005_virtual_appointments.sql
supabase/migrations/006_appointment_ratings.sql
supabase/migrations/007_appointments_vet.sql
supabase/migrations/008_pet_access.sql
supabase/migrations/009_fix_invitations_rls.sql
supabase/migrations/010_fix_ratings_rls.sql
```

### 4. Storage — crear bucket

En Supabase → Storage → New bucket:

- **Nombre:** `pet-files`
- **Public:** sí (para fotos de perfil de mascotas)

### 5. Crear el primer superadmin

```bash
node scripts/create-superadmin.js
```

O crea el usuario manualmente en Supabase → Authentication → Users y asígnale el rol `superadmin` en la tabla `profiles`.

### 6. Arrancar el servidor de desarrollo

```bash
npm run dev
```

La app estará disponible en [http://localhost:3000](http://localhost:3000).

---

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con hot-reload |
| `npm run build` | Build de producción |
| `npm start` | Servidor de producción (requiere build previo) |
| `npm run lint` | Linter (ESLint) |

---

## Estructura de rutas

| URL | Descripción |
|-----|-------------|
| `/auth/login` | Login para todos los roles |
| `/auth/invite?token=…` | Aceptar invitación |
| `/admin/*` | Panel superadmin |
| `/vet/*` | Panel veterinario |
| `/owner/*` | Portal dueño de mascota |

---

## Roles

| Rol | Acceso |
|-----|--------|
| `superadmin` | Todo el sistema — gestión de clínicas y planes |
| `vet_admin` | Su clínica completa — equipo, pacientes, facturación |
| `veterinarian` | Fichas, consultas e IA clínica de su clínica |
| `pet_owner` | Sus mascotas autorizadas vía `pet_access` |

Los dueños de mascotas se incorporan exclusivamente por **invitación** — no hay registro público.

---

## Ramas

| Rama | Propósito |
|------|-----------|
| `main` | Producción — solo código de app |
| `Develop` | Testing — incluye además `prompts/` y `skills-ai/` |

Al hacer merge de `Develop` → `main`, los directorios `prompts/` y `skills-ai/` se excluyen automáticamente (`.gitattributes`).  
Requiere ejecutar una vez por máquina:

```bash
git config merge.ours.driver true
```
