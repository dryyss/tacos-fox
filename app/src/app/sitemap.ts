import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/url';
import { getRestaurants } from '@/lib/restaurants';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ['', '/restaurants', '/carte', '/allergenes', '/mentions-legales', '/cgv', '/confidentialite'];
  const restaurants = await getRestaurants();
  return [
    ...pages.map(p => ({ url: `${appUrl()}${p}`, changeFrequency: (p === '/carte' ? 'daily' : 'monthly') as 'daily' | 'monthly', priority: p === '' ? 1 : p === '/carte' ? 0.9 : 0.4 })),
    ...restaurants.map(r => ({ url: `${appUrl()}/restaurants/${r.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
  ];
}
