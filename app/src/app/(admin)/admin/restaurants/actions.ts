'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireStaff } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

/* Réglages d'un restaurant : faits par MAGAR Développement sur demande (formule Essentiel),
   ou par le gérant si l'option O1 est achetée (fonction « settings » / « menu »). */

export interface Result { ok: boolean; error?: string }

async function wrap(feature: 'settings' | 'menu', fn: () => Promise<Result | void>): Promise<Result> {
  await requireStaff(feature);
  try {
    const r = await fn();
    revalidatePath('/', 'layout');
    return r ?? { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    console.error(e);
    return { ok: false, error: 'Enregistrement impossible.' };
  }
}

const hm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure au format HH:MM');
const text = (max: number) => z.string().trim().max(max);

const restaurantSchema = z.object({
  label: text(40),
  phone: text(30),
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email('E-mail invalide').max(160)]),
  intro: text(1000),
  isActive: z.boolean(),
  orderingEnabled: z.boolean(),
  prepMinutes: z.number().int().min(5, 'Délai de 5 minutes minimum').max(180),
  slotInterval: z.number().int().min(5).max(60),
  legalName: text(120),
  legalForm: text(40),
  shareCapital: z.number().int().min(0).max(1_000_000_000),
  siren: text(20),
  siret: text(20),
  rcsCity: text(60),
  vatNumber: text(20),
  vatRate: z.number().int().min(0).max(3000),
});
export type RestaurantInput = z.input<typeof restaurantSchema>;

export async function saveRestaurant(id: string, input: RestaurantInput) {
  return wrap('settings', async () => {
    await prisma.restaurant.update({ where: { id }, data: restaurantSchema.parse(input) });
  });
}

const hoursSchema = z.array(z.object({ dayOfWeek: z.number().int().min(0).max(6), isOpen: z.boolean(), open: hm, close: hm })).length(7);

export async function saveRestaurantHours(id: string, input: z.input<typeof hoursSchema>) {
  return wrap('settings', async () => {
    const days = hoursSchema.parse(input);
    for (const d of days) {
      if (d.isOpen && d.close !== '00:00' && d.close <= d.open) return { ok: false, error: 'La fermeture doit suivre l\'ouverture (00:00 = minuit).' };
    }
    await prisma.$transaction(days.map(d => prisma.restaurantHours.upsert({
      where: { restaurantId_dayOfWeek: { restaurantId: id, dayOfWeek: d.dayOfWeek } },
      create: { restaurantId: id, ...d },
      update: d,
    })));
  });
}

/* C3 : produit masqué dans ce restaurant (rupture, carte spécifique) ou prix propre (null = prix de la carte commune) */
const overrideSchema = z.object({ isHidden: z.boolean(), price: z.number().int().min(0).max(1_000_000).nullable() });

export async function setProductOverride(restaurantId: string, productId: string, input: z.input<typeof overrideSchema>) {
  return wrap('menu', async () => {
    const data = overrideSchema.parse(input);
    if (!data.isHidden && data.price === null) {
      const existing = await prisma.productOverride.findUnique({ where: { restaurantId_productId: { restaurantId, productId } }, select: { sizePrices: true } });
      if (!existing?.sizePrices) {
        await prisma.productOverride.deleteMany({ where: { restaurantId, productId } });
        return;
      }
    }
    await prisma.productOverride.upsert({
      where: { restaurantId_productId: { restaurantId, productId } },
      create: { restaurantId, productId, ...data },
      update: data,
    });
  });
}
