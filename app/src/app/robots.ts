import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/url';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/compte', '/panier', '/commande', '/paiement', '/suivi'] },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
