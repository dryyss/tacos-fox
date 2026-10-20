import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/url';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/carte', '/infos', '/allergenes', '/mentions-legales', '/cgv', '/confidentialite'];
  return pages.map(p => ({ url: `${appUrl()}${p}`, changeFrequency: p === '/carte' ? 'daily' : 'monthly', priority: p === '' ? 1 : p === '/carte' ? 0.9 : 0.4 }));
}
