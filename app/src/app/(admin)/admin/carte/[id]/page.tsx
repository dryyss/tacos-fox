import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { withMenuPhoto } from '@/lib/menu-photos';
import { ProductEditor, type EditorProduct } from '../ProductEditor';

export const metadata = { title: 'Modifier un produit' };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, label: true } });

  let product: EditorProduct | null = null;
  if (id !== 'nouveau') {
    const p = await prisma.product.findUnique({
      where: { id },
      include: { sizes: { orderBy: { sortOrder: 'asc' } }, optionGroups: { orderBy: { sortOrder: 'asc' }, include: { choices: { orderBy: { sortOrder: 'asc' } } } } },
    });
    if (!p) notFound();
    product = {
      id: p.id, kind: p.kind, name: p.name, description: p.description, categoryId: p.categoryId, formula: p.formula, range: p.range,
      price: p.price, badges: p.badges, allergens: p.allergens, imageUrl: withMenuPhoto(p.slug, p.imageUrl), tbc: p.tbc, isAvailable: p.isAvailable,
      isHidden: p.isHidden, isFeatured: p.isFeatured, stock: p.stock,
      sizes: p.sizes.map(s => ({ code: s.code, label: s.label, hint: s.hint, price: s.price, bogo: s.bogo })),
      groups: p.optionGroups.map(g => ({
        id: g.id, key: g.key, label: g.label, min: g.min, max: g.max, maxFromSize: g.maxFromSize,
        choices: g.choices.map(c => ({ id: c.id, label: c.label, price: c.price, isAvailable: c.isAvailable })),
      })),
    };
  }

  return (
    <>
      <Link className="back-link" href="/admin/carte">← La carte</Link>
      <h1 className="admin-title">{product ? product.name : 'Nouveau produit'}</h1>
      <p className="admin-sub">Les prix sont en euros TTC. Le prix final est toujours recalculé par le serveur à la commande.</p>
      <ProductEditor product={product} categories={categories} />
    </>
  );
}
