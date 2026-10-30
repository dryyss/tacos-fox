import 'server-only';
import { prisma } from './prisma';
import { getSettings } from './catalog';
import { makeOptions, OPTION } from './options';
import { openStatus, timeSlots, type DayHours } from './hours';
import type { Mode } from './pricing';

const withHours = { hours: { orderBy: { dayOfWeek: 'asc' } } } as const;

/* Restaurants visibles sur le site, dans l'ordre d'affichage */
export function getRestaurants() {
  return prisma.restaurant.findMany({ where: { isActive: true }, include: withHours, orderBy: { sortOrder: 'asc' } });
}
export type RestaurantWithHours = Awaited<ReturnType<typeof getRestaurants>>[number];

export function getRestaurantBySlug(slug: string) {
  return prisma.restaurant.findFirst({ where: { slug, isActive: true }, include: withHours });
}

export function getRestaurantById(id: string) {
  return prisma.restaurant.findFirst({ where: { id, isActive: true }, include: withHours });
}

/* Le restaurant est-il prêt à prendre des commandes (actif, interrupteur ouvert, ville renseignée) ? */
export function acceptsOrders(r: Pick<RestaurantWithHours, 'isActive' | 'orderingEnabled'>) {
  return r.isActive && r.orderingEnabled;
}

export const hoursOf = (r: { hours: DayHours[] }): DayHours[] => r.hours;

/* Modes proposés : à emporter (formule Essentiel), livraison si l'option O5 est activée */
export async function availableModes(): Promise<Mode[]> {
  const settings = await getSettings();
  const options = makeOptions(settings.enabledOptions);
  const modes: Mode[] = [];
  if (settings.modeSurplace) modes.push('SURPLACE');
  if (settings.modeEmporter || !settings.modeSurplace) modes.push('EMPORTER');
  if (options.has(OPTION.DELIVERY) && settings.modeLivraison) modes.push('LIVRAISON');
  return modes;
}

/* Fenêtre de commande d'un restaurant : ouvert maintenant, créneaux du jour, délai */
export async function restaurantWindow(r: RestaurantWithHours, mode: Mode) {
  const settings = await getSettings();
  const lead = mode === 'LIVRAISON' ? settings.deliveryMinutes : r.prepMinutes;
  return {
    enabled: acceptsOrders(r) && settings.orderingEnabled,
    status: openStatus(r.hours),
    slots: timeSlots(r.hours, lead, r.slotInterval),
    lead,
  };
}
