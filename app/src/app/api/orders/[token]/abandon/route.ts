import { NextResponse } from 'next/server';
import { limited } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { cancelUnpaidOrder } from '@/lib/orders';
import { getStripe, onAccount, stripeEnabled } from '@/lib/stripe';

/* Retour « annuler » depuis Stripe : on expire la session et on libère stock et code promo */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const tooMany = limited(req, 'abandon');
  if (tooMany) return tooMany;
  const { token } = await params;
  const order = await prisma.order.findUnique({ where: { trackingToken: token }, select: { id: true, status: true, stripeSessionId: true, stripeAccountId: true } });
  if (!order || order.status !== 'PENDING_PAYMENT') return NextResponse.json({ ok: true });
  if (order.stripeSessionId && stripeEnabled()) {
    const session = await getStripe().checkout.sessions.retrieve(order.stripeSessionId, {}, onAccount(order.stripeAccountId));
    if (session.status === 'complete') return NextResponse.json({ ok: true }); // payé entre-temps : le webhook s'en charge
    if (session.status === 'open') await getStripe().checkout.sessions.expire(order.stripeSessionId, {}, onAccount(order.stripeAccountId));
  }
  await cancelUnpaidOrder(order.id, 'Paiement abandonné par le client');
  return NextResponse.json({ ok: true });
}
