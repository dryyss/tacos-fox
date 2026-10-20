'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

async function userId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Non connecté');
  return session.user.id;
}

export interface ActionResult { ok: boolean; error?: string }

const addressSchema = z.object({
  label: z.string().trim().max(40).transform(s => s || 'Adresse'),
  line1: z.string().trim().min(3, 'Adresse requise').max(160),
  extra: z.string().trim().max(160).optional(),
  zoneId: z.string().min(1, 'Choisissez une ville'),
});

export async function addAddress(input: z.input<typeof addressSchema>): Promise<ActionResult> {
  const uid = await userId();
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const zone = await prisma.deliveryZone.findUnique({ where: { id: parsed.data.zoneId } });
  if (!zone) return { ok: false, error: 'Ville non desservie.' };
  const count = await prisma.address.count({ where: { userId: uid } });
  if (count >= 10) return { ok: false, error: '10 adresses maximum.' };
  await prisma.address.create({ data: { userId: uid, label: parsed.data.label, line1: parsed.data.line1, extra: parsed.data.extra || null, postalCode: zone.postalCode, city: zone.city, isDefault: count === 0 } });
  revalidatePath('/compte');
  return { ok: true };
}

export async function removeAddress(id: string): Promise<ActionResult> {
  const uid = await userId();
  const addr = await prisma.address.findFirst({ where: { id, userId: uid } });
  if (!addr) return { ok: false, error: 'Adresse introuvable.' };
  await prisma.address.delete({ where: { id } });
  if (addr.isDefault) {
    const next = await prisma.address.findFirst({ where: { userId: uid }, orderBy: { createdAt: 'asc' } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  revalidatePath('/compte');
  return { ok: true };
}

export async function setDefaultAddress(id: string): Promise<ActionResult> {
  const uid = await userId();
  if (!(await prisma.address.findFirst({ where: { id, userId: uid } }))) return { ok: false, error: 'Adresse introuvable.' };
  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId: uid }, data: { isDefault: false } }),
    prisma.address.update({ where: { id }, data: { isDefault: true } }),
  ]);
  revalidatePath('/compte');
  return { ok: true };
}

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Prénom requis').max(80),
  phone: z.string().transform(s => s.replace(/[\s.\-]/g, '')).pipe(z.string().regex(/^((\+33|0)[1-9](\d{2}){4})?$/, 'Numéro de téléphone invalide')),
  marketingOptIn: z.boolean(),
});

export async function updateProfile(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  const uid = await userId();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  await prisma.user.update({ where: { id: uid }, data: { name: parsed.data.name, phone: parsed.data.phone || null, marketingOptIn: parsed.data.marketingOptIn } });
  revalidatePath('/compte');
  return { ok: true };
}

export async function toggleFavorite(productId: string): Promise<ActionResult & { favorite?: boolean }> {
  const uid = await userId();
  const key = { userId_productId: { userId: uid, productId } };
  if (await prisma.favorite.findUnique({ where: key })) {
    await prisma.favorite.delete({ where: key });
    revalidatePath('/compte');
    return { ok: true, favorite: false };
  }
  if (!(await prisma.product.findFirst({ where: { id: productId, isHidden: false } }))) return { ok: false, error: 'Produit introuvable.' };
  await prisma.favorite.create({ data: { userId: uid, productId } });
  revalidatePath('/compte');
  return { ok: true, favorite: true };
}
