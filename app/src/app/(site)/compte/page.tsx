import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getCatalog, getZones } from '@/lib/catalog';
import { Account } from './Account';

export const metadata: Metadata = { title: 'Mon compte', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/connexion?retour=/compte');

  const [user, orders, zones, catalog] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, include: { addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] }, favorites: true } }),
    prisma.order.findMany({ where: { userId: session.user.id, status: { not: 'PENDING_PAYMENT' } }, include: { items: true }, orderBy: { createdAt: 'desc' }, take: 50 }),
    getZones(),
    getCatalog(),
  ]);
  if (!user) redirect('/connexion');

  const favIds = new Set(user.favorites.map(f => f.productId));
  return (
    <Account
      user={{ name: user.name ?? '', email: user.email, phone: user.phone ?? '', marketingOptIn: user.marketingOptIn, createdAt: user.createdAt.toISOString(), isStaff: user.role !== 'CUSTOMER' }}
      orders={orders.map(o => ({
        id: o.id, number: o.number, token: o.trackingToken, mode: o.mode, status: o.status, total: o.total, createdAt: o.createdAt.toISOString(), hasInvoice: !!o.invoiceNumber,
        items: o.items.map(i => ({ name: i.name, qty: i.qty, unitPrice: i.unitPrice, details: i.details, config: i.config as object })),
      }))}
      addresses={user.addresses.map(a => ({ id: a.id, label: a.label, line1: a.line1, extra: a.extra ?? '', postalCode: a.postalCode, city: a.city, isDefault: a.isDefault }))}
      zones={zones.map(z => ({ id: z.id, city: z.city }))}
      favorites={catalog.products.filter(p => favIds.has(p.id))}
      pizzas={catalog.products.filter(p => p.kind === 'PIZZA')}
    />
  );
}
