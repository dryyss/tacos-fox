import 'server-only';
import { prisma } from './prisma';
import { scopeWhere } from './admin';

/* R1/R2 : commandes en cours + celles terminées dans les 3 dernières heures, pour l'écran cuisine.
   scope : restaurants visibles (null = tous) ; restaurantId : un seul restaurant affiché.
   Ordre : la plus ancienne en haut. Une commande pour plus tard prend sa place au moment où il faut
   la lancer (heure de retrait moins le délai de préparation) : elle reste en bas tant qu'elle n'est pas urgente. */
export async function getBoardOrders(scope: string[] | null, restaurantId?: string | null) {
  const since = new Date(Date.now() - 3 * 3600 * 1000);
  const orders = await prisma.order.findMany({
    where: {
      AND: [
        scopeWhere(scope),
        restaurantId ? { restaurantId } : {},
        { OR: [
          { status: { in: ['RECEIVED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] } },
          { status: { in: ['COMPLETED', 'CANCELLED'] }, updatedAt: { gte: since } },
        ] },
      ],
    },
    include: { items: true, restaurant: { select: { name: true, city: true, addressLine1: true, prepMinutes: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const prep = (o: (typeof orders)[number]) => (o.restaurant?.prepMinutes ?? 15) * 60_000;
  const due = (o: (typeof orders)[number]) => (o.scheduledFor ?? new Date(o.createdAt.getTime() + prep(o))).getTime();
  // Moment où la cuisine doit lancer la commande : tout de suite (dès que possible) ou avant l'heure choisie
  const startAt = (o: (typeof orders)[number]) => (o.scheduledFor ? Math.max(o.createdAt.getTime(), o.scheduledFor.getTime() - prep(o)) : o.createdAt.getTime());
  return orders.sort((a, b) => startAt(a) - startAt(b) || a.number - b.number).map(o => ({
    id: o.id, number: o.number, mode: o.mode, status: o.status, asap: o.asap,
    scheduledFor: o.scheduledFor?.toISOString() ?? null, dueAt: new Date(due(o)).toISOString(), startAt: new Date(startAt(o)).toISOString(),
    prepMinutes: prep(o) / 60_000,
    createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString(),
    restaurant: o.restaurant ? `${o.restaurant.city}, ${o.restaurant.addressLine1}` : null,
    customerName: o.customerName, customerPhone: o.customerPhone,
    address: o.mode === 'LIVRAISON' ? [o.addressLine1, o.addressExtra, `${o.postalCode ?? ''} ${o.city ?? ''}`.trim()].filter(Boolean).join(', ') : null,
    note: o.note, total: o.total, paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus, printedAt: o.printedAt?.toISOString() ?? null,
    items: o.items.map(i => ({ id: i.id, name: i.name, qty: i.qty, details: i.details })),
  }));
}
export type BoardOrder = Awaited<ReturnType<typeof getBoardOrders>>[number];

/* Restaurants proposés dans les onglets de l'écran cuisine, selon le périmètre */
export async function boardRestaurants(scope: string[] | null) {
  const rows = await prisma.restaurant.findMany({ where: scope ? { id: { in: scope } } : {}, orderBy: { sortOrder: 'asc' }, select: { id: true, slug: true, name: true, city: true, addressLine1: true } });
  return rows.map(r => ({ id: r.id, slug: r.slug, label: `${r.city}, ${r.addressLine1}` }));
}
