import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaffPage } from '@/lib/admin';
import { canUse } from '@/lib/features';
import { prisma } from '@/lib/prisma';
import { RestaurantEditor } from './RestaurantEditor';

export const metadata = { title: 'Restaurant' };

export default async function RestaurantAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaffPage('settings');
  const { id } = await params;
  const r = await prisma.restaurant.findUnique({ where: { id }, include: { hours: { orderBy: { dayOfWeek: 'asc' } }, overrides: true } });
  if (!r) notFound();
  const menuAllowed = canUse('menu', user.role, user.options);
  const products = menuAllowed ? await prisma.product.findMany({
    where: { OR: [{ restaurants: { none: {} } }, { restaurants: { some: { id } } }] },
    orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    select: { id: true, name: true, price: true, isHidden: true, category: { select: { label: true } }, sizes: { select: { id: true } } },
  }) : [];
  const overrides = new Map(r.overrides.map(o => [o.productId, o]));

  return (
    <>
      <Link className="back-link" href="/admin/restaurants">← Restaurants</Link>
      <h1 className="admin-title">{r.name} {r.city}</h1>
      <p className="admin-sub">{r.addressLine1}, {r.postalCode} {r.city} · <Link className="link" href={`/restaurants/${r.slug}`} target="_blank">voir la page</Link></p>
      <RestaurantEditor
        id={r.id}
        initial={{
          phone: r.phone, email: r.email, intro: r.intro, isActive: r.isActive, orderingEnabled: r.orderingEnabled,
          prepMinutes: r.prepMinutes, slotInterval: r.slotInterval, legalName: r.legalName, legalForm: r.legalForm,
          shareCapital: r.shareCapital, siren: r.siren, siret: r.siret, rcsCity: r.rcsCity, vatNumber: r.vatNumber, vatRate: r.vatRate,
        }}
        hours={r.hours.map(({ dayOfWeek, isOpen, open, close }) => ({ dayOfWeek, isOpen, open, close }))}
        products={products.filter(p => !p.isHidden).map(p => {
          const o = overrides.get(p.id);
          return { id: p.id, name: p.name, category: p.category.label, price: p.price, sized: p.sizes.length > 0, isHidden: o?.isHidden ?? false, ownPrice: o?.price ?? null };
        })}
      />
    </>
  );
}
