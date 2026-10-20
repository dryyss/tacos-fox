import 'server-only';
import type Stripe from 'stripe';
import { prisma } from './prisma';
import { getStripe, paymentSimulated } from './stripe';

export class RefundError extends Error {}

/* Remboursement total ou partiel d'une commande payée par carte (montant en centimes). */
export async function refundOrder(orderId: string, amount: number, reason: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new RefundError('Commande introuvable.');
  if (order.paymentMethod !== 'CARD' || (order.paymentStatus !== 'PAID' && order.paymentStatus !== 'PARTIALLY_REFUNDED')) {
    throw new RefundError('Seules les commandes payées par carte peuvent être remboursées en ligne.');
  }
  const remaining = order.total - order.refundedAmount;
  if (!Number.isInteger(amount) || amount <= 0 || amount > remaining) throw new RefundError(`Montant invalide (maximum ${(remaining / 100).toFixed(2)} €).`);

  if (!paymentSimulated()) {
    if (!order.stripePaymentIntentId) throw new RefundError('Paiement Stripe introuvable pour cette commande.');
    await getStripe().refunds.create({ payment_intent: order.stripePaymentIntentId, amount, metadata: { orderId } }, { idempotencyKey: `refund-${orderId}-${order.refundedAmount}-${amount}` });
  }
  return applyRefund(orderId, order.refundedAmount + amount, reason);
}

async function applyRefund(orderId: string, refundedTotal: number, reason: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  if (refundedTotal <= order.refundedAmount) return order;
  const full = refundedTotal >= order.total;
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { refundedAmount: refundedTotal, paymentStatus: full ? 'REFUNDED' : 'PARTIALLY_REFUNDED' },
  });
  await prisma.orderEvent.create({ data: { orderId, message: `${full ? 'Remboursement total' : 'Remboursement partiel'} : ${((refundedTotal - order.refundedAmount) / 100).toFixed(2).replace('.', ',')} € (${reason})` } });
  return updated;
}

/* Remboursement fait depuis le tableau de bord Stripe : on aligne la commande. */
export async function syncRefund(charge: Stripe.Charge) {
  const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  if (!pi) return;
  const order = await prisma.order.findFirst({ where: { stripePaymentIntentId: pi } });
  if (order) await applyRefund(order.id, charge.amount_refunded, 'via Stripe');
}
