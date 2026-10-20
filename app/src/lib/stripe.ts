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

