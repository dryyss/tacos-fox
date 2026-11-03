import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { cancelUnpaidOrder, markOrderPaid } from '@/lib/orders';
import { syncRefund } from '@/lib/refunds';
import { syncConnectedAccount } from '@/lib/connect';

/* Deux points de terminaison Stripe peuvent viser cette route : celui du compte plateforme
   (STRIPE_WEBHOOK_SECRET) et celui des comptes connectés des restaurants (STRIPE_CONNECT_WEBHOOK_SECRET).
   Les paiements des restaurants (charges directes, R5) arrivent par le second, avec event.account. */
export async function POST(req: Request) {
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(Boolean) as string[];
  const signature = req.headers.get('stripe-signature');
  if (!secrets.length || !signature) return NextResponse.json({ error: 'Webhook non configuré' }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event | null = null;
  for (const secret of secrets) {
    try { event = getStripe().webhooks.constructEvent(body, signature, secret); break; } catch { /* secret suivant */ }
  }
  if (!event) return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  const account = event.account ?? null;

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const s = event.data.object;
      if (s.payment_status === 'paid' && s.metadata?.orderId) {
        await markOrderPaid(s.metadata.orderId, {
          sessionId: s.id,
          paymentIntentId: typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id ?? null,
          account,
          amount: s.amount_total,
        });
      }
      break;
    }
    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed': {
      const s = event.data.object;
      if (s.metadata?.orderId) await cancelUnpaidOrder(s.metadata.orderId, 'Paiement non abouti');
      break;
    }
    case 'charge.refunded': {
      await syncRefund(event.data.object, account);
      break;
    }
    case 'account.updated': {
      await syncConnectedAccount(event.data.object);
      break;
    }
  }
  return NextResponse.json({ received: true });
}
