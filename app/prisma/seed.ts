/* Seed : carte complète, zones, horaires, réglages et compte gérant.
   La carte n'est semée que si elle est vide (sinon les modifications du gérant seraient écrasées).
   Pour la réinitialiser depuis le relevé : npm run db:seed -- --reset-catalog */
import { createRequire } from 'node:module';
import { PrismaClient, ProductKind } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { menuPhoto } from '../src/lib/menu-photos';
import { EXAMPLE_SLIDES } from '../src/lib/slide-examples';
import { SANDWICH_CATEGORIES, sandwichGroups } from './option-presets';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const src = require('./catalog-source.cjs');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL } },
});
const cents = (euros: number) => Math.round(euros * 100);

type Choice = { label: string; price?: number; isAvailable?: boolean };
type Group = { id: string; label: string; type: string; min: number; max: number; choices: Choice[] };
type SrcProduct = {
  id: string; cat: string; name: string; desc: string; price: number; badges: string[];
  formula?: string; range?: string; tbc?: boolean; priceFrom?: boolean; bogo?: boolean;
  sizes?: { id: string; label: string; price: number; bogo?: boolean; hint?: string }[];
  options?: Group[];
};

const CATEGORY_SUBS: Record<string, string> = {
  tacos: 'Frites, sauce fromagère et boisson incluses. Taille S et M : 1 viande, L : 2, XL : 3, XXL : 4.',
  burgers: 'Tous nos burgers sont servis en menu avec frites et boisson.',
  sandwichs: 'Pain frais, viandes halal, crudités au choix. Menu frites et boisson inclus.',
  pizzas: 'Pâte maison. 1 achetée = 1 offerte sur Senior et Mega, sur place et à emporter.',
  bowls: 'Frites, 4 fromages fondus, viande et sauce au choix. Boisson incluse.',
  crousty: 'La galette croustillante signature Tacos Fox.',
  assiettes: 'Viande, salade, tomate, oignon, frites. Boisson incluse.',
};

const ZONES: [string, string, number][] = [
  ['Stains', '93240', 0],
  ['Pierrefitte-sur-Seine', '93380', 1],
  ['Saint-Denis', '93200', 2],
  ['La Courneuve', '93120', 3],
  ['Garges-lès-Gonesse', '95140', 4],
  ['Villetaneuse', '93430', 5],
  ['Dugny', '93440', 6],
];

async function seedCatalog() {
  const reset = process.argv.includes('--reset-catalog');
  if (!reset && (await prisma.product.count()) > 0) return console.log('Carte déjà présente, ignorée (--reset-catalog pour la recharger).');
  // Les produits absents du relevé restent en base (historique des commandes, favoris) mais masqués
  await prisma.product.updateMany({ data: { isHidden: true } });

  for (const [i, c] of (src.CATEGORIES as { id: string; label: string }[]).entries()) {
    await prisma.category.upsert({
      where: { slug: c.id },
      create: { slug: c.id, label: c.label, sortOrder: i, description: CATEGORY_SUBS[c.id] ?? null },
      update: { label: c.label, sortOrder: i, description: CATEGORY_SUBS[c.id] ?? null },
    });
  }
  const cats = Object.fromEntries((await prisma.category.findMany()).map(c => [c.slug, c.id]));
  const featured = new Set((src.BEST_SELLERS as { kind: string; id?: string }[]).filter(b => b.id).map(b => b.id));

  // Tacos à composer : un seul produit, tailles + options
  const T = src.TACOS;
  await upsertProduct({
    slug: 'tacos-a-composer', categoryId: cats.tacos, kind: ProductKind.TACOS,
    name: 'Tacos à composer', description: T.included + '. Choisissez la taille, vos viandes et 2 sauces parmi 15.',
    price: cents(T.sizes[0].price), priceFrom: true, badges: ['best'], isFeatured: true, sortOrder: 0,
    sizes: T.sizes.map((s: { id: string; label: string; price: number; meats: number; hint: string }, i: number) => ({
      code: s.id, label: s.label, hint: s.hint, price: cents(s.price), includedQty: s.meats, sortOrder: i,
    })),
    groups: [
      { key: 'meats', label: 'Vos viandes', hint: 'Appuyez sur +1 pour doubler une viande', min: 1, max: 4, maxFromSize: true, allowRepeat: true, choices: src.MEATS.map((l: string) => ({ label: l })) },
      { key: 'sauces', label: 'Vos sauces', hint: '2 maximum, incluses', min: 0, max: 2, choices: src.SAUCES.map((l: string) => ({ label: l })) },
      { key: 'cheeses', label: 'Suppléments fromage', hint: 'Optionnel', min: 0, max: src.CHEESES.length, choices: src.CHEESES },
      { key: 'gratin', label: 'Gratinage', hint: 'Passage au four, 1 choix', min: 0, max: 1, choices: src.GRATINS },
      { key: 'fries', label: 'Frites en plus', hint: 'Une portion supplémentaire dans le tacos', min: 0, max: 1, choices: [{ label: 'Frites supplémentaires', price: T.friesPrice }] },
      { key: 'drink', label: 'Votre boisson', hint: 'Incluse dans le prix', min: 1, max: 1, choices: src.DRINKS.map((l: string) => ({ label: l })) },
    ],
  });

  const counters: Record<string, number> = {};
  for (const p of src.PRODUCTS as SrcProduct[]) {
    const order = (counters[p.cat] = (counters[p.cat] ?? 0) + 1);
    await upsertProduct({
      slug: p.id, categoryId: cats[p.cat], kind: p.cat === 'pizzas' ? ProductKind.PIZZA : ProductKind.STANDARD,
      name: p.name, description: p.desc, formula: p.formula ?? null, range: p.range ?? null,
      price: cents(p.sizes ? p.sizes[0].price : p.price), priceFrom: !!p.priceFrom,
      badges: p.badges ?? [], tbc: !!p.tbc, isFeatured: featured.has(p.id), sortOrder: order,
      sizes: (p.sizes ?? []).map((s, i) => ({ code: s.id, label: s.label, hint: s.hint ?? null, price: cents(s.price), bogo: !!s.bogo, sortOrder: i })),
      groups: SANDWICH_CATEGORIES.includes(p.cat) && !p.options
        ? sandwichGroups({ description: p.desc, formula: p.formula ?? null })
        : (p.options ?? []).map(g => ({ key: g.id, label: g.label, min: g.min, max: g.max, choices: g.choices })),
    });
  }
}

type GroupInput = { key: string; label: string; hint?: string; min: number; max: number; maxFromSize?: boolean; allowRepeat?: boolean; choices: Choice[] };
type ProductInput = {
  slug: string; categoryId: string; kind: ProductKind; name: string; description: string;
  formula?: string | null; range?: string | null; price: number; priceFrom?: boolean; badges: string[];
  tbc?: boolean; isFeatured?: boolean; sortOrder: number;
  sizes: { code: string; label: string; hint?: string | null; price: number; includedQty?: number; bogo?: boolean; sortOrder: number }[];
  groups: GroupInput[];
};

async function upsertProduct({ sizes, groups, ...data }: ProductInput) {
  const existing = await prisma.product.findUnique({ where: { slug: data.slug } });
  const imageUrl = existing?.imageUrl ?? menuPhoto(data.slug);
  const product = existing
    ? await prisma.product.update({ where: { id: existing.id }, data: { ...data, isHidden: false, imageUrl } })
    : await prisma.product.create({ data: { ...data, imageUrl } });
  await prisma.productSize.deleteMany({ where: { productId: product.id } });
  await prisma.optionGroup.deleteMany({ where: { productId: product.id } });
  if (sizes.length) await prisma.productSize.createMany({ data: sizes.map(s => ({ ...s, productId: product.id })) });
  for (const [i, g] of groups.entries()) {
    await prisma.optionGroup.create({
      data: {
        productId: product.id, key: g.key, label: g.label, hint: g.hint ?? null, min: g.min, max: g.max,
        maxFromSize: !!g.maxFromSize, allowRepeat: !!g.allowRepeat, sortOrder: i,
        choices: { create: g.choices.map((c, j) => ({ label: c.label, price: cents(c.price ?? 0), isAvailable: c.isAvailable ?? true, sortOrder: j })) },
      },
    });
  }
}

async function seedSettings() {
  const R = src.RESTAURANT;
  await prisma.settings.upsert({
    where: { id: 'main' },
    create: {
      id: 'main', phone: R.phone, addressLine1: R.address.line1, postalCode: '93240', city: 'Stains',
      instagram: R.social[0].href, snapchat: R.social[1].href, tiktok: R.social[2].href, facebook: R.social[3].href,
    },
    update: {},
  });
  for (const [i, { open, close }] of (R.hours as { open: string; close: string }[]).entries()) {
    await prisma.openingHours.upsert({ where: { dayOfWeek: i }, create: { dayOfWeek: i, open, close }, update: {} });
  }
  const d = R.delivery;
  for (const [city, postalCode, sortOrder] of ZONES) {
    await prisma.deliveryZone.upsert({
      where: { postalCode_city: { postalCode, city } },
      create: { city, postalCode, sortOrder, fee: cents(d.fee), freeFrom: cents(d.freeFrom), minimum: cents(d.minimum) },
      update: {},
    });
  }
}

async function seedSlides() {
  if (await prisma.promoSlide.count()) return;
  await prisma.promoSlide.createMany({ data: EXAMPLE_SLIDES });
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) return console.warn('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD absents : pas de compte gérant créé.');
  await prisma.user.upsert({
    where: { email },
    create: { email, name: 'Gérant', role: 'ADMIN', passwordHash: await bcrypt.hash(password, 12) },
    update: { role: 'ADMIN' },
  });
}

async function main() {
  await seedCatalog();
  await seedSettings();
  await seedSlides();
  await seedAdmin();
  const n = await prisma.product.count({ where: { isHidden: false } });
  console.log(`Seed terminé : ${n} produits visibles.`);
}

main().finally(() => prisma.$disconnect());
