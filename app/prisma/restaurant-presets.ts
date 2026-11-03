/* Les 5 restaurants Tacos Fox (enseigne commune), chacun exploité par sa propre société.
   Identité légale reprise des extraits Kbis fournis le 02/11/2026.
   Téléphones, horaires, délais, n° de TVA et comptes Stripe : pas encore fournis, saisis plus tard en base. */
import type { PrismaClient } from '@prisma/client';

const company = (legalName: string, siren: string) => ({ legalName, siren, legalForm: 'SAS', shareCapital: 100_000, rcsCity: 'Bobigny' });

export const RESTAURANT_PRESETS = [
  { id: 'rest_stains', slug: 'stains-marcel-cachin', label: 'Marcel Cachin', latitude: 48.959232, longitude: 2.382357, code: 'LSF', city: 'Stains', postalCode: '93240', addressLine1: '36 avenue Marcel Cachin', ...company('LA STREET FOOD', '992 470 260') },
  { id: 'rest_2', slug: 'stains-louis-bordes', label: 'Louis Bordes', latitude: 48.954721, longitude: 2.386198, code: 'LEF', city: 'Stains', postalCode: '93240', addressLine1: '14 avenue Louis Bordes', ...company("L'EMPIRE FOOD", '990 385 619') },
  { id: 'rest_3', slug: 'dugny-22-lariviere', label: '22 Larivière', latitude: 48.954151, longitude: 2.416494, code: 'ITP', city: 'Dugny', postalCode: '93440', addressLine1: '22 avenue Louis Larivière', ...company('ITALIANO PASTA', '988 720 314') },
  { id: 'rest_4', slug: 'dugny-21-lariviere', label: '21 Larivière', latitude: 48.953849, longitude: 2.416207, code: 'LMS', city: 'Dugny', postalCode: '93440', addressLine1: '21 avenue Louis Larivière', ...company('LA MAISON DU SNACK', '100 039 775') },
  // Carte un peu différente (détails à venir)
  { id: 'rest_5', slug: 'blanc-mesnil', label: '', latitude: 48.946933, longitude: 2.437073, code: 'MTA', city: 'Le Blanc-Mesnil', postalCode: '93150', addressLine1: '208-210 avenue du 8 Mai 1945', ...company('MISTER TACOS', '928 293 802') },
].map(r => ({ ...r, name: 'Tacos Fox' }));

const DEFAULT_HOURS = [0, 1, 2, 3, 4, 5, 6].map(d => ({ dayOfWeek: d, isOpen: true, open: d === 6 ? '12:00' : '11:00', close: d === 4 || d === 5 ? '00:00' : '23:00' }));

/* Crée les restaurants manquants (fermés à la commande) et met à jour l'identité des existants :
   nom, adresse, société. Ne touche jamais aux horaires, téléphone, ouverture ni compte Stripe. */
export async function ensureRestaurants(prisma: PrismaClient) {
  const model = await prisma.restaurantHours.findMany({ where: { restaurantId: 'rest_stains' } });
  const hours = model.length ? model.map(({ dayOfWeek, isOpen, open, close }) => ({ dayOfWeek, isOpen, open, close })) : DEFAULT_HOURS;
  let created = 0, updated = 0;
  for (const [i, { id, ...identity }] of RESTAURANT_PRESETS.entries()) {
    if (await prisma.restaurant.findUnique({ where: { id } })) {
      await prisma.restaurant.update({ where: { id }, data: identity });
      updated++;
    } else {
      await prisma.restaurant.create({ data: { id, ...identity, orderingEnabled: id === 'rest_stains', sortOrder: i, hours: { create: hours } } });
      created++;
    }
  }
  return { created, updated };
}
