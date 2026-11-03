import 'server-only';
import { prisma } from './prisma';
import { getStripe, onAccount, stripeEnabled } from './stripe';
import { cancelUnpaidOrder, markOrderPaid } from './orders';

/* Filet de sécurité des paiements (R1, R5).
   Normalement c'est le webhook Stripe qui confirme le paiement et envoie la commande en cuisine.
   S'il n'arrive pas (réglage manquant, panne passagère), la commande resterait « en attente de paiement »
   alors que le client a payé. Ici on interroge directement Stripe pour ces commandes : payée, elle part en
   cuisine ; expirée, elle est annulée. markOrderPaid est idempotent : aucun risque de doublon avec le webhook. */

type Pending = { id: string; stripeSessionId: string | null; stripeAccountId: string | null };

const lastCheck = new Map<string, number>();
let lastSweep = 0;

export async function checkOrderPayment(order: Pending, minGapMs = 8_000): Promise<void> {
  if (!order.stripeSessionId || !stripeEnabled()) return;
  const now = Date.now();
  if (now - (lastCheck.get(order.id) ?? 0) < minGapMs) return;
  lastCheck.set(order.id, now);
  try {
    const s = await getStripe().checkout.sessions.retrieve(order.stripeSessionId, {}, onAccount(order.stripeAccountId));
    if (s.payment_status === 'paid') {
      await markOrderPaid(order.id, {
        sessionId: s.id,
        paymentIntentId: typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id ?? null,
        account: order.stripeAccountId, // session lue sur le compte de la commande
        amount: s.amount_total,
      });
    } else if (s.status === 'expired') {
      await cancelUnpaidOrder(order.id, 'Paiement non abouti');
    }
  } catch (e) {
    console.error(`Vérification du paiement ${order.id} :`, e);
  }
}

/* Toutes les commandes en attente de paiement des 3 dernières heures (au plus une fois par minute et par instance) */
export async function checkPendingPayments(minGapMs = 60_000): Promise<number> {
  if (!stripeEnabled()) return 0;
  const now = Date.now();
  if (now - lastSweep < minGapMs) return 0;
  lastSweep = now;
  const pending = await prisma.order.findMany({
    where: { status: 'PENDING_PAYMENT', paymentStatus: 'UNPAID', stripeSessionId: { not: null }, createdAt: { gte: new Date(now - 3 * 3600_000), lte: new Date(now - 30_000) } },
    select: { id: true, stripeSessionId: true, stripeAccountId: true },
    orderBy: { createdAt: 'asc' },
    take: 30,
  });
  for (const o of pending) await checkOrderPayment(o, 0);
  return pending.length;
}
