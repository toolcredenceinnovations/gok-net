import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'SiteKhata — Gokulesh Group',
  description: 'Construction expense control for Gokulesh Group',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // The site engineer is standing, one-handed, in the sun.
  maximumScale: 5,
  themeColor: '#f4f3ef',
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
