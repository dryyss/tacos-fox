import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { cancelUnpaidOrder, markOrderPaid } from '@/lib/orders';
import { syncRefund } from '@/lib/refunds';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get('stripe-signature');
  if (!secret || !signature) return NextResponse.json({ error: 'Webhook non configuré' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const s = event.data.object;
      if (s.payment_status === 'paid' && s.metadata?.orderId) {
        await markOrderPaid(s.metadata.orderId, { sessionId: s.id, paymentIntentId: typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id ?? null });
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
      await syncRefund(event.data.object);
      break;
    }
  }
  return NextResponse.json({ received: true });
}
