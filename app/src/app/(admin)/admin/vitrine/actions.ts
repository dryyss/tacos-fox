'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireStaff } from '@/lib/admin';
import { parisLocalToDate } from '@/lib/hours';
import { prisma } from '@/lib/prisma';
import { EXAMPLE_SLIDES } from '@/lib/slide-examples';
import { PLACEMENTS, TONES } from '@/lib/slide-types';

export interface Result { ok: boolean; error?: string }

const href = z.string().trim().max(300).refine(
  v => v === '' || (v.startsWith('/') && !v.startsWith('//')) || /^https:\/\/\S+$/.test(v),
  'Lien : un chemin du site (/carte) ou une adresse https',
);

const when = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/).nullable();

const slideSchema = z.object({
  placement: z.enum(PLACEMENTS),
  tone: z.enum(TONES),
  kicker: z.string().trim().max(40),
  title: z.string().trim().min(1, 'Titre requis').max(90),
  highlight: z.string().trim().max(40),
  text: z.string().trim().max(180),
  ctaLabel: z.string().trim().max(28),
  ctaHref: href,
  imageUrl: z.string().trim().max(300).nullable(),
  badge: z.string().trim().max(8),
  isActive: z.boolean(),
  startsAt: when,
  endsAt: when,
});

async function wrap(fn: () => Promise<Result | void>): Promise<Result> {
  await requireStaff();
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

export async function saveSlide(id: string | null, input: z.input<typeof slideSchema>) {
  return wrap(async () => {
    const d = slideSchema.parse(input);
    const startsAt = d.startsAt ? parisLocalToDate(d.startsAt) : null;
    const endsAt = d.endsAt ? parisLocalToDate(d.endsAt) : null;
    if (startsAt && endsAt && startsAt > endsAt) return { ok: false, error: 'La date de fin précède la date de début.' };
    const prev = id ? await prisma.promoSlide.findUnique({ where: { id } }) : null;
    const placementChanged = !!prev && prev.placement !== d.placement;
    const sortOrder = !prev || placementChanged
      ? await prisma.promoSlide.count({ where: { placement: d.placement } })
      : prev.sortOrder;
    const data = {
      placement: d.placement, tone: d.tone, kicker: d.kicker, title: d.title, highlight: d.highlight, text: d.text,
      ctaLabel: d.ctaLabel, ctaHref: d.ctaHref || '/carte', imageUrl: d.imageUrl || null, badge: d.badge,
      isActive: d.isActive, startsAt, endsAt, sortOrder,
    };
    if (id) await prisma.promoSlide.update({ where: { id }, data });
    else await prisma.promoSlide.create({ data });
  });
}

export async function deleteSlide(id: string) {
  return wrap(async () => { await prisma.promoSlide.delete({ where: { id } }); });
}

export async function moveSlide(id: string, dir: -1 | 1) {
  return wrap(async () => {
    const current = await prisma.promoSlide.findUnique({ where: { id } });
    if (!current) return;
    const rows = await prisma.promoSlide.findMany({ where: { placement: current.placement }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    const i = rows.findIndex(r => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j], rows[i]];
    await prisma.$transaction(rows.map((r, k) => prisma.promoSlide.update({ where: { id: r.id }, data: { sortOrder: k } })));
  });
}

export async function insertExampleSlides() {
  return wrap(async () => {
    if (await prisma.promoSlide.count()) return { ok: false, error: 'Des visuels existent déjà.' };
    await prisma.promoSlide.createMany({ data: EXAMPLE_SLIDES });
  });
}
