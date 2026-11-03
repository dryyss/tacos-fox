import 'server-only';
import type Stripe from 'stripe';
import { prisma } from './prisma';
import { getStripe } from './stripe';
import { appUrl } from './url';

/* R5 : comptes Stripe Standard des sociétés, reliés au compte plateforme par Stripe Connect.
   Chaque société reste propriétaire de son compte ; les paiements y sont créés directement, sans commission. */

const returnUrl = (id: string) => `${appUrl()}/admin/paiements?retour=${id}`;

/* Crée (si besoin) le compte de la société du restaurant et renvoie le lien d'ouverture Stripe à remplir avec le gérant */
export async function onboardingLink(restaurantId: string): Promise<string> {
  const r = await prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId } });
  let account = r.stripeAccountId;
  if (!account) {
    const created = await getStripe().accounts.create({
      type: 'standard',
      country: 'FR',
      business_type: 'company',
      company: { name: r.legalName || undefined },
      business_profile: { name: `${r.name} ${r.city}`, mcc: '5814', url: `${appUrl()}/restaurants/${r.slug}` },
      metadata: { restaurantId: r.id, siren: r.siren },
    });
    account = created.id;
    await prisma.restaurant.update({ where: { id: r.id }, data: { stripeAccountId: account, stripeChargesEnabled: false } });
  }
  const link = await getStripe().accountLinks.create({ account, type: 'account_onboarding', refresh_url: returnUrl(r.id), return_url: returnUrl(r.id) });
  return link.url;
}

/* Statut à jour depuis Stripe (retour d'ouverture, bouton « Actualiser ») */
export async function refreshAccount(restaurantId: string) {
  const r = await prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId }, select: { stripeAccountId: true } });
  if (!r.stripeAccountId) return;
  await syncConnectedAccount(await getStripe().accounts.retrieve(r.stripeAccountId));
}

/* Webhook account.updated : tous les restaurants qui encaissent sur ce compte suivent son statut */
export async function syncConnectedAccount(account: Stripe.Account) {
  await prisma.restaurant.updateMany({ where: { stripeAccountId: account.id }, data: { stripeChargesEnabled: !!account.charges_enabled } });
}

/* Une société qui exploite plusieurs restaurants n'a qu'un compte : on le partage */
export async function shareAccount(restaurantId: string, fromRestaurantId: string) {
  const from = await prisma.restaurant.findUniqueOrThrow({ where: { id: fromRestaurantId }, select: { stripeAccountId: true, stripeChargesEnabled: true } });
  if (!from.stripeAccountId) throw new Error('Ce restaurant n\'a pas encore de compte.');
  await prisma.restaurant.update({ where: { id: restaurantId }, data: { stripeAccountId: from.stripeAccountId, stripeChargesEnabled: from.stripeChargesEnabled } });
}

/* Délie le compte d'un restaurant (le compte Stripe lui-même n'est pas supprimé) */
export async function unlinkAccount(restaurantId: string) {
  await prisma.restaurant.update({ where: { id: restaurantId }, data: { stripeAccountId: null, stripeChargesEnabled: false } });
}
