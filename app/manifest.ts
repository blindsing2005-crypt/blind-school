import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BLIND SCHOOL — Gestion scolaire',
    short_name: 'BLIND SCHOOL',
    description: 'Application de gestion scolaire complète (élèves, paiements, bulletins…)',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#f8fafc',
    theme_color: '#4f46e5',
    lang: 'fr',
    categories: ['education', 'productivity'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Nouvelle inscription',
        short_name: 'Inscrire',
        url: '/eleves',
      },
      {
        name: 'Paiements',
        short_name: 'Payer',
        url: '/paiements',
      },
      {
        name: 'Tableau de bord',
        short_name: 'Dashboard',
        url: '/',
      },
    ],
  };
}