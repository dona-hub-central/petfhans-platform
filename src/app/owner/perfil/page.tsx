import { redirect } from 'next/navigation'

export default function PerfilLegacyRedirect() {
  redirect('/owner/dashboard')
}
