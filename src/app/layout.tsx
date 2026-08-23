import type { Metadata } from 'next'
import Script from 'next/script'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import './globals.css'

const GA_ID = 'G-HLL0TPB32L'

export const metadata: Metadata = {
  title: 'VIVK — AI Workspace for Work, Business & Creativity',
  description: 'VIVK is an intelligent AI workspace for writing, research, coding, business automation and everyday productivity.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'VIVK — AI Workspace for Work, Business & Creativity',
    description: 'VIVK is an intelligent AI workspace for writing, research, coding, business automation and everyday productivity.',
    siteName: 'VIVK',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </head>
      <body className="font-sans antialiased">
        <ErrorBoundary>
          <SessionProvider>
            {children}
          </SessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
