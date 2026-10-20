import 'server-only';
import { prisma } from './prisma';
import type { Catalog, CatalogProduct } from './catalog-types';
import type { DayHours } from './hours';
import { withMenuPhoto } from './menu-photos';

const productInclude = {
  category: { select: { slug: true } },
  sizes: { orderBy: { sortOrder: 'asc' } },
  optionGroups: { orderBy: { sortOrder: 'asc' }, include: { choices: { orderBy: { sortOrder: 'asc' } } } },
} as const;

type ProductRow = Awaited<ReturnType<typeof loadRows>>[number];
function loadRows(where: object) {
  return prisma.product.findMany({ where, include: productInclude, orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }] });
}

function toCatalogProduct(p: ProductRow): CatalogProduct {
  return {
    id: p.id, slug: p.slug, categorySlug: p.category.slug, kind: p.kind, name: p.name, description: p.description,
    formula: p.formula, range: p.range, price: p.price, priceFrom: p.priceFrom, badges: p.badges, allergens: p.allergens,
    imageUrl: withMenuPhoto(p.slug, p.imageUrl), tbc: p.tbc, isFeatured: p.isFeatured,
    isAvailable: p.isAvailable && (p.stock === null || p.stock > 0),
    sizes: p.sizes.map(s => ({ code: s.code, label: s.label, hint: s.hint, price: s.price, includedQty: s.includedQty, bogo: s.bogo })),
    groups: p.optionGroups.map(g => ({
      id: g.id, key: g.key, label: g.label, hint: g.hint, min: g.min, max: g.max, maxFromSize: g.maxFromSize, allowRepeat: g.allowRepeat,
      choices: g.choices.map(c => ({ id: c.id, label: c.label, price: c.price, isAvailable: c.isAvailable })),
    })),
  };
}

/* Carte publique : catégories visibles et produits non masqués */
export async function getCatalog(): Promise<Catalog> {
  const [categories, rows] = await Promise.all([
    prisma.category.findMany({ where: { isVisible: true }, orderBy: { sortOrder: 'asc' } }),
    loadRows({ isHidden: false, category: { isVisible: true } }),
  ]);
  return {
    categories: categories.map(c => ({ slug: c.slug, label: c.label, description: c.description })),
    products: rows.map(toCatalogProduct),
  };
}

/* Produits demandés par un panier (y compris la pizza offerte), pour le recalcul serveur */
export async function getProductsForPricing(ids: string[]): Promise<CatalogProduct[]> {
  const rows = await loadRows({ id: { in: [...new Set(ids)] }, isHidden: false, category: { isVisible: true } });
  return rows.map(toCatalogProduct);
}

export async function getSettings() {
  return (await prisma.settings.findUnique({ where: { id: 'main' } })) ?? (await prisma.settings.create({ data: { id: 'main' } }));
}

export async function getHours(): Promise<DayHours[]> {
  return prisma.openingHours.findMany({ orderBy: { dayOfWeek: 'asc' } });
}

export async function getZones() {
  return prisma.deliveryZone.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
}

/* Tout ce dont les pages publiques ont besoin pour l'en-tête, le pied de page et les infos */
export async function getRestaurant() {
  const [settings, hours, zones] = await Promise.all([getSettings(), getHours(), getZones()]);
  return { settings, hours, zones };
}
export type Restaurant = Awaited<ReturnType<typeof getRestaurant>>;
