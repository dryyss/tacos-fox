'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireStaff } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { parisLocalToDate } from '@/lib/hours';

export interface Result { ok: boolean; error?: string }

async function wrap(adminOnly: boolean, fn: () => Promise<Result | void>): Promise<Result> {
  await requireStaff(adminOnly);
  try {
    const r = await fn();
    revalidatePath('/', 'layout');
    return r ?? { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    if (e instanceof Error && 'code' in e && e.code === 'P2002') return { ok: false, error: 'Cette valeur existe déjà.' };
    console.error(e);
    return { ok: false, error: 'Enregistrement impossible.' };
  }
}

const cents = z.number().int().min(0).max(1000000);
const hm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure au format HH:MM');

/* ---------- Zones de livraison ---------- */

const zoneSchema = z.object({
  city: z.string().trim().min(1, 'Ville requise').max(60),
  postalCode: z.string().trim().regex(/^\d{5}$/, 'Code postal à 5 chiffres'),
  fee: cents, freeFrom: cents.nullable(), minimum: cents, isActive: z.boolean(),
});

export async function saveZone(id: string | null, input: z.input<typeof zoneSchema>) {
  return wrap(true, async () => {
    const data = zoneSchema.parse(input);
    if (id) await prisma.deliveryZone.update({ where: { id }, data });
    else await prisma.deliveryZone.create({ data: { ...data, sortOrder: await prisma.deliveryZone.count() } });
  });
}

export async function deleteZone(id: string) {
  return wrap(true, async () => { await prisma.deliveryZone.delete({ where: { id } }); });
}

/* ---------- Codes promo ---------- */

const promoSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,32}$/, 'Code : 3 à 32 lettres, chiffres ou tirets'),
  description: z.string().trim().max(120).nullable(),
  type: z.enum(['PERCENT', 'FIXED']),
  value: z.number().int().min(1, 'Valeur requise'),
  minSubtotal: cents,
  startsAt: z.string().regex(/^d{4}-d{2}-d{2}Td{2}:d{2}/).nullable(),
  endsAt: z.string().regex(/^d{4}-d{2}-d{2}Td{2}:d{2}/).nullable(),
  maxUses: z.number().int().min(1).nullable(),
  isActive: z.boolean(),
});

export async function savePromo(id: string | null, input: z.input<typeof promoSchema>) {
  return wrap(false, async () => {
    const d = promoSchema.parse(input);
    if (d.type === 'PERCENT' && d.value > 100) return { ok: false, error: 'Un pourcentage ne peut pas dépasser 100.' };
    const data = { ...d, startsAt: d.startsAt ? parisLocalToDate(d.startsAt) : null, endsAt: d.endsAt ? parisLocalToDate(d.endsAt) : null };
    if (data.startsAt && data.endsAt && data.startsAt > data.endsAt) return { ok: false, error: 'La date de fin précède la date de début.' };
    if (id) await prisma.promoCode.update({ where: { id }, data });
    else await prisma.promoCode.create({ data });
  });
}

export async function deletePromo(id: string) {
  return wrap(false, async () => { await prisma.promoCode.delete({ where: { id } }); });
}

/* ---------- Horaires ---------- */

const hoursSchema = z.array(z.object({ dayOfWeek: z.number().int().min(0).max(6), isOpen: z.boolean(), open: hm, close: hm })).length(7);

export async function saveHours(input: z.input<typeof hoursSchema>) {
  return wrap(true, async () => {
    const days = hoursSchema.parse(input);
    for (const d of days) {
      if (d.isOpen && d.close !== '00:00' && d.close <= d.open) return { ok: false, error: 'La fermeture doit suivre l\'ouverture (00:00 = minuit).' };
    }
    await prisma.$transaction(days.map(d => prisma.openingHours.upsert({ where: { dayOfWeek: d.dayOfWeek }, create: d, update: d })));
  });
}

/* ---------- Réglages ---------- */

const settingsSchema = z.object({
  name: z.string().trim().min(1).max(60),
  tagline: z.string().trim().max(80),
  slogan: z.string().trim().max(120),
  halalLabel: z.string().trim().max(80),
  phone: z.string().trim().max(30),
  email: z.string().trim().max(120),
  addressLine1: z.string().trim().max(120),
  postalCode: z.string().trim().max(10),
  city: z.string().trim().max(60),
  legalName: z.string().trim().max(120),
  siret: z.string().trim().max(20),
  vatNumber: z.string().trim().max(30),
  vatRate: z.number().int().min(0).max(2000),
  acceptCard: z.boolean(), acceptOnsite: z.boolean(),
  orderingEnabled: z.boolean(),
  modeSurplace: z.boolean(), modeEmporter: z.boolean(), modeLivraison: z.boolean(),
  prepMinutes: z.number().int().min(5).max(180),
  deliveryMinutes: z.number().int().min(10).max(240),
  slotInterval: z.number().int().refine(v => [10, 15, 20, 30].includes(v), 'Intervalle : 10, 15, 20 ou 30 minutes'),
  instagram: z.string().trim().max(200).nullable(),
  snapchat: z.string().trim().max(200).nullable(),
  tiktok: z.string().trim().max(200).nullable(),
  facebook: z.string().trim().max(200).nullable(),
});
export type SettingsInput = z.input<typeof settingsSchema>;

export async function saveSettings(input: SettingsInput) {
  return wrap(true, async () => {
    const data = settingsSchema.parse(input);
    if (!data.acceptCard && !data.acceptOnsite) return { ok: false, error: 'Gardez au moins un moyen de paiement.' };
    if (!data.modeSurplace && !data.modeEmporter && !data.modeLivraison) return { ok: false, error: 'Gardez au moins un mode de commande.' };
    await prisma.settings.update({ where: { id: 'main' }, data });
  });
}

/* Interrupteur rapide « commandes en ligne ouvertes / suspendues » (accessible à l'équipe) */
export async function setOrderingEnabled(enabled: boolean) {
  return wrap(false, async () => { await prisma.settings.update({ where: { id: 'main' }, data: { orderingEnabled: enabled } }); });
}
