import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { withMenuPhoto } from '@/lib/menu-photos';
import { MenuAdmin } from './MenuAdmin';

export const metadata = { title: 'Carte' };

export default async function AdminMenuPage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { products: { orderBy: { sortOrder: 'asc' }, include: { sizes: { orderBy: { sortOrder: 'asc' } } } } },
  });
  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-title">La carte</h1>
          <p className="admin-sub" style={{ margin: 0 }}>Les changements sont en ligne immédiatement. « Dispo » décoché = rupture, le plat reste visible mais ne peut pas être commandé.</p>
        </div>
        <Link className="btn btn--primary btn--sm" href="/admin/carte/nouveau">Nouveau produit</Link>
      </div>
      <MenuAdmin categories={categories.map(c => ({
        id: c.id, label: c.label, description: c.description, isVisible: c.isVisible,
        products: c.products.map(p => ({
          id: p.id, name: p.name, price: p.sizes[0]?.price ?? p.price, sizes: p.sizes.length, isAvailable: p.isAvailable, isHidden: p.isHidden,
          isFeatured: p.isFeatured, tbc: p.tbc, stock: p.stock, imageUrl: withMenuPhoto(p.slug, p.imageUrl),
        })),
      }))} />
    </>
  );
}
