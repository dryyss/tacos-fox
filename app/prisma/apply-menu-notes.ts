/* Applique les consignes carte du 04/11/2026 sur la base déjà en service,
   sans réinitialiser les catégories qui ne sont pas concernées.
   Usage : npx tsx --env-file=.env prisma/apply-menu-notes.ts [--dry-run] */
import { createRequire } from 'node:module';
import { PrismaClient, ProductKind } from '@prisma/client';
import { menuPhoto } from '../src/lib/menu-photos';
import { formulaSizes, isMenuFormula, SANDWICH_CATEGORIES, SEUL_MENU_FORMULA, sandwichGroups } from './option-presets';

const require = createRequire(import.meta.url);
const src = require('./catalog-source.cjs');

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL } } });
const dry = process.argv.includes('--dry-run');
const cents = (euros: number) => Math.round(euros * 100);

const TOUCH = new Set(['bowls', 'burgers', 'sandwichs', 'pizzas', 'assiettes', 'pates', 'salades', 'milkshakes', 'crousty', 'crepes', 'desserts']);
const WRITE_PRICE = new Set(['assiettes', 'pates', 'crousty', 'crepes']);
const REPLACE_SIZES = new Set(['pates', 'crepes']);

type Choice = { label: string; price?: number; isAvailable?: boolean };
type Group = { key: string; label: string; hint?: string; min: number; max: number; maxFromSize?: boolean; allowRepeat?: boolean; sizeCodes?: string[]; choices: Choice[] };
type Src = {
  id: string; cat: string; name: string; desc: string; price: number; badges: string[];
  formula?: string; range?: string; tbc?: boolean; priceFrom?: boolean;
  sizes?: { id: string; label: string; price: number; bogo?: boolean; hint?: string }[];
  options?: { id: string; label: string; hint?: string; min: number; max: number; allowRepeat?: boolean; sizeCodes?: string[]; choices: Choice[] }[];
};

const CATEGORY_TEXT: Record<string, string> = {
  pizzas: 'Pâte maison, base au choix. 1 achetée = 1 offerte sur Senior et Mega. 2 Mega ou 4 Senior : grande boisson offerte.',
  crousty: '10 €, boisson comprise.',
  assiettes: '12,90 €. Crudités et sauce au choix. Boisson +1 €.',
  crepes: 'Salée à composer. Sucrées au sucre, à la confiture ou au Nutella.',
  desserts: 'Tiramisu et tarte au Daim : 3 achetés = 1 offert.',
};

function groupsFor(p: Src, formula: string | null): Group[] {
  if (SANDWICH_CATEGORIES.includes(p.cat) && !p.options) return sandwichGroups({ description: p.desc, formula, category: p.cat });
  return (p.options ?? []).map(g => ({ key: g.id, label: g.label, hint: g.hint, min: g.min, max: g.max, allowRepeat: g.allowRepeat, sizeCodes: g.sizeCodes, choices: g.choices }));
}

async function writeGroups(productId: string, groups: Group[]) {
  await prisma.optionGroup.deleteMany({ where: { productId } });
  for (const [i, g] of groups.entries()) {
    const created = await prisma.optionGroup.create({
      data: {
        productId, key: g.key, label: g.label, hint: g.hint ?? null, min: g.min, max: g.max,
        maxFromSize: !!g.maxFromSize, allowRepeat: !!g.allowRepeat, sortOrder: i,
        choices: { create: g.choices.map((c, j) => ({ label: c.label, price: cents(c.price ?? 0), isAvailable: c.isAvailable ?? true, sortOrder: j })) },
      },
    });
    // Le client Prisma généré localement ne connaît pas encore sizeCodes : on l'écrit en SQL.
    if (g.sizeCodes?.length) {
      await prisma.$executeRawUnsafe(`UPDATE "OptionGroup" SET "sizeCodes" = $1::text[] WHERE id = $2`, g.sizeCodes, created.id);
    }
  }
}

async function main() {
  const cats = Object.fromEntries((await prisma.category.findMany()).map(c => [c.slug, c.id]));
  const featured = new Set((src.BEST_SELLERS as { id?: string }[]).filter(b => b.id).map(b => b.id!));
  let updated = 0;
  let created = 0;
  const keep = new Set<string>();

  for (const [slug, description] of Object.entries(CATEGORY_TEXT)) {
    if (!dry) await prisma.category.updateMany({ where: { slug }, data: { description } });
  }

  const T = src.TACOS;
  const tacos = await prisma.product.findUnique({ where: { slug: 'tacos-a-composer' } });
  if (tacos) {
    updated++;
    if (!dry) {
      await prisma.product.update({ where: { id: tacos.id }, data: { description: T.included + '. Choisissez la taille, vos viandes et jusqu\'à 3 sauces.' } });
      await writeGroups(tacos.id, [
        { key: 'meats', label: 'Vos viandes', hint: 'La même viande autant de fois, dans la limite de la taille (4 en XXL)', min: 1, max: 4, maxFromSize: true, allowRepeat: true, choices: src.MEATS.map((l: string) => ({ label: l })) },
        { key: 'fries', label: 'Frites en plus', hint: 'Une portion supplémentaire dans le tacos', min: 0, max: 1, choices: [{ label: 'Frites supplémentaires', price: T.friesPrice }] },
        { key: 'sauces', label: 'Vos sauces', hint: '3 maximum, au choix', min: 0, max: 3, choices: src.SAUCES.map((l: string) => ({ label: l })) },
        { key: 'cheeses', label: 'Suppléments fromage', hint: 'Optionnel', min: 0, max: src.CHEESES.length, choices: src.CHEESES },
        { key: 'gratin', label: 'Gratinage', hint: 'Passage au four, 1 choix', min: 0, max: 1, choices: src.GRATINS },
        { key: 'drink', label: 'Votre boisson', hint: 'Incluse dans le prix', min: 1, max: 1, choices: src.DRINKS.map((l: string) => ({ label: l })) },
      ]);
    }
  }

  for (const src0 of src.PRODUCTS as Src[]) {
    if (!TOUCH.has(src0.cat)) continue;
    const seulMenu = SANDWICH_CATEGORIES.includes(src0.cat) && !src0.sizes && isMenuFormula(src0.formula);
    const p: Src = seulMenu
      ? { ...src0, formula: SEUL_MENU_FORMULA, sizes: formulaSizes(src0.price).map(s => ({ id: s.code, label: s.label, hint: s.hint, price: s.price })) }
      : src0;
    keep.add(p.id);
    const existing = await prisma.product.findUnique({ where: { slug: p.id } });
    const writePrice = !existing || WRITE_PRICE.has(p.cat) || p.id === 'sandwichs-croque-monsieur';
    const replaceSizes = !existing || REPLACE_SIZES.has(p.cat) || p.id === 'sandwichs-croque-monsieur';
    const groups = groupsFor(p, p.formula ?? null);
    const sizes = (p.sizes ?? []).map((s, i) => ({ code: s.id, label: s.label, hint: s.hint ?? null, price: cents(s.price), bogo: !!s.bogo, sortOrder: i, includedQty: 1 }));
    if (existing) updated++;
    else created++;
    if (dry) continue;
    const imageUrl = existing?.imageUrl ?? menuPhoto(p.id)
      ?? (p.id.startsWith('crepes-crepe-') && p.id !== 'crepes-crepe-salee' ? menuPhoto('crepes-crepe-sucree') : null);
    const data = {
      name: p.name, description: p.desc, formula: p.formula ?? null, range: p.range ?? null,
      priceFrom: !!p.priceFrom, badges: p.badges ?? [], tbc: !!p.tbc, isHidden: false, imageUrl,
      ...(featured.has(p.id) ? { isFeatured: true } : {}),
      ...(writePrice ? { price: cents(p.sizes ? p.sizes[0].price : p.price) } : {}),
    };
    const product = existing
      ? await prisma.product.update({ where: { id: existing.id }, data })
      : await prisma.product.create({ data: { ...data, slug: p.id, categoryId: cats[p.cat], kind: p.cat === 'pizzas' ? ProductKind.PIZZA : ProductKind.STANDARD, price: cents(p.sizes ? p.sizes[0].price : p.price), sortOrder: 40 } });
    if (replaceSizes) {
      await prisma.productSize.deleteMany({ where: { productId: product.id } });
      if (sizes.length) await prisma.productSize.createMany({ data: sizes.map(s => ({ ...s, productId: product.id })) });
    }
    await writeGroups(product.id, groups);
  }

  const hidden = await prisma.product.findMany({ where: { category: { slug: { in: [...TOUCH] } }, slug: { notIn: [...keep] }, isHidden: false }, select: { slug: true } });
  if (!dry && hidden.length) {
    await prisma.product.updateMany({ where: { slug: { in: hidden.map(p => p.slug) } }, data: { isHidden: true, isFeatured: false } });
  }
  console.log(`${dry ? 'Simulation : ' : ''}${updated} produits mis à jour, ${created} créés, ${hidden.map(p => p.slug).join(', ') || 'aucun'} masqué${hidden.length ? '' : ''}.`);
}

main().finally(() => prisma.$disconnect());
