import 'server-only';
import { cookies } from 'next/headers';
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

/* Restaurant choisi par le client (C2) : cookie posé par /r/[slug] (liste, page restaurant, QR code) */
export const RESTAURANT_COOKIE = 'tfx_restaurant';
export async function getCurrentRestaurant() {
  const slug = (await cookies()).get(RESTAURANT_COOKIE)?.value;
  return slug ? getRestaurantBySlug(slug) : null;
}

/* « Tacos Fox Stains » et « 36 avenue Marcel Cachin » : l'enseigne est commune, l'adresse distingue */
/* « Tacos Fox Stains · Marcel Cachin » : le repère distingue deux restaurants d'une même ville */
export const restaurantTitle = (r: { name: string; city: string; label?: string | null }) => `${r.name} ${r.city}${r.label ? ` · ${r.label}` : ''}`;
export const restaurantAddress = (r: { addressLine1: string; postalCode: string; city: string }) => [r.addressLine1, `${r.postalCode} ${r.city}`].filter(Boolean).join(', ');

export function getRestaurantById(id: string) {
  return prisma.restaurant.findFirst({ where: { id, isActive: true }, include: withHours });
}

/* Le restaurant est-il prêt à prendre des commandes (actif, interrupteur ouvert, ville renseignée) ? */
export function acceptsOrders(r: Pick<RestaurantWithHours, 'isActive' | 'orderingEnabled'>) {
  return r.isActive && r.orderingEnabled;
}

export const hoursOf = (r: { hours: DayHours[] }): DayHours[] => r.hours;

/* Modes proposés : à emporter uniquement (formule Essentiel, C5), livraison si l'option O5 est activée.
   Le mode « sur place » ne fait pas partie de la formule. */
export async function availableModes(): Promise<Mode[]> {
  const settings = await getSettings();
  const options = makeOptions(settings.enabledOptions);
  const modes: Mode[] = ['EMPORTER'];
  if (options.has(OPTION.DELIVERY) && settings.modeLivraison) modes.push('LIVRAISON');
  return modes;
}

/* Fenêtre de commande d'un restaurant : ouvert maintenant, créneaux du jour, délai.
   CDC : hors horaires, la commande est fermée pour ce restaurant (pas de précommande). */
export async function restaurantWindow(r: RestaurantWithHours, mode: Mode) {
  const settings = await getSettings();
  const lead = mode === 'LIVRAISON' ? settings.deliveryMinutes : r.prepMinutes;
  const status = openStatus(r.hours);
  return {
    enabled: acceptsOrders(r) && settings.orderingEnabled,
    status,
    slots: status.open ? timeSlots(r.hours, lead, r.slotInterval) : [],
    lead,
  };
}
