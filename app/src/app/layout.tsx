import type { Metadata, Viewport } from 'next';
import '@fontsource/bebas-neue/400.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/400-italic.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow/700.css';
import { IconSprite } from '@/components/Icons';
import { appUrl } from '@/lib/url';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: 'TACOS FOX Stains : commande en ligne, sur place, à emporter, livraison', template: '%s · TACOS FOX Stains' },
  description: 'Tacos, burgers, pizzas, bowls et Crousty Fox à Stains (93). Viande halal certifiée Achahada. Commandez en direct, sans appli de livraison.',
  icons: { icon: '/logo.svg' },
  openGraph: { type: 'website', locale: 'fr_FR', siteName: 'TACOS FOX' },
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
