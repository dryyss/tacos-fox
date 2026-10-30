/* Les 5 restaurants Tacos Fox. Seul Stains est connu ; les 4 autres sont provisoires,
   visibles mais fermés à la commande tant que le client n'a pas fourni leurs informations. */
import type { PrismaClient } from '@prisma/client';

export const RESTAURANT_PRESETS = [
  { id: 'rest_stains', slug: 'stains', code: 'STA', name: 'Tacos Fox Stains', city: 'Stains', postalCode: '93240', orderingEnabled: true },
  { id: 'rest_2', slug: 'restaurant-2', code: 'R02', name: 'Tacos Fox · restaurant 2', city: 'Ville à confirmer', postalCode: '', orderingEnabled: false },
  { id: 'rest_3', slug: 'restaurant-3', code: 'R03', name: 'Tacos Fox · restaurant 3', city: 'Ville à confirmer', postalCode: '', orderingEnabled: false },
  { id: 'rest_4', slug: 'restaurant-4', code: 'R04', name: 'Tacos Fox · restaurant 4', city: 'Ville à confirmer', postalCode: '', orderingEnabled: false },
  { id: 'rest_5', slug: 'restaurant-5', code: 'R05', name: 'Tacos Fox · restaurant 5 (carte spécifique)', city: 'Ville à confirmer', postalCode: '', orderingEnabled: false },
];

const DEFAULT_HOURS = [0, 1, 2, 3, 4, 5, 6].map(d => ({ dayOfWeek: d, isOpen: true, open: d === 6 ? '12:00' : '11:00', close: d === 4 || d === 5 ? '00:00' : '23:00' }));

/* Crée les restaurants manquants sans toucher à ceux qui existent (et donc aux saisies réelles) */
export async function ensureRestaurants(prisma: PrismaClient) {
  const model = await prisma.restaurantHours.findMany({ where: { restaurantId: 'rest_stains' } });
  const hours = model.length ? model.map(({ dayOfWeek, isOpen, open, close }) => ({ dayOfWeek, isOpen, open, close })) : DEFAULT_HOURS;
  let created = 0;
  for (const [i, r] of RESTAURANT_PRESETS.entries()) {
    if (await prisma.restaurant.findUnique({ where: { id: r.id } })) continue;
    await prisma.restaurant.create({ data: { ...r, sortOrder: i, hours: { create: hours } } });
    created++;
  }
  return created;
}
