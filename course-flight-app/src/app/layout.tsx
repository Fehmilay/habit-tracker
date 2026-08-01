import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Course Flight',
  description:
    'Deine Ziele und täglichen Gewohnheiten als Langstreckenflug. Kleine Kursabweichungen, große Wirkung.',
  applicationName: 'Course Flight',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Course Flight',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#050a16',
  // Lets the scene paint behind the notch and home indicator.
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}
