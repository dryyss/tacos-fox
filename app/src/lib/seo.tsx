import type { Settings } from '@prisma/client';
import type { Restaurant } from './catalog';
import type { RestaurantWithHours } from './restaurants';
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
    logo: `${appUrl()}/logo.svg`,
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
    name: `${r.name} ${r.city}`,
    slogan: settings.slogan,
    url: `${appUrl()}/restaurants/${r.slug}`,
    logo: `${appUrl()}/logo.svg`,
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

export function JsonLd({ data }: { data: object }) {
  // JSON.stringify n'échappe pas « < » : on l'échappe pour qu'aucun contenu ne ferme la balise script
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
