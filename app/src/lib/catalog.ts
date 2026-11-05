import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { Catalog, CatalogProduct } from './catalog-types';
import type { DayHours } from './hours';
import { optionPhoto, withMenuPhoto } from './menu-photos';

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
      id: g.id, key: g.key, label: g.label, hint: g.hint, min: g.min, max: g.max, maxFromSize: g.maxFromSize, allowRepeat: g.allowRepeat, sizeCodes: g.sizeCodes,
      choices: g.choices.map(c => ({ id: c.id, label: c.label, price: c.price, isAvailable: c.isAvailable, imageUrl: optionPhoto(c.label) })),
    })),
  };
}

/* Produits visibles. Avec un restaurant (C3) : carte commune + produits réservés à ce restaurant,
   sans ceux qu'il a masqués (rupture, carte spécifique). */
function visibleWhere(restaurantId?: string): Prisma.ProductWhereInput {
  const base: Prisma.ProductWhereInput = { isHidden: false, category: { isVisible: true } };
  if (!restaurantId) return { ...base, restaurants: { none: {} } };
  return {
    ...base,
    OR: [{ restaurants: { none: {} } }, { restaurants: { some: { id: restaurantId } } }],
    overrides: { none: { restaurantId, isHidden: true } },
  };
}

/* Prix propres au restaurant (carte spécifique du 5e) appliqués au produit */
async function withRestaurantPrices(products: CatalogProduct[], restaurantId?: string): Promise<CatalogProduct[]> {
  if (!restaurantId) return products;
  const overrides = await prisma.productOverride.findMany({ where: { restaurantId, OR: [{ price: { not: null } }, { sizePrices: { not: Prisma.AnyNull } }] } });
  if (!overrides.length) return products;
  const byId = new Map(overrides.map(o => [o.productId, o]));
  return products.map(p => {
    const o = byId.get(p.id);
    if (!o) return p;
    const sizePrices = (o.sizePrices ?? {}) as Record<string, number>;
    const sizes = p.sizes.map(sz => (Number.isInteger(sizePrices[sz.code]) ? { ...sz, price: sizePrices[sz.code] } : sz));
    return { ...p, price: o.price ?? (sizes.length ? Math.min(...sizes.map(sz => sz.price)) : p.price), sizes };
  });
}

/* Carte publique d'un restaurant (sans restaurant : la carte commune, pour l'accueil et les allergènes) */
export async function getCatalog(restaurantId?: string): Promise<Catalog> {
  const [categories, rows] = await Promise.all([
    prisma.category.findMany({ where: { isVisible: true }, orderBy: { sortOrder: 'asc' } }),
    loadRows(visibleWhere(restaurantId)),
  ]);
  return {
    categories: categories.map(c => ({ slug: c.slug, label: c.label, description: c.description })),
    products: await withRestaurantPrices(rows.map(toCatalogProduct), restaurantId),
  };
}

/* Produits demandés par un panier (y compris la pizza offerte), au prix du restaurant, pour le recalcul serveur */
export async function getProductsForPricing(ids: string[], restaurantId: string): Promise<CatalogProduct[]> {
  const rows = await loadRows({ id: { in: [...new Set(ids)] }, ...visibleWhere(restaurantId) });
  return withRestaurantPrices(rows.map(toCatalogProduct), restaurantId);
}

export async function getSettings() {
  return (await prisma.settings.findUnique({ where: { id: 'main' } })) ?? (await prisma.settings.create({ data: { id: 'main' } }));
}

export async function getHours(): Promise<DayHours[]> {
  return prisma.openingHours.findMany({ orderBy: { dayOfWeek: 'asc' } });
}

/* Zones de livraison : vides tant que l'option O5 (livraison) n'est pas achetée */
export async function getZones() {
  const settings = await getSettings();
  if (!settings.enabledOptions.includes('O5')) return [];
  return prisma.deliveryZone.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
}

/* Tout ce dont les pages publiques ont besoin pour l'en-tête, le pied de page et les infos */
export async function getRestaurant() {
  const [settings, hours, zones] = await Promise.all([getSettings(), getHours(), getZones()]);
  return { settings, hours, zones };
}
export type Restaurant = Awaited<ReturnType<typeof getRestaurant>>;
