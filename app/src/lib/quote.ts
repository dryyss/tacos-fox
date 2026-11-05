import 'server-only';
import { z } from 'zod';

// Messages de validation en français
z.config(z.locales.fr());
import { prisma } from './prisma';
import { getProductsForPricing, getSettings } from './catalog';
import { computeTotals, DEAL_3_PLUS_1, MAX_QTY, offeredBottles, priceLine, PricingError, threePlusOneDiscount, type Mode, type PricedLine, type Totals } from './pricing';
import { publicFeatures } from './features';
import { availableModes } from './restaurants';

export const cartLineSchema = z.object({
  productId: z.string().min(1).max(64),
  qty: z.number().int().min(1).max(MAX_QTY),
  sizeCode: z.string().max(32).nullish(),
  selections: z.record(z.string().max(32), z.array(z.string().max(64)).max(20)).optional(),
  freePizzaId: z.string().max(64).nullish(),
});

export const quoteSchema = z.object({
  lines: z.array(cartLineSchema).min(1).max(50),
  mode: z.enum(['SURPLACE', 'EMPORTER', 'LIVRAISON']),
  zoneId: z.string().max(64).nullish(),
  promoCode: z.string().trim().toUpperCase().max(32).nullish(),
});
export type QuoteInput = z.infer<typeof quoteSchema>;

export interface LineResult {
  index: number;
  ok: boolean;
  line?: PricedLine;
  image?: string | null;
  error?: string;
}

export interface Quote {
  lines: LineResult[];
  totals: Totals;
  promo: { code: string; valid: boolean; message?: string } | null;
  discountNote: string | null;
  zone: { id: string; city: string; postalCode: string } | null;
  errors: string[]; // erreurs bloquantes pour passer commande
}

async function findPromo(code: string, subtotal: number) {
  const promo = await prisma.promoCode.findUnique({ where: { code } });
  const now = new Date();
  if (!promo || !promo.isActive) return { promo: null, message: 'Code promo inconnu.' };
  if ((promo.startsAt && promo.startsAt > now) || (promo.endsAt && promo.endsAt < now)) return { promo: null, message: 'Ce code promo n\'est pas valable en ce moment.' };
  if (promo.maxUses != null && promo.uses >= promo.maxUses) return { promo: null, message: 'Ce code promo a atteint sa limite d\'utilisation.' };
  if (subtotal < promo.minSubtotal) return { promo: null, message: `Ce code est valable dès ${(promo.minSubtotal / 100).toFixed(2).replace('.', ',')} € de commande.` };
  return { promo, message: undefined };
}

/* Recalcule entièrement un panier à partir des identifiants, à la carte et aux prix du restaurant choisi :
   c'est la seule source de vérité des prix. */
export async function quoteCart(input: QuoteInput, restaurantId: string): Promise<Quote> {
  const ids = input.lines.flatMap(l => [l.productId, ...(l.freePizzaId ? [l.freePizzaId] : [])]);
  const products = await getProductsForPricing(ids, restaurantId);
  const byId = new Map(products.map(p => [p.id, p]));

  const lines: LineResult[] = input.lines.map((l, index) => {
    try {
      const product = byId.get(l.productId);
      return { index, ok: true, line: priceLine(product, l, products), image: product?.imageUrl ?? null };
    } catch (e) {
      if (e instanceof PricingError) return { index, ok: false, error: e.message };
      throw e;
    }
  });
  const priced = lines.filter(l => l.ok).map(l => l.line!);
  const errors: string[] = lines.filter(l => !l.ok).map(l => l.error!);

  const settings = await getSettings();
  const features = publicFeatures(settings.enabledOptions);
  // Seuls les modes inclus ou achetés en option (livraison = O5) sont acceptés
  if (!(await availableModes()).includes(input.mode as Mode)) errors.push('Ce mode de commande n\'est pas disponible.');

  let zone = null;
  if (input.mode === 'LIVRAISON') {
    zone = input.zoneId ? await prisma.deliveryZone.findFirst({ where: { id: input.zoneId, isActive: true } }) : null;
    if (!zone) errors.push('Choisissez une ville de livraison parmi nos zones.');
  }

  const subtotal = priced.reduce((a, l) => a + l.lineTotal, 0);
  let promoResult: Quote['promo'] = null;
  let promoRule = null;
  if (input.promoCode && !features.promoCodes) {
    promoResult = { code: input.promoCode, valid: false, message: 'Les codes promo ne sont pas disponibles.' };
  } else if (input.promoCode) {
    const { promo, message } = await findPromo(input.promoCode, subtotal);
    promoResult = { code: input.promoCode, valid: !!promo, message };
    if (promo) promoRule = { code: promo.code, type: promo.type, value: promo.value, minSubtotal: promo.minSubtotal };
  }

  const totals = computeTotals(priced, input.mode as Mode, zone, promoRule);
  const dessertDeal = threePlusOneDiscount(priced.filter(l => byId.get(l.productId)?.formula === DEAL_3_PLUS_1).map(l => ({ unitPrice: l.unitPrice, qty: l.qty })));
  const bottleDeal = offeredBottles(priced.map(l => {
    const product = byId.get(l.productId);
    const drinks = product?.groups.find(g => g.key === 'drink');
    const ids = l.config.selections?.drink ?? [];
    const grande = drinks?.choices.find(c => ids.includes(c.id) && c.label === 'Grande boisson');
    return { kind: product?.kind ?? '', sizeCode: l.config.sizeCode, qty: l.qty, grandePrice: grande?.price ?? 0, grandes: grande ? 1 : 0 };
  }));
  // shortcut: code promo et offres menu partagent le même montant de remise
  const offer = Math.min(dessertDeal + bottleDeal, Math.max(0, totals.subtotal - totals.discount));
  totals.discount += offer;
  totals.total -= offer;
  const notes = [
    promoRule ? `Remise ${promoRule.code}` : '',
    offer && dessertDeal ? DEAL_3_PLUS_1 : '',
    offer && bottleDeal ? 'Grande boisson offerte' : '',
  ].filter(Boolean);
  if (totals.minimumMissing > 0) errors.push(`Minimum de commande en livraison non atteint : il manque ${(totals.minimumMissing / 100).toFixed(2).replace('.', ',')} €.`);

  return {
    lines, totals, promo: promoResult, discountNote: notes.length ? notes.join(' · ') : null, errors,
    zone: zone ? { id: zone.id, city: zone.city, postalCode: zone.postalCode } : null,
  };
}

