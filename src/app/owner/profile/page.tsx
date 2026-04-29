import { redirect } from 'next/navigation'

export default function ProfileLegacyRedirect() {
  redirect('/owner/settings')
}
