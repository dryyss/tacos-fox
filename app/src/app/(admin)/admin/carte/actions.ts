'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireStaff } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export interface Result { ok: boolean; error?: string; id?: string }

const refresh = () => { revalidatePath('/', 'layout'); };

async function wrap(fn: () => Promise<Result | void>): Promise<Result> {
  await requireStaff();
  try {
    const r = await fn();
    refresh();
    return r ?? { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    console.error(e);
    return { ok: false, error: 'Enregistrement impossible.' };
  }
}

const cents = z.number().int().min(0).max(100000);

/* ---------- Modifications rapides depuis la liste ---------- */

const quickSchema = z.object({
  price: cents.optional(),
  isAvailable: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  tbc: z.boolean().optional(),
  stock: z.number().int().min(0).max(100000).nullable().optional(),
});

export async function quickUpdate(id: string, patch: z.input<typeof quickSchema>) {
  return wrap(async () => {
    const data = quickSchema.parse(patch);
    const product = await prisma.product.update({ where: { id }, data, include: { sizes: { orderBy: { sortOrder: 'asc' } } } });
    // Pour un produit à tailles, le prix affiché « dès » suit la plus petite taille
    if (data.price !== undefined && product.sizes.length) await prisma.productSize.update({ where: { id: product.sizes[0].id }, data: { price: data.price } });
  });
}

/* ---------- Fiche produit complète ---------- */

const productSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(80),
  description: z.string().trim().max(400),
  categoryId: z.string().min(1),
  formula: z.string().trim().max(80).nullable(),
  range: z.string().trim().max(60).nullable(),
  price: cents,
  badges: z.array(z.enum(['best', 'nouveau', 'epice'])),
  allergens: z.array(z.string().max(40)).max(14),
  imageUrl: z.string().max(300).nullable(),
  tbc: z.boolean(),
  isAvailable: z.boolean(),
  isHidden: z.boolean(),
  isFeatured: z.boolean(),
  stock: z.number().int().min(0).nullable(),
  sizes: z.array(z.object({ code: z.string(), label: z.string().trim().min(1).max(30), hint: z.string().trim().max(60).nullable(), price: cents, bogo: z.boolean() })),
  groups: z.array(z.object({
    id: z.string().nullable(),
    key: z.string().trim().min(1).max(32).regex(/^[a-z0-9-]+$/, 'Clé de groupe : minuscules et tirets'),
    label: z.string().trim().min(1, 'Nom de groupe requis').max(60),
    min: z.number().int().min(0).max(20),
    max: z.number().int().min(1).max(20),
    choices: z.array(z.object({ id: z.string().nullable(), label: z.string().trim().min(1, 'Choix sans nom').max(60), price: cents, isAvailable: z.boolean() })).min(1, 'Chaque groupe doit avoir au moins un choix'),
  })),
});
export type ProductInput = z.input<typeof productSchema>;

export async function saveProduct(id: string | null, input: ProductInput) {
  return wrap(async () => {
    const d = productSchema.parse(input);
    for (const g of d.groups) if (g.min > g.max) return { ok: false, error: `« ${g.label} » : le minimum dépasse le maximum.` };
    if (new Set(d.groups.map(g => g.key)).size !== d.groups.length) return { ok: false, error: 'Deux groupes d\'options ont la même clé.' };
    const base = {
      name: d.name, description: d.description, categoryId: d.categoryId, formula: d.formula || null, range: d.range || null,
      price: d.sizes[0]?.price ?? d.price, priceFrom: d.sizes.length > 1,
      badges: d.badges, allergens: d.allergens, imageUrl: d.imageUrl || null, tbc: d.tbc, isAvailable: d.isAvailable,
      isHidden: d.isHidden, isFeatured: d.isFeatured, stock: d.stock,
    };

    return prisma.$transaction(async tx => {
      const product = id
        ? await tx.product.update({ where: { id }, data: base })
        : await tx.product.create({ data: { ...base, slug: await uniqueSlug(d.name), sortOrder: await tx.product.count({ where: { categoryId: d.categoryId } }) } });

      // Tailles : mise à jour des existantes par code (le tacos garde ses codes S..XXL)
      for (const [i, s] of d.sizes.entries()) {
        await tx.productSize.updateMany({ where: { productId: product.id, code: s.code }, data: { label: s.label, hint: s.hint, price: s.price, bogo: s.bogo, sortOrder: i } });
      }

      // Groupes et choix : mise à jour en place pour ne pas casser les paniers en cours
      const keepGroups = d.groups.filter(g => g.id).map(g => g.id!);
      await tx.optionGroup.deleteMany({ where: { productId: product.id, id: { notIn: keepGroups } } });
      for (const [gi, g] of d.groups.entries()) {
        const group = g.id
          ? await tx.optionGroup.update({ where: { id: g.id }, data: { key: g.key, label: g.label, min: g.min, max: g.max, sortOrder: gi } })
          : await tx.optionGroup.create({ data: { productId: product.id, key: g.key, label: g.label, min: g.min, max: g.max, sortOrder: gi } });
        const keepChoices = g.choices.filter(c => c.id).map(c => c.id!);
        await tx.optionChoice.deleteMany({ where: { groupId: group.id, id: { notIn: keepChoices } } });
        for (const [ci, c] of g.choices.entries()) {
          if (c.id) await tx.optionChoice.update({ where: { id: c.id }, data: { label: c.label, price: c.price, isAvailable: c.isAvailable, sortOrder: ci } });
          else await tx.optionChoice.create({ data: { groupId: group.id, label: c.label, price: c.price, isAvailable: c.isAvailable, sortOrder: ci } });
        }
      }
      return { ok: true, id: product.id };
    });
  });
}

async function uniqueSlug(name: string) {
  const base = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'produit';
  let slug = base;
  for (let i = 2; await prisma.product.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  return slug;
}

/* Suppression : un produit déjà commandé est seulement masqué, pour garder l'historique */
export async function deleteProduct(id: string) {
  return wrap(async () => {
    const used = await prisma.orderItem.count({ where: { productId: id } });
    if (used) await prisma.product.update({ where: { id }, data: { isHidden: true } });
    else await prisma.product.delete({ where: { id } });
  });
}

/* ---------- Catégories ---------- */

export async function updateCategory(id: string, patch: { label?: string; description?: string | null; isVisible?: boolean }) {
  return wrap(async () => {
    const data = z.object({ label: z.string().trim().min(1).max(40).optional(), description: z.string().trim().max(200).nullable().optional(), isVisible: z.boolean().optional() }).parse(patch);
    await prisma.category.update({ where: { id }, data });
  });
}

export async function moveCategory(id: string, dir: -1 | 1) {
  return wrap(async () => {
    const cats = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
    const i = cats.findIndex(c => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= cats.length) return;
    [cats[i], cats[j]] = [cats[j], cats[i]];
    await prisma.$transaction(cats.map((c, k) => prisma.category.update({ where: { id: c.id }, data: { sortOrder: k } })));
  });
}

/* ---------- Photos ---------- */

const MAX_IMAGE = 1.5 * 1024 * 1024;

export async function uploadImage(form: FormData): Promise<Result & { url?: string }> {
  await requireStaff();
  const file = form.get('file');
  if (!(file instanceof File)) return { ok: false, error: 'Aucun fichier.' };
  if (!['image/webp', 'image/jpeg', 'image/png'].includes(file.type)) return { ok: false, error: 'Format accepté : JPG, PNG ou WebP.' };
  if (file.size > MAX_IMAGE) return { ok: false, error: 'Image trop lourde (1,5 Mo maximum).' };
  const image = await prisma.image.create({ data: { mime: file.type, size: file.size, data: Buffer.from(await file.arrayBuffer()) } });
  return { ok: true, url: `/api/images/${image.id}` };
}

/* Copie un groupe d'options (par sa clé) sur tous les produits de la même catégorie.
   Les choix sont rapprochés par libellé pour garder leurs identifiants (paniers en cours). */
export async function applyGroupToCategory(productId: string, groupKey: string): Promise<Result & { count?: number }> {
  await requireStaff();
  try {
    const source = await prisma.product.findUnique({
      where: { id: productId },
      include: { optionGroups: { where: { key: groupKey }, include: { choices: { orderBy: { sortOrder: 'asc' } } } } },
    });
    const group = source?.optionGroups[0];
    if (!source || !group) return { ok: false, error: 'Enregistrez d\'abord le produit et ce groupe.' };
    if (group.maxFromSize) return { ok: false, error: 'Ce groupe dépend des tailles du produit et ne peut pas être copié.' };

    const targets = await prisma.product.findMany({
      where: { categoryId: source.categoryId, id: { not: source.id } },
      include: { optionGroups: { where: { key: groupKey }, include: { choices: true } } },
    });
    await prisma.$transaction(async tx => {
      for (const t of targets) {
        const existing = t.optionGroups[0];
        const target = existing
          ? await tx.optionGroup.update({ where: { id: existing.id }, data: { label: group.label, hint: group.hint, min: group.min, max: group.max, allowRepeat: group.allowRepeat } })
          : await tx.optionGroup.create({ data: { productId: t.id, key: group.key, label: group.label, hint: group.hint, min: group.min, max: group.max, allowRepeat: group.allowRepeat, sortOrder: group.sortOrder } });
        const byLabel = new Map((existing?.choices ?? []).map(c => [c.label.toLowerCase(), c]));
        const keep: string[] = [];
        for (const c of group.choices) {
          const match = byLabel.get(c.label.toLowerCase());
          if (match) {
            await tx.optionChoice.update({ where: { id: match.id }, data: { label: c.label, price: c.price, isAvailable: c.isAvailable, sortOrder: c.sortOrder } });
            keep.push(match.id);
          } else {
            keep.push((await tx.optionChoice.create({ data: { groupId: target.id, label: c.label, price: c.price, isAvailable: c.isAvailable, sortOrder: c.sortOrder } })).id);
          }
        }
        await tx.optionChoice.deleteMany({ where: { groupId: target.id, id: { notIn: keep } } });
      }
    }, { timeout: 60000 });
    refresh();
    return { ok: true, count: targets.length };
  } catch (e) {
    console.error(e);
    return { ok: false, error: 'Copie impossible.' };
  }
}
