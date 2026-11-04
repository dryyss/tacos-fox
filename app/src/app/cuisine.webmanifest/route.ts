/* Application « écran cuisine » à installer sur la tablette du restaurant : s'ouvre directement sur
   les commandes, en plein écran, sans barre d'adresse. Hors de /admin pour être lisible sans connexion
   (le navigateur télécharge le manifeste sans cookies). */
export const dynamic = 'force-static';

export function GET() {
  const manifest = {
    id: '/admin',
    name: 'Tacos Fox Cuisine',
    short_name: 'TF Cuisine',
    description: 'Écran cuisine Tacos Fox : commandes en direct, sonnerie, impression des tickets.',
    lang: 'fr',
    start_url: '/admin',
    scope: '/admin',
    display: 'standalone',
    background_color: '#141414',
    theme_color: '#141414',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  return new Response(JSON.stringify(manifest), { headers: { 'content-type': 'application/manifest+json', 'cache-control': 'public, max-age=3600' } });
}
