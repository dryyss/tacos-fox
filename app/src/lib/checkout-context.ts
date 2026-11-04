import 'server-only';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from './prisma';
import { getSettings, getZones } from './catalog';
import { paymentAccount, paymentSimulated, stripeEnabled } from './stripe';
import { publicFeatures } from './features';
import { availableModes, getCurrentRestaurant, restaurantAddress, restaurantTitle, restaurantWindow } from './restaurants';

/* Données serveur du tunnel, pour le restaurant choisi : modes, créneaux selon ses horaires, paiement.
   Seul ce qui est inclus dans la formule ou acheté en option est exposé. Sans restaurant : choix d'abord (C2). */
export async function getCheckoutContext() {
  const [settings, session, modes, restaurant] = await Promise.all([getSettings(), auth(), availableModes(), getCurrentRestaurant()]);
  if (!restaurant) redirect('/restaurants?next=/panier');
  const features = publicFeatures(settings.enabledOptions);
  const zones = features.delivery ? await getZones() : [];
  const windows = Object.fromEntries(await Promise.all(modes.map(async m => [m, await restaurantWindow(restaurant, m)] as const)));

  const user = features.customerAccount && session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true, phone: true, addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] } } })
    : null;

  return {
    modes,
    windows,
    zones: zones.map(z => ({ id: z.id, city: z.city, postalCode: z.postalCode, fee: z.fee, freeFrom: z.freeFrom, minimum: z.minimum })),
    // C6 : carte en ligne sur le compte de la société du restaurant (R5), et paiement au comptoir
    // avec les moyens que ce restaurant accepte (espèces, titre-restaurant, chèques-vacances)
    payments: {
      card: (stripeEnabled() || paymentSimulated()) && paymentAccount(restaurant).ok,
      onsite: restaurant.onsiteMethods.length > 0,
      onsiteMethods: restaurant.onsiteMethods,
      simulated: paymentSimulated(),
    },
    features,
    orderingEnabled: settings.orderingEnabled && restaurant.isActive && restaurant.orderingEnabled,
    restaurant: { slug: restaurant.slug, title: restaurantTitle(restaurant), address: restaurantAddress(restaurant), phone: restaurant.phone },
    user: user && {
      name: user.name ?? '', email: user.email, phone: user.phone ?? '',
      addresses: user.addresses.map(a => ({ id: a.id, label: a.label, line1: a.line1, extra: a.extra ?? '', postalCode: a.postalCode, city: a.city, isDefault: a.isDefault })),
    },
  };
}
export type CheckoutContext = Awaited<ReturnType<typeof getCheckoutContext>>;
