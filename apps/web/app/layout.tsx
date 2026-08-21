import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'SiteKhata',
  description: 'Shared expense ledger for construction sites',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // The site engineer is standing, one-handed, in the sun.
  maximumScale: 5,
  themeColor: '#171717',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-neutral-50 text-neutral-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
