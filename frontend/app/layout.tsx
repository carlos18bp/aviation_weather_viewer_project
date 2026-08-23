import type { Metadata, Viewport } from 'next';

import { INSTALL_PROMPT_CAPTURE_SCRIPT } from '@/features/pwa/installPromptCapture';
import { ServiceWorkerRegistrar } from '@/features/pwa/ServiceWorkerRegistrar';

import './globals.css';


export const metadata: Metadata = {
  title: 'Meteorología Aeronáutica · Demo ProjectApp',
  description: 'Prototipo demostrativo de meteorología aeronáutica para Colombia.',
  applicationName: 'Meteo Aero',
  // Declared explicitly instead of via app/icon.* so the URLs stay literal and
  // stable: the manifest and the service worker precache list both need them.
  icons: {
    icon: [
      { url: '/icons/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'Meteo Aero',
    statusBarStyle: 'black-translucent',
  },
  other: {
    // Next 16 renders appleWebApp.capable as `mobile-web-app-capable`; older iOS
    // Safari only reads the apple-prefixed name, so both are emitted.
    'apple-mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#06111c',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        {/*
          Chromium can fire beforeinstallprompt before React hydrates, and the event
          has no replay API: missing it kills the native install path for the whole
          session. This literal inline script runs ahead of every bundle and parks
          the event for the store to adopt.
          NOTE: if a CSP is ever added to this vhost, this script needs a nonce.
        */}
        <script
          id="pwa-install-capture"
          dangerouslySetInnerHTML={{ __html: INSTALL_PROMPT_CAPTURE_SCRIPT }}
        />
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
