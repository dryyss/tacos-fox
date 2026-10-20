/* Moteur de prix unique. Côté client il sert à l'affichage ; côté serveur il fait foi :
   le montant encaissé est toujours recalculé ici à partir des identifiants envoyés. */
import type { CartLineInput, CatalogGroup, CatalogProduct, CatalogSize } from './catalog-types';

export const MAX_QTY = 20;

export class PricingError extends Error {
  constructor(message: string, public groupKey?: string) {
    super(message);
    this.name = 'PricingError';
  }
}

export interface PricedLine {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  details: string[];
  config: CartLineInput;
}

export function effectiveMax(group: CatalogGroup, size: CatalogSize | undefined): number {
  return group.maxFromSize && size ? size.includedQty : group.max;
}

/* « Kebab, Kebab, Escalope » -> « Kebab x2, Escalope » */
function describe(labels: string[]): string {
  const counts = new Map<string, number>();
  labels.forEach(l => counts.set(l, (counts.get(l) ?? 0) + 1));
  return [...counts].map(([l, n]) => (n > 1 ? `${l} x${n}` : l)).join(', ');
}

export function lineName(product: CatalogProduct, size?: CatalogSize): string {
  if (product.kind === 'TACOS') return `Tacos ${size?.label ?? ''}`.trim();
  if (product.kind === 'PIZZA') return `Pizza ${product.name}`;
  return product.name;
}

/* Valide une ligne et calcule son prix. `catalog` sert à résoudre la pizza offerte. */
export function priceLine(
  product: CatalogProduct | undefined,
  input: CartLineInput,
  catalog: Pick<CatalogProduct, 'id' | 'name' | 'kind' | 'isAvailable'>[] = [],
): PricedLine {
  if (!product) throw new PricingError('Ce produit n\'est plus disponible.');
  if (!product.isAvailable) throw new PricingError(`${product.name} est en rupture pour le moment.`);

  const qty = Math.trunc(input.qty);
  if (!(qty >= 1 && qty <= MAX_QTY)) throw new PricingError(`Quantité invalide pour ${product.name}.`);

  let size: CatalogSize | undefined;
  if (product.sizes.length) {
    size = product.sizes.find(s => s.code === input.sizeCode);
    if (!size) throw new PricingError(`Choisissez une taille pour ${product.name}.`);
  }

  let unit = size ? size.price : product.price;
  const details: string[] = [];
  if (size && product.kind !== 'TACOS') details.push(size.label);

  const selections = input.selections ?? {};
  const known = new Set(product.groups.map(g => g.key));
  for (const key of Object.keys(selections)) {
    if (!known.has(key)) throw new PricingError(`Option inconnue pour ${product.name}.`);
  }

  for (const group of product.groups) {
    const ids = selections[group.key] ?? [];
    const max = effectiveMax(group, size);
    if (ids.length < group.min) throw new PricingError(`Il manque un choix : ${group.label.toLowerCase()}.`, group.key);
    if (ids.length > max) throw new PricingError(`${max} maximum pour « ${group.label} ».`, group.key);
    if (!group.allowRepeat && new Set(ids).size !== ids.length) throw new PricingError(`Choix en double dans « ${group.label} ».`, group.key);

    const labels: string[] = [];
    for (const id of ids) {
      const choice = group.choices.find(c => c.id === id);
      if (!choice) throw new PricingError(`Un choix de « ${group.label} » n'existe plus.`, group.key);
      if (!choice.isAvailable) throw new PricingError(`${choice.label} est en rupture.`, group.key);
      unit += choice.price;
      labels.push(choice.label);
    }
    if (labels.length) details.push(group.key === 'cheeses' ? 'Suppl. ' + describe(labels) : group.key === 'gratin' ? 'Gratiné ' + labels[0].toLowerCase() : describe(labels));
    else if (group.key === 'sauces') details.push('Sans sauce');
  }

  if (product.kind === 'PIZZA' && size?.bogo) {
    const freeId = input.freePizzaId || product.id;
    const free = catalog.find(p => p.id === freeId) ?? (freeId === product.id ? product : undefined);
    if (!free || free.kind !== 'PIZZA' || !free.isAvailable) throw new PricingError('La pizza offerte choisie n\'est pas disponible.', 'free');
    details.push('Pizza offerte : ' + free.name);
  }

  if (!product.sizes.length && !product.groups.length && product.formula) details.push(product.formula);

  return {
    productId: product.id,
    name: lineName(product, size),
    qty,
    unitPrice: unit,
    lineTotal: unit * qty,
    details,
    config: { productId: product.id, qty, sizeCode: size?.code ?? null, selections, freePizzaId: input.freePizzaId ?? null },
  };
}

/* ---------- Totaux de commande ---------- */

export type Mode = 'SURPLACE' | 'EMPORTER' | 'LIVRAISON';

export interface ZoneRule {
  fee: number;
  freeFrom: number | null;
  minimum: number;
}

export interface PromoRule {
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minSubtotal: number;
}

export interface Totals {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  minimumMissing: number; // montant manquant pour atteindre le minimum de livraison
}

export function computeTotals(lines: Pick<PricedLine, 'lineTotal'>[], mode: Mode, zone?: ZoneRule | null, promo?: PromoRule | null): Totals {
  const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);

  let discount = 0;
  if (promo && subtotal >= promo.minSubtotal) {
    discount = promo.type === 'PERCENT' ? Math.round((subtotal * promo.value) / 100) : promo.value;
    discount = Math.min(discount, subtotal);
  }

  let deliveryFee = 0;
  let minimumMissing = 0;
  if (mode === 'LIVRAISON' && zone) {
    deliveryFee = zone.freeFrom != null && subtotal >= zone.freeFrom ? 0 : zone.fee;
    minimumMissing = Math.max(0, zone.minimum - subtotal);
  }

  return { subtotal, deliveryFee, discount, total: subtotal - discount + deliveryFee, minimumMissing };
}
