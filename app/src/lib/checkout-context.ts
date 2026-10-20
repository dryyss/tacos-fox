import 'server-only';
import { auth } from '@/auth';
import { prisma } from './prisma';
import { getSettings, getZones } from './catalog';
import { orderingWindow } from './quote';
import { paymentSimulated, stripeEnabled } from './stripe';
import type { Mode } from './pricing';

/* Données serveur du tunnel : modes, zones, créneaux, moyens de paiement et profil connecté */
export async function getCheckoutContext() {
  const [settings, zones, session] = await Promise.all([getSettings(), getZones(), auth()]);
  const modes = (['SURPLACE', 'EMPORTER', 'LIVRAISON'] as Mode[]).filter(m => ({ SURPLACE: settings.modeSurplace, EMPORTER: settings.modeEmporter, LIVRAISON: settings.modeLivraison && zones.length > 0 })[m]);
  const windows = Object.fromEntries(await Promise.all(modes.map(async m => [m, await orderingWindow(m)] as const)));

  const user = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true, phone: true, addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] } } })
    : null;

  return {
    modes,
    windows,
    zones: zones.map(z => ({ id: z.id, city: z.city, postalCode: z.postalCode, fee: z.fee, freeFrom: z.freeFrom, minimum: z.minimum })),
    payments: {
      card: settings.acceptCard && (stripeEnabled() || paymentSimulated()),
      onsite: settings.acceptOnsite,
      simulated: paymentSimulated(),
    },
    orderingEnabled: settings.orderingEnabled,
    user: user && {
      name: user.name ?? '', email: user.email, phone: user.phone ?? '',
      addresses: user.addresses.map(a => ({ id: a.id, label: a.label, line1: a.line1, extra: a.extra ?? '', postalCode: a.postalCode, city: a.city, isDefault: a.isDefault })),
    },
  };
}
export type CheckoutContext = Awaited<ReturnType<typeof getCheckoutContext>>;
