import 'server-only';
import { z } from 'zod';
import type { Order, OrderStatus, Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { quoteCart, quoteSchema, orderingWindow } from './quote';
import { slotToDate } from './hours';
import { getSettings } from './catalog';
import { getStripe, paymentSimulated, stripeEnabled } from './stripe';
import { appUrl } from './url';
import { notifyOrderConfirmed } from './email';

const phoneRe = /^(\+33|0)[1-9](\d{2}){4}$/;

export const checkoutSchema = quoteSchema.extend({
  slot: z.union([z.literal('asap'), z.string().regex(/^\d{2}:\d{2}$/)]),
  customer: z.object({
    name: z.string().trim().min(1, 'Indiquez votre prénom').max(80),
    phone: z.string().transform(s => s.replace(/[\s.\-]/g, '')).pipe(z.string().regex(phoneRe, 'Numéro de téléphone invalide')),
    email: z.string().trim().toLowerCase().email('E-mail invalide').max(160),
  }),
  address: z.object({
    line1: z.string().trim().min(3, 'Indiquez votre adresse').max(160),
    extra: z.string().trim().max(160).optional().default(''),
  }).nullish(),
  note: z.string().trim().max(500).optional().default(''),
  payment: z.enum(['CARD', 'ONSITE']),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export class CheckoutError extends Error {}

export const orderNumber = (o: Pick<Order, 'number'>) => `TF-${String(o.number).padStart(4, '0')}`;

/* Crée la commande après recalcul complet côté serveur. Retourne l'URL où envoyer le client. */
export async function createOrder(input: CheckoutInput, userId: string | null): Promise<{ redirectUrl: string; trackingToken: string }> {
  const quote = await quoteCart(input);
  if (quote.errors.length) throw new CheckoutError(quote.errors[0]);
  if (input.promoCode && !quote.promo?.valid) throw new CheckoutError(quote.promo?.message ?? 'Code promo invalide.');

  const settings = await getSettings();
  if (input.payment === 'CARD' && !settings.acceptCard) throw new CheckoutError('Le paiement par carte est indisponible.');
  if (input.payment === 'ONSITE' && (!settings.acceptOnsite || input.mode === 'LIVRAISON')) throw new CheckoutError('Le paiement sur place n\'est pas possible pour cette commande.');
  if (input.payment === 'CARD' && !stripeEnabled() && !paymentSimulated()) throw new CheckoutError('Le paiement par carte n\'est pas encore configuré.');

  const window = await orderingWindow(input.mode);
  if (!window.enabled) throw new CheckoutError('Les commandes en ligne sont suspendues pour le moment.');
  if (input.slot === 'asap' && !window.status.open) throw new CheckoutError('Le restaurant est fermé, choisissez un créneau.');
  if (input.slot !== 'asap' && !window.slots.includes(input.slot)) throw new CheckoutError('Ce créneau n\'est plus disponible, choisissez-en un autre.');
  if (input.mode === 'LIVRAISON' && !input.address) throw new CheckoutError('Indiquez votre adresse de livraison.');

  const lines = quote.lines.map(l => l.line!);
  const { totals } = quote;

  const order = await prisma.$transaction(async tx => {
    // Décrément des stocks suivis, refus si insuffisant
    for (const l of lines) {
      const res = await tx.product.updateMany({ where: { id: l.productId, stock: { gte: l.qty } }, data: { stock: { decrement: l.qty } } });
      if (res.count === 0) {
        const p = await tx.product.findUnique({ where: { id: l.productId }, select: { stock: true, name: true } });
        if (p && p.stock !== null) throw new CheckoutError(`Plus assez de stock pour ${p.name}.`);
      }
    }
    if (quote.promo?.valid) await tx.promoCode.update({ where: { code: quote.promo.code }, data: { uses: { increment: 1 } } });

    return tx.order.create({
      data: {
        userId,
        mode: input.mode,
        status: input.payment === 'CARD' ? 'PENDING_PAYMENT' : 'RECEIVED',
        asap: input.slot === 'asap',
        scheduledFor: input.slot === 'asap' ? null : slotToDate(input.slot),
        customerName: input.customer.name,
        customerPhone: input.customer.phone,
        customerEmail: input.customer.email,
        addressLine1: input.mode === 'LIVRAISON' ? input.address!.line1 : null,
        addressExtra: input.mode === 'LIVRAISON' ? input.address!.extra || null : null,
        postalCode: quote.zone?.postalCode ?? null,
        city: quote.zone?.city ?? null,
        note: input.note || null,
        subtotal: totals.subtotal,
        deliveryFee: totals.deliveryFee,
        discount: totals.discount,
        total: totals.total,
        promoCode: quote.promo?.valid ? quote.promo.code : null,
        paymentMethod: input.payment,
        items: {
          create: lines.map(l => ({
            productId: l.productId, name: l.name, qty: l.qty, unitPrice: l.unitPrice, details: l.details,
            config: l.config as unknown as Prisma.InputJsonValue,
          })),
        },
        events: { create: { status: input.payment === 'CARD' ? 'PENDING_PAYMENT' : 'RECEIVED', message: 'Commande créée' } },
      },
      include: { items: true },
    });
  });

  const trackPath = `/suivi/${order.trackingToken}`;

  if (input.payment === 'ONSITE') {
    await notifyOrderConfirmed(order.id);
    return { redirectUrl: trackPath, trackingToken: order.trackingToken };
  }

  if (paymentSimulated()) {
    await markOrderPaid(order.id, { sessionId: null, paymentIntentId: null });
    return { redirectUrl: trackPath, trackingToken: order.trackingToken };
  }

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    customer_email: order.customerEmail,
    client_reference_id: order.id,
    metadata: { orderId: order.id },
    payment_intent_data: { metadata: { orderId: order.id } },
    locale: 'fr',
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'eur',
        unit_amount: order.total,
        product_data: { name: `${settings.name} · commande ${orderNumber(order)}`, description: order.items.map(i => `${i.qty} x ${i.name}`).join(', ').slice(0, 500) },
      },
    }],
    success_url: `${appUrl()}${trackPath}?paiement=ok`,
    cancel_url: `${appUrl()}/paiement?annule=${order.trackingToken}`,
  });
  await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
  return { redirectUrl: session.url!, trackingToken: order.trackingToken };
}

/* Paiement confirmé (webhook Stripe ou simulation) : la commande part en cuisine. Idempotent. */
export async function markOrderPaid(orderId: string, ids: { sessionId: string | null; paymentIntentId: string | null }) {
  const res = await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: 'UNPAID' },
    data: { paymentStatus: 'PAID', status: 'RECEIVED', stripePaymentIntentId: ids.paymentIntentId ?? undefined },
  });
  if (res.count === 0) return;
  await prisma.orderEvent.create({ data: { orderId, status: 'RECEIVED', message: 'Paiement carte accepté' } });
  await notifyOrderConfirmed(orderId);
}

/* Paiement abandonné ou expiré : on annule et on restitue stocks et utilisation du code promo. */
export async function cancelUnpaidOrder(orderId: string, reason: string) {
  await prisma.$transaction(async tx => {
    const order = await tx.order.findFirst({ where: { id: orderId, status: 'PENDING_PAYMENT', paymentStatus: 'UNPAID' }, include: { items: true } });
    if (!order) return;
    await tx.order.update({ where: { id: orderId }, data: { status: 'CANCELLED', paymentStatus: 'FAILED' } });
    await restock(tx, order.items);
    if (order.promoCode) await tx.promoCode.updateMany({ where: { code: order.promoCode, uses: { gt: 0 } }, data: { uses: { decrement: 1 } } });
    await tx.orderEvent.create({ data: { orderId, status: 'CANCELLED', message: reason } });
  });
}

export async function restock(tx: Prisma.TransactionClient, items: { productId: string | null; qty: number }[]) {
  for (const i of items) {
    if (i.productId) await tx.product.updateMany({ where: { id: i.productId, stock: { not: null } }, data: { stock: { increment: i.qty } } });
  }
}

/* Étapes de suivi affichées au client selon le mode */
export function trackingSteps(mode: Order['mode']): OrderStatus[] {
  return mode === 'LIVRAISON' ? ['RECEIVED', 'PREPARING', 'OUT_FOR_DELIVERY', 'COMPLETED'] : ['RECEIVED', 'PREPARING', 'READY', 'COMPLETED'];
}
