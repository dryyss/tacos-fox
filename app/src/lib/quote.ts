import 'server-only';
import { z } from 'zod';

// Messages de validation en français
z.config(z.locales.fr());
import { prisma } from './prisma';
import { getHours, getProductsForPricing, getSettings } from './catalog';
import { computeTotals, MAX_QTY, priceLine, PricingError, type Mode, type PricedLine, type Totals } from './pricing';
import { openStatus, timeSlots } from './hours';

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
  error?: string;
}

export interface Quote {
  lines: LineResult[];
  totals: Totals;
  promo: { code: string; valid: boolean; message?: string } | null;
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

/* Recalcule entièrement un panier à partir des identifiants : c'est la seule source de vérité des prix. */
export async function quoteCart(input: QuoteInput): Promise<Quote> {
  const ids = input.lines.flatMap(l => [l.productId, ...(l.freePizzaId ? [l.freePizzaId] : [])]);
  const products = await getProductsForPricing(ids);
  const byId = new Map(products.map(p => [p.id, p]));

  const lines: LineResult[] = input.lines.map((l, index) => {
    try {
      return { index, ok: true, line: priceLine(byId.get(l.productId), l, products) };
    } catch (e) {
      if (e instanceof PricingError) return { index, ok: false, error: e.message };
      throw e;
    }
  });
  const priced = lines.filter(l => l.ok).map(l => l.line!);
  const errors: string[] = lines.filter(l => !l.ok).map(l => l.error!);

  const settings = await getSettings();
  const modeEnabled = { SURPLACE: settings.modeSurplace, EMPORTER: settings.modeEmporter, LIVRAISON: settings.modeLivraison }[input.mode];
  if (!modeEnabled) errors.push('Ce mode de commande n\'est pas disponible pour le moment.');

  let zone = null;
  if (input.mode === 'LIVRAISON') {
    zone = input.zoneId ? await prisma.deliveryZone.findFirst({ where: { id: input.zoneId, isActive: true } }) : null;
    if (!zone) errors.push('Choisissez une ville de livraison parmi nos zones.');
  }

  const subtotal = priced.reduce((a, l) => a + l.lineTotal, 0);
  let promoResult: Quote['promo'] = null;
  let promoRule = null;
  if (input.promoCode) {
    const { promo, message } = await findPromo(input.promoCode, subtotal);
    promoResult = { code: input.promoCode, valid: !!promo, message };
    if (promo) promoRule = { code: promo.code, type: promo.type, value: promo.value, minSubtotal: promo.minSubtotal };
  }

  const totals = computeTotals(priced, input.mode as Mode, zone, promoRule);
  if (totals.minimumMissing > 0) errors.push(`Minimum de commande en livraison non atteint : il manque ${(totals.minimumMissing / 100).toFixed(2).replace('.', ',')} €.`);

  return {
    lines, totals, promo: promoResult, errors,
    zone: zone ? { id: zone.id, city: zone.city, postalCode: zone.postalCode } : null,
  };
}

/* Disponibilité de la prise de commande : ouvert maintenant, ou créneau valide plus tard dans la journée */
export async function orderingWindow(mode: Mode) {
  const [settings, hours] = await Promise.all([getSettings(), getHours()]);
  const lead = mode === 'LIVRAISON' ? settings.deliveryMinutes : settings.prepMinutes;
  return {
    enabled: settings.orderingEnabled,
    status: openStatus(hours),
    slots: timeSlots(hours, lead, settings.slotInterval),
    lead,
  };
}
