import type { Metadata, Viewport } from 'next'
import './globals.css'

const APP_URL = 'https://petfhans.com'
const APP_NAME = 'Petfhans'
const APP_DESCRIPTION = 'Plataforma veterinaria inteligente con IA clínica, historiales médicos digitales y portal para dueños de mascotas.'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Petfhans — Plataforma Veterinaria Inteligente',
    template: '%s · Petfhans',
  },
  description: APP_DESCRIPTION,
  keywords: [
    'veterinaria', 'clínica veterinaria', 'historial clínico', 'mascotas',
    'gestión veterinaria', 'software veterinario', 'IA clínica veterinaria',
    'portal dueños mascotas', 'ficha clínica digital', 'petfhans',
  ],
  authors: [{ name: 'Petfhans', url: APP_URL }],
  creator: 'Petfhans',
  publisher: 'Petfhans',
  robots: {
    index: false, // plataforma privada
    follow: false,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: APP_URL,
    siteName: APP_NAME,
    title: 'Petfhans — Plataforma Veterinaria Inteligente',
    description: APP_DESCRIPTION,
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'Petfhans — Plataforma Veterinaria',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Petfhans — Plataforma Veterinaria Inteligente',
    description: APP_DESCRIPTION,
    images: ['/og-image.svg'],
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': APP_NAME,
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  themeColor: '#EE726D',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://owoszanuthrijsptvmfr.supabase.co" />
      </head>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  )
}
