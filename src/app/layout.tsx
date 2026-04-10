import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Petfhans — Plataforma Veterinaria',
  description: 'Gestión veterinaria inteligente con IA clínica',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  )
}
