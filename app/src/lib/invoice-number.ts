import type { Prisma } from '@prisma/client';

/* R4 : numéro de facture séquentiel sans trou, propre à la société du restaurant et à l'année : F-LSF-2026-00001.
   Une commande sans restaurant (anciennes données) garde la série commune F-2026-00001. Idempotent. */
export async function assignInvoiceNumber(tx: Prisma.TransactionClient, orderId: string, restaurantId: string | null) {
  const current = await tx.order.findUnique({ where: { id: orderId }, select: { invoiceNumber: true } });
  if (current?.invoiceNumber) return current.invoiceNumber;
  const year = new Date().getFullYear();
  const code = restaurantId ? (await tx.restaurant.findUnique({ where: { id: restaurantId }, select: { code: true } }))?.code : undefined;
  const prefix = code ? `F-${code}-${year}` : `F-${year}`;
  const key = code ? `invoice-${code}-${year}` : `invoice-${year}`;
  const counter = await tx.counter.upsert({ where: { key }, create: { key, value: 1 }, update: { value: { increment: 1 } } });
  const invoiceNumber = `${prefix}-${String(counter.value).padStart(5, '0')}`;
  await tx.order.update({ where: { id: orderId }, data: { invoiceNumber, invoicedAt: new Date() } });
  return invoiceNumber;
}
