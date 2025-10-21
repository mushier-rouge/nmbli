import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'nmbli',
    short_name: 'nmbli',
    description: 'Compare out-the-door car quotes with confidence.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f6f6f3',
    theme_color: '#111827',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'Active Briefs',
        short_name: 'Briefs',
        url: '/briefs',
      },
      {
        name: 'Dealer Portal',
        short_name: 'Dealer',
        url: '/dealer',
      },
    ],
    categories: ['productivity', 'business'],
  };
}
