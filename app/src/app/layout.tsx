import type { Metadata, Viewport } from 'next';
import '@fontsource/bebas-neue/400.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/400-italic.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow/700.css';
import { IconSprite } from '@/components/Icons';
import { appUrl, indexingAllowed } from '@/lib/url';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: 'TACOS FOX : commande en ligne à emporter, Stains, Dugny, Le Blanc-Mesnil', template: '%s · TACOS FOX' },
  description: 'Tacos, burgers, pizzas, bowls et Crousty Fox dans nos 5 restaurants de Seine-Saint-Denis (Stains, Dugny, Le Blanc-Mesnil). Viande halal certifiée Achahada. Commandez en direct, à emporter.',
  openGraph: { type: 'website', locale: 'fr_FR', siteName: 'TACOS FOX' },
  twitter: { card: 'summary_large_image' },
  // Pas d'indexation avant la livraison du site (NEXT_PUBLIC_ALLOW_INDEXING=1 pour ouvrir)
  robots: indexingAllowed() ? { index: true, follow: true } : { index: false, follow: false },
  formatDetection: { telephone: false },
  // Installé sur l'écran d'accueil (iPhone, iPad) : plein écran, nom court
  appleWebApp: { capable: true, title: 'Tacos Fox', statusBarStyle: 'black' },
};

export const viewport: Viewport = { themeColor: '#141414', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <IconSprite />
        {children}
      </body>
    </html>
  );
}
