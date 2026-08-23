import type { MetadataRoute } from 'next';

/**
 * Next emits this at /manifest.webmanifest and injects the <link rel="manifest">
 * into every document, so the viewer is installable without any extra wiring.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Meteorología Aeronáutica · Demo ProjectApp',
    short_name: 'Meteo Aero',
    description:
      'Prototipo demostrativo de meteorología aeronáutica para Colombia con datos simulados.',
    lang: 'es',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // No orientation lock: the viewer supports portrait and landscape on phone
    // and tablet alike (MRNF-009).
    background_color: '#06111c',
    theme_color: '#06111c',
    categories: ['weather', 'travel', 'navigation'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Screenshots unlock Chrome's richer install dialog, which previews the
    // viewer instead of showing a bare icon. They are an enhancement, never an
    // installability requirement: a rejected screenshot is silently ignored.
    screenshots: [
      {
        src: '/icons/screenshot-wide.png',
        sizes: '1280x720',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Visor meteorológico en escritorio',
      },
      {
        src: '/icons/screenshot-narrow.png',
        sizes: '720x1280',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Visor meteorológico en teléfono',
      },
    ],
  };
}
