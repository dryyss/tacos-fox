import type { Settings } from '@prisma/client';
import type { Restaurant } from './catalog';
import { restaurantTitle, type RestaurantWithHours } from './restaurants';
import { appUrl } from './url';

const SCHEMA_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/* Balisage schema.org pour le référencement local (Stains et alentours) */
export function restaurantJsonLd({ settings, hours, zones }: Restaurant) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: settings.name,
    slogan: settings.slogan,
    url: appUrl(),
    logo: `${appUrl()}/logo.png`,
    telephone: settings.phone || undefined,
    servesCuisine: ['Tacos', 'Burgers', 'Pizzas', 'Fast-food'],
    priceRange: '€',
    acceptsReservations: false,
    hasMenu: `${appUrl()}/carte`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: settings.addressLine1 || undefined,
      postalCode: settings.postalCode,
      addressLocality: settings.city,
      addressCountry: 'FR',
    },
    areaServed: zones.map(z => ({ '@type': 'City', name: z.city })),
    openingHoursSpecification: hours.filter(h => h.isOpen).map(h => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: SCHEMA_DAYS[h.dayOfWeek],
      opens: h.open,
      closes: h.close === '00:00' ? '23:59' : h.close,
    })),
    sameAs: [settings.instagram, settings.snapchat, settings.tiktok, settings.facebook].filter(Boolean),
  };
}

/* Balisage « restaurant local » d'une page restaurant (C8) */
export function restaurantPageJsonLd(r: RestaurantWithHours, settings: Settings) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': `${appUrl()}/restaurants/${r.slug}#restaurant`,
    name: restaurantTitle(r),
    slogan: settings.slogan,
    url: `${appUrl()}/restaurants/${r.slug}`,
    logo: `${appUrl()}/logo.png`,
    image: `${appUrl()}/opengraph-image.png`,
    brand: { '@type': 'Brand', name: 'Tacos Fox', logo: `${appUrl()}/logo.png` },
    parentOrganization: { '@id': `${appUrl()}/#organisation` },
    ...(r.latitude != null && r.longitude != null ? { geo: { '@type': 'GeoCoordinates', latitude: r.latitude, longitude: r.longitude } } : {}),
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.addressLine1}, ${r.postalCode} ${r.city}`)}`,
    potentialAction: { '@type': 'OrderAction', target: `${appUrl()}/r/${r.slug}`, deliveryMethod: 'http://purl.org/goodrelations/v1#DeliveryModePickUp' },
    telephone: r.phone || undefined,
    servesCuisine: ['Tacos', 'Burgers', 'Pizzas', 'Fast-food'],
    priceRange: '€',
    acceptsReservations: false,
    hasMenu: `${appUrl()}/r/${r.slug}`,
    address: { '@type': 'PostalAddress', streetAddress: r.addressLine1 || undefined, postalCode: r.postalCode, addressLocality: r.city, addressCountry: 'FR' },
    openingHoursSpecification: r.hours.filter(h => h.isOpen).map(h => ({
      '@type': 'OpeningHoursSpecification', dayOfWeek: SCHEMA_DAYS[h.dayOfWeek], opens: h.open, closes: h.close === '00:00' ? '23:59' : h.close,
    })),
    sameAs: [settings.instagram, settings.snapchat, settings.tiktok, settings.facebook].filter(Boolean),
  };
}

/* Accueil : la marque, le site et ses 5 restaurants */
export function siteJsonLd(restaurants: { slug: string; name: string; city: string; label?: string | null }[], settings: Settings) {
  const org = `${appUrl()}/#organisation`;
  return [
    {
      '@context': 'https://schema.org', '@type': 'Organization', '@id': org,
      name: 'Tacos Fox', url: appUrl(), logo: `${appUrl()}/logo.png`, slogan: settings.slogan,
      sameAs: [settings.instagram, settings.snapchat, settings.tiktok, settings.facebook].filter(Boolean),
      subOrganization: restaurants.map(r => ({ '@id': `${appUrl()}/restaurants/${r.slug}#restaurant`, '@type': 'Restaurant', name: restaurantTitle(r), url: `${appUrl()}/restaurants/${r.slug}` })),
    },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Tacos Fox', url: appUrl(), inLanguage: 'fr-FR', publisher: { '@id': org } },
  ];
}

/* Fil d'Ariane d'une page restaurant (Accueil > Nos restaurants > restaurant) */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${appUrl()}${it.path}` })),
  };
}

export function JsonLd({ data }: { data: object }) {
  // JSON.stringify n'échappe pas « < » : on l'échappe pour qu'aucun contenu ne ferme la balise script
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
