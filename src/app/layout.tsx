import type { Metadata, Viewport } from 'next'
import 'maplibre-gl/dist/maplibre-gl.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Flight Habit',
  description:
    'Deine Ziele und täglichen Gewohnheiten als Langstreckenflug. Kleine Kursabweichungen, große Wirkung.',
  applicationName: 'Flight Habit',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Flight Habit',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [{ url: '/icons/icon-512.png', type: 'image/png', sizes: '512x512' }],
    apple: [{ url: '/icons/apple-touch-icon.png', type: 'image/png', sizes: '180x180' }],
  },
  category: 'health-fitness',
  formatDetection: {
    telephone: false,
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
