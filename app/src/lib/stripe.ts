import 'server-only';
import Stripe from 'stripe';

let client: Stripe | null = null;

export function stripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY manquant');
  return (client ??= new Stripe(process.env.STRIPE_SECRET_KEY));
}

/* Sans clé Stripe, en développement uniquement, le paiement carte est simulé. Jamais en production. */
export function paymentSimulated(): boolean {
  return !stripeEnabled() && process.env.NODE_ENV !== 'production';
}

export const stripeTestMode = () => !!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_');

/* Options d'appel Stripe sur le compte connecté d'une société (Connect, charges directes) */
export const onAccount = (account: string | null | undefined): Stripe.RequestOptions | undefined => (account ? { stripeAccount: account } : undefined);

/* R5 : chaque paiement est encaissé sur le compte Stripe de la société du restaurant, jamais sur un compte commun.
   Tant qu'un restaurant n'a pas de compte actif : refusé en production ; en mode test seulement, le compte
   plateforme de test sert aux essais. */
export function paymentAccount(r: { stripeAccountId: string | null; stripeChargesEnabled: boolean }): { ok: boolean; account: string | null } {
  if (paymentSimulated()) return { ok: true, account: null };
  if (r.stripeAccountId && r.stripeChargesEnabled) return { ok: true, account: r.stripeAccountId };
  return { ok: stripeTestMode(), account: null };
}
