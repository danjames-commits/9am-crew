import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '9AM Crew',
    short_name: '9AM Crew',
    description: 'Check in, see the workouts, track your lifts.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f3ee',
    theme_color: '#f4f3ee',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
