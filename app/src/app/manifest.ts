import type { MetadataRoute } from 'next';

/* Site installable (« Ajouter à l'écran d'accueil ») : ouvre la commande en ligne comme une application */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Tacos Fox : commande à emporter',
    short_name: 'Tacos Fox',
    description: 'Commandez vos tacos, burgers et pizzas à emporter dans les restaurants Tacos Fox.',
    lang: 'fr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#141414',
    categories: ['food', 'shopping'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
