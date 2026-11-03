import { NextResponse } from 'next/server';
import { limited } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { checkOrderPayment } from '@/lib/payment-check';

/* Statut léger interrogé par la page de suivi */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const tooMany = limited(req, 'track');
  if (tooMany) return tooMany;
  const { token } = await params;
  let order = await prisma.order.findUnique({ where: { trackingToken: token }, select: { id: true, status: true, paymentStatus: true, updatedAt: true, stripeSessionId: true, stripeAccountId: true } });
  if (!order) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  // Client revenu de Stripe mais paiement pas encore confirmé par le webhook : on vérifie directement
  if (order.status === 'PENDING_PAYMENT') {
    await checkOrderPayment(order);
    order = (await prisma.order.findUnique({ where: { id: order.id }, select: { id: true, status: true, paymentStatus: true, updatedAt: true, stripeSessionId: true, stripeAccountId: true } }))!;
  }
  const { status, paymentStatus, updatedAt } = order;
  return NextResponse.json({ status, paymentStatus, updatedAt }, { headers: { 'Cache-Control': 'no-store' } });
}
