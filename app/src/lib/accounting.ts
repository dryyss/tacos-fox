import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { parisClock, parisLocalToDate } from './hours';

/* Commandes encaissées (même partiellement remboursées) : base du chiffre d'affaires */
export const paidWhere: Prisma.OrderWhereInput = { paymentStatus: { in: ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'] } };

/* TTC -> HT et TVA, taux en points de base (1000 = 10 %) */
export function splitVat(ttc: number, vatRate: number) {
  const ht = Math.round((ttc * 10000) / (10000 + vatRate));
  return { ht, vat: ttc - ht };
}

/* Bornes d'une journée de Paris "AAAA-MM-JJ" en UTC */
export function parisDayRange(day: string) {
  const from = parisLocalToDate(`${day}T00:00`);
  const next = new Date(`${day}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
  return { from, to: parisLocalToDate(`${next.toISOString().slice(0, 10)}T00:00`) };
}

export const parisDay = (d: Date) => parisClock(d).date;

export async function revenueBetween(from: Date, to: Date) {
  const orders = await prisma.order.findMany({
    where: { ...paidWhere, createdAt: { gte: from, lt: to } },
    select: { total: true, refundedAmount: true, mode: true, paymentMethod: true, createdAt: true, discount: true, deliveryFee: true },
  });
  const net = (o: { total: number; refundedAmount: number }) => o.total - o.refundedAmount;
  const sum = (list: typeof orders) => list.reduce((a, o) => a + net(o), 0);
  const count = orders.filter(o => net(o) > 0).length;
  return {
    revenue: sum(orders),
    count,
    average: count ? Math.round(sum(orders) / count) : 0,
    refunds: orders.reduce((a, o) => a + o.refundedAmount, 0),
    discounts: orders.reduce((a, o) => a + o.discount, 0),
    deliveryFees: orders.reduce((a, o) => a + o.deliveryFee, 0),
    byMode: { SURPLACE: sum(orders.filter(o => o.mode === 'SURPLACE')), EMPORTER: sum(orders.filter(o => o.mode === 'EMPORTER')), LIVRAISON: sum(orders.filter(o => o.mode === 'LIVRAISON')) },
    byPayment: { CARD: sum(orders.filter(o => o.paymentMethod === 'CARD')), ONSITE: sum(orders.filter(o => o.paymentMethod === 'ONSITE')) },
    byDay: orders.reduce<Record<string, number>>((acc, o) => { const d = parisDay(o.createdAt); acc[d] = (acc[d] ?? 0) + net(o); return acc; }, {}),
  };
}

/* Meilleures ventes sur la période (quantités) */
export async function topProducts(from: Date, to: Date, take = 10) {
  const rows = await prisma.orderItem.groupBy({
    by: ['name'],
    where: { order: { ...paidWhere, status: { not: 'CANCELLED' }, createdAt: { gte: from, lt: to } } },
    _sum: { qty: true },
    orderBy: { _sum: { qty: 'desc' } },
    take,
  });
  return rows.map(r => ({ name: r.name, qty: r._sum.qty ?? 0 }));
}
