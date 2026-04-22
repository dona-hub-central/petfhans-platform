# SKILL: Buenas Prácticas de Código — Petfhans Platform

> Usa esta skill cada vez que vayas a crear o modificar archivos `.ts` o `.tsx` en este repositorio.
> Cubre: TypeScript estricto, JSDoc, reglas activas del ESLint, patrones Supabase seguros y brechas de seguridad.

---

## 1. Stack y configuración de referencia

| Herramienta | Versión / config |
|---|---|
| TypeScript | `strict: true`, target `ES2017` |
| ESLint | `eslint-config-next/core-web-vitals` + `typescript` |
| `@typescript-eslint/no-explicit-any` | `off` (se tolera en datos de Supabase, pero evítalo en código nuevo) |
| `@typescript-eslint/no-unused-vars` | `warn` — elimina siempre las variables no usadas |
| `react-hooks/exhaustive-deps` | `warn` — declara todas las dependencias del efecto |
| `@next/next/no-html-link-for-pages` | `warn` — usa `<Link>` de next/link, no `<a>` |
| Path alias | `@/*` → `./src/*` |

---

## 2. TypeScript estricto — reglas obligatorias

### 2.1 Nunca uses `any` en código nuevo

```typescript
// ❌ MAL — opaco, rompe el tipado hacia abajo
const profile: any = await getProfile()

// ✅ BIEN — tipo explícito
type Profile = {
  id: string
  full_name: string
  role: 'superadmin' | 'vet_admin' | 'veterinarian' | 'pet_owner'
  clinic_id: string | null
}
const profile: Profile = await getProfile()
```

Si el dato viene de Supabase y aún no tiene tipo, usa `unknown` + narrowing:

```typescript
// ✅ BIEN — unknown + type guard
function isProfile(data: unknown): data is Profile {
  return (
    typeof data === 'object' &&
    data !== null &&
    'role' in data &&
    'full_name' in data
  )
}
```

### 2.2 Tipos de retorno explícitos en funciones públicas

```typescript
// ❌ MAL — TypeScript infiere, pero el lector no sabe qué esperar
async function getClinicPets(clinicId: string) {
  ...
}

// ✅ BIEN — contrato claro
async function getClinicPets(clinicId: string): Promise<Pet[]> {
  ...
}
```

### 2.3 Usa `unknown` para errores en catch

```typescript
// ❌ MAL — error es `any` implícito antes de TS 4.4
} catch (err) {
  console.error(err.message) // puede explotar
}

// ✅ BIEN
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Error desconocido'
  console.error(message)
}
```

### 2.4 Readonly y non-nullable

```typescript
// Usa Readonly para arrays que no deben mutar
function renderItems(items: Readonly<Pet[]>) { ... }

// Usa el operador ! solo cuando ESTÉS SEGURO que no es null
// y siempre añade un comentario que explique por qué
const clinicId = user.clinic_id! // garantizado por el middleware de auth
```

---

## 3. JSDoc — cuándo y cómo

### 3.1 Documenta siempre estos elementos

- Funciones de utilidad en `src/lib/`
- Componentes con props no obvias
- API Routes (`route.ts`)
- Hooks personalizados
- Funciones que llaman a Supabase o a APIs externas

### 3.2 Formato JSDoc para funciones

```typescript
/**
 * Obtiene las mascotas activas de una clínica.
 *
 * @param clinicId - UUID de la clínica (de `profiles.clinic_id`)
 * @param limit - Número máximo de resultados. Por defecto 50.
 * @returns Array de mascotas ordenadas por nombre ascendente.
 * @throws {Error} Si la query de Supabase falla o el usuario no tiene acceso.
 *
 * @example
 * const pets = await getClinicPets('uuid-de-la-clinica')
 */
export async function getClinicPets(
  clinicId: string,
  limit = 50
): Promise<Pet[]> {
  ...
}
```

### 3.3 Formato JSDoc para componentes React

```typescript
/**
 * Avatar editable de una mascota con subida de foto a Supabase Storage.
 *
 * @param petId - UUID de la mascota. Requerido si `editable` es true.
 * @param species - Especie para mostrar el icono por defecto.
 * @param photoUrl - URL pública de la foto actual. Null muestra el icono.
 * @param size - Tamaño en px del avatar. Por defecto 80.
 * @param editable - Si true, permite subir una nueva foto al hacer clic.
 * @param onUploaded - Callback que recibe la nueva URL pública tras la subida.
 */
export default function PetAvatar({
  petId,
  species,
  photoUrl,
  size = 80,
  editable = false,
  onUploaded,
}: PetAvatarProps): JSX.Element {
  ...
}
```

### 3.4 Documenta las excepciones conocidas del linter con `eslint-disable`

Cuando desactives una regla, SIEMPRE explica por qué en el comentario:

```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
// Se omite `onChange` intencionalmente: añadirlo reiniciaría el query en cada keystroke
useEffect(() => { fetchBreeds(species) }, [species])
```

Nunca uses `eslint-disable` sin explicación. Una regla sin justificación es deuda técnica invisible.

---

## 4. Patrones ESLint activos — cómo cumplirlos

### 4.1 `no-unused-vars` (warn)

```typescript
// ❌ MAL — `clinicSlug` se declara pero no se usa
const { data: { user } } = await supabase.auth.getUser()
const clinicSlug = user?.user_metadata?.clinic_slug

// ✅ BIEN — descarta explícitamente con prefijo _
const { data: { user } } = await supabase.auth.getUser()
const _clinicSlug = user?.user_metadata?.clinic_slug // usado en logging futuro

// ✅ MEJOR — simplemente no la declares si no la usas
```

### 4.2 `react-hooks/exhaustive-deps` (warn)

```typescript
// ❌ MAL — `clinicId` cambia pero no está en las deps
useEffect(() => {
  fetchPets(clinicId)
}, []) // ESLint avisa: react-hooks/exhaustive-deps

// ✅ BIEN
useEffect(() => {
  fetchPets(clinicId)
}, [clinicId])

// Si el efecto solo debe correr al montar, usa useRef como flag
const mounted = useRef(false)
useEffect(() => {
  if (mounted.current) return
  mounted.current = true
  fetchInitialData()
}, [])
```

### 4.3 `@next/next/no-html-link-for-pages` (warn)

```tsx
// ❌ MAL — full page reload, pierde el caché del router
<a href="/vet/dashboard">Inicio</a>

// ✅ BIEN — navegación client-side de Next.js
import Link from 'next/link'
<Link href="/vet/dashboard">Inicio</Link>

// Excepción válida: links externos o downloads
<a href="https://stripe.com" target="_blank" rel="noopener noreferrer">
  Portal de facturación
</a>
```

---

## 5. Seguridad — brechas comunes y cómo evitarlas

### 5.1 NUNCA expongas el `SUPABASE_SERVICE_ROLE_KEY` en el cliente

```typescript
// ❌ CRÍTICO — esta variable en un Client Component se envía al browser
'use client'
import { createAdminClient } from '@/lib/supabase/admin'
// createAdminClient usa SUPABASE_SERVICE_ROLE_KEY — SOLO usar en Server Components

// ✅ BIEN — solo en Server Components y API Routes
// src/app/vet/dashboard/page.tsx (sin 'use client')
import { createAdminClient } from '@/lib/supabase/admin'
const supabase = createAdminClient() // OK: corre en el servidor
```

Regla de oro:
- `createClient()` de `@/lib/supabase/client` → solo en Client Components
- `createClient()` de `@/lib/supabase/server` → solo en Server Components
- `createAdminClient()` de `@/lib/supabase/admin` → solo en Server Components y `route.ts`

### 5.2 Valida y sanea la entrada del usuario antes de queries

```typescript
// ❌ MAL — inyección de parámetros posible
const { data } = await supabase
  .from('pets')
  .select('*')
  .eq('name', req.body.name) // `name` sin validar

// ✅ BIEN — valida tipo y longitud antes de la query
const name = String(req.body.name ?? '').trim().slice(0, 100)
if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

const { data } = await supabase
  .from('pets')
  .select('*')
  .eq('name', name)
```

### 5.3 Verifica siempre el rol del usuario en las API Routes

Supabase RLS protege la DB, pero un bug en las políticas puede filtrar datos.
Verifica el rol en la route ADEMÁS de confiar en RLS:

```typescript
// src/app/api/admin/clinics/route.ts
export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient() // server client
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Verificación de rol explícita — no solo confíes en RLS
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  // ... lógica de negocio
}
```

### 5.4 Links externos: siempre `rel="noopener noreferrer"`

```tsx
// ❌ MAL — tabnapping: la nueva pestaña puede acceder a window.opener
<a href={stripeUrl} target="_blank">Portal de pago</a>

// ✅ BIEN
<a href={stripeUrl} target="_blank" rel="noopener noreferrer">
  Portal de pago
</a>
```

### 5.5 Variables de entorno — nunca hardcodees secretos

```typescript
// ❌ CRÍTICO
const stripeKey = 'sk_live_xxxxxxxxxxxx'

// ✅ BIEN
const stripeKey = process.env.STRIPE_SECRET_KEY
if (!stripeKey) throw new Error('STRIPE_SECRET_KEY no está definida')
```

Variables `NEXT_PUBLIC_*` son visibles en el browser. Nunca pongas:
- API keys de servicios con permisos de escritura
- Tokens de acceso
- Claves de cifrado

### 5.6 Sanitiza antes de insertar en el DOM (dangerouslySetInnerHTML)

```tsx
// ❌ MAL — XSS si `content` viene de input del usuario
<div dangerouslySetInnerHTML={{ __html: content }} />

// ✅ BIEN — usa una librería de sanitizado o evita dangerouslySetInnerHTML
import DOMPurify from 'isomorphic-dompurify'
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />

// ✅ MEJOR — convierte markdown a React nodes en lugar de HTML crudo
```

### 5.7 Rate limiting en rutas de IA

Las rutas `/api/vet/ai-chat` y `/api/agent/chat` llaman a OpenAI, que cobra por token.
Antes de hacer la llamada, verifica que el usuario tiene permiso y registra la solicitud:

```typescript
// Patrón: verificar + registrar + llamar
const allowed = await checkRateLimit(user.id, 'ai-chat', 20) // 20 req/hora
if (!allowed) {
  return NextResponse.json(
    { error: 'Límite de consultas IA alcanzado. Intenta en una hora.' },
    { status: 429 }
  )
}
```

---

## 6. Patrones de componentes seguros

### 6.1 Props con tipos explícitos, nunca objetos genéricos

```typescript
// ❌ MAL
function PetCard({ pet }: { pet: object }) { ... }

// ✅ BIEN
type PetCardProps = {
  /** UUID de la mascota */
  petId: string
  /** Nombre para mostrar */
  name: string
  /** Especie — determina el icono por defecto */
  species: 'dog' | 'cat' | 'bird' | 'rabbit' | 'other'
  /** URL pública de la foto. Null muestra el icono de especie */
  photoUrl: string | null
  /** Callback al hacer clic en la tarjeta */
  onClick?: (petId: string) => void
}

function PetCard({ petId, name, species, photoUrl, onClick }: PetCardProps) { ... }
```

### 6.2 Manejo de errores en fetch dentro de componentes

```typescript
// ❌ MAL — error silencioso
const res = await fetch('/api/pets')
const data = await res.json()
setPets(data.pets)

// ✅ BIEN — verifica status, maneja el error, tipea la respuesta
type PetsResponse = { pets: Pet[] }

try {
  const res = await fetch('/api/pets')
  if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
  const data: PetsResponse = await res.json()
  setPets(data.pets)
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Error al cargar mascotas'
  setError(message)
}
```

### 6.3 useEffect: cancela fetch si el componente desmonta

```typescript
// Evita actualizar estado en un componente ya desmontado (memory leak + warning)
useEffect(() => {
  const controller = new AbortController()

  async function loadPets() {
    try {
      const res = await fetch('/api/pets', { signal: controller.signal })
      if (!res.ok) return
      const data: PetsResponse = await res.json()
      setPets(data.pets)
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError('Error al cargar')
    }
  }

  loadPets()
  return () => controller.abort()
}, [clinicId])
```

---

## 7. Checklist antes de hacer commit

Antes de finalizar cualquier archivo, verifica manualmente:

```
□ npx tsc --noEmit        → 0 errores de TypeScript
□ npx eslint src/         → 0 errores, máximo warnings justificados
□ Sin variables declaradas que no se usen
□ Sin imports que no se usen
□ Todas las funciones públicas tienen JSDoc
□ Todos los componentes tienen tipos de props explícitos
□ Ningún `console.log` de debugging en el commit final
□ Ninguna API key o secret hardcodeada
□ Links externos con rel="noopener noreferrer"
□ createAdminClient() solo en archivos sin 'use client'
□ Errores en catch tipados como `unknown`
□ Fetch con manejo de !res.ok
```

---

## 8. Comandos de verificación rápida

```bash
# TypeScript
npx tsc --noEmit

# ESLint sobre archivos modificados
npx eslint src/app/vet/ src/components/shared/ --max-warnings 0

# Buscar `any` explícitos en código nuevo
grep -rn ": any" src/ --include="*.ts" --include="*.tsx"

# Buscar secrets hardcodeados (patrones comunes)
grep -rn "sk_live\|sk_test\|eyJ" src/ --include="*.ts" --include="*.tsx"

# Buscar console.log de debugging olvidados
grep -rn "console\.log" src/ --include="*.ts" --include="*.tsx"
```

---

*Skill creada el 2026-04-22 para el stack: Next.js 16.2.3 · TypeScript strict · Supabase SSR · ESLint next/core-web-vitals*
