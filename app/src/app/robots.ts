import type { MetadataRoute } from 'next';
import { appUrl, indexingAllowed } from '@/lib/url';

export default function robots(): MetadataRoute.Robots {
  // Avant la livraison : tout est bloqué (voir indexingAllowed)
  if (!indexingAllowed()) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/compte', '/panier', '/commande', '/paiement', '/suivi', '/r/', '/connexion', '/inscription', '/acces-reserve'] },
    sitemap: `${appUrl()}/sitemap.xml`,
    host: appUrl(),
  };
}
