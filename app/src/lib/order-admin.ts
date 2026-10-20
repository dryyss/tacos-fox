import 'server-only';
import type { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { restock } from './orders';
import { refundOrder } from './refunds';
import { notifyOrderStatus } from './email';
import { STATUS_LABELS } from './format';

export class OrderActionError extends Error {}

/* Enchaînement des statuts côté restaurant */
const NEXT: Partial<Record<OrderStatus, OrderStatus[]>> = {
  RECEIVED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['COMPLETED'],
};

export function nextStatus(mode: string, status: OrderStatus): OrderStatus | null {
  if (status === 'RECEIVED') return 'PREPARING';
  if (status === 'PREPARING') return mode === 'LIVRAISON' ? 'OUT_FOR_DELIVERY' : 'READY';
  if (status === 'READY' || status === 'OUT_FOR_DELIVERY') return 'COMPLETED';
  return null;
}

const CUSTOMER_MESSAGES: Partial<Record<OrderStatus, string>> = {
  READY: 'votre commande est prête',
  OUT_FOR_DELIVERY: 'votre commande est en route',
  CANCELLED: 'votre commande a été annulée',
};

/* Numéro de facture séquentiel par année, sans trou : F-2026-00001 */
async function assignInvoiceNumber(tx: Prisma.TransactionClient, orderId: string) {
  const year = new Date().getFullYear();
  const counter = await tx.counter.upsert({ where: { key: `invoice-${year}` }, create: { key: `invoice-${year}`, value: 1 }, update: { value: { increment: 1 } } });
  await tx.order.update({ where: { id: orderId }, data: { invoiceNumber: `F-${year}-${String(counter.value).padStart(5, '0')}`, invoicedAt: new Date() } });
}

export async function setOrderStatus(orderId: string, status: OrderStatus) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new OrderActionError('Commande introuvable.');
  if (!NEXT[order.status]?.includes(status)) throw new OrderActionError(`Passage « ${STATUS_LABELS[order.status]} » vers « ${STATUS_LABELS[status]} » impossible.`);
  if (status === 'OUT_FOR_DELIVERY' && order.mode !== 'LIVRAISON') throw new OrderActionError('Cette commande n\'est pas en livraison.');
  if (status === 'READY' && order.mode === 'LIVRAISON') throw new OrderActionError('Une livraison passe en « En livraison ».');
  if (status === 'CANCELLED') return cancelOrder(orderId, 'Annulée par le restaurant');
  if (status === 'COMPLETED' && order.paymentStatus === 'UNPAID') throw new OrderActionError('Encaissez la commande avant de la clôturer.');

  await prisma.$transaction(async tx => {
    await tx.order.update({ where: { id: orderId }, data: { status } });
    await tx.orderEvent.create({ data: { orderId, status, message: STATUS_LABELS[status] } });
    if (status === 'COMPLETED' && !order.invoiceNumber) await assignInvoiceNumber(tx, orderId);
  });
  if (CUSTOMER_MESSAGES[status]) await notifyOrderStatus(orderId, CUSTOMER_MESSAGES[status]!);
}

/* Encaissement au comptoir d'une commande « payer sur place » */
export async function markPaidOnsite(orderId: string) {
  const res = await prisma.order.updateMany({ where: { id: orderId, paymentMethod: 'ONSITE', paymentStatus: 'UNPAID', status: { not: 'CANCELLED' } }, data: { paymentStatus: 'PAID' } });
  if (!res.count) throw new OrderActionError('Commande déjà encaissée ou non éligible.');
  await prisma.orderEvent.create({ data: { orderId, message: 'Encaissée au comptoir' } });
}

/* Annulation : remboursement total si payée par carte, remise en stock */
export async function cancelOrder(orderId: string, reason: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new OrderActionError('Commande introuvable.');
  if (order.status === 'COMPLETED' || order.status === 'CANCELLED') throw new OrderActionError('Cette commande ne peut plus être annulée.');
  if (order.paymentMethod === 'CARD' && order.paymentStatus === 'PAID') await refundOrder(orderId, order.total - order.refundedAmount, reason);

  await prisma.$transaction(async tx => {
    await tx.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } });
    await restock(tx, order.items);
    await tx.orderEvent.create({ data: { orderId, status: 'CANCELLED', message: reason } });
  });
  await notifyOrderStatus(orderId, CUSTOMER_MESSAGES.CANCELLED!);
}

export async function markPrinted(orderId: string) {
  await prisma.order.update({ where: { id: orderId }, data: { printedAt: new Date() } });
}
