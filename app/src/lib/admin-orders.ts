import 'server-only';
import { prisma } from './prisma';

/* Commandes en cours + celles terminées dans les 3 dernières heures, pour le tableau du service */
export async function getBoardOrders() {
  const since = new Date(Date.now() - 3 * 3600 * 1000);
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { status: { in: ['RECEIVED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] } },
        { status: { in: ['COMPLETED', 'CANCELLED'] }, updatedAt: { gte: since } },
      ],
    },
    include: { items: true },
    orderBy: { createdAt: 'asc' },
  });
  return orders.map(o => ({
    id: o.id, number: o.number, mode: o.mode, status: o.status, asap: o.asap,
    scheduledFor: o.scheduledFor?.toISOString() ?? null, createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString(),
    customerName: o.customerName, customerPhone: o.customerPhone,
    address: o.mode === 'LIVRAISON' ? [o.addressLine1, o.addressExtra, `${o.postalCode ?? ''} ${o.city ?? ''}`.trim()].filter(Boolean).join(', ') : null,
    note: o.note, total: o.total, paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus, printedAt: o.printedAt?.toISOString() ?? null,
    items: o.items.map(i => ({ id: i.id, name: i.name, qty: i.qty, details: i.details })),
  }));
}
export type BoardOrder = Awaited<ReturnType<typeof getBoardOrders>>[number];
