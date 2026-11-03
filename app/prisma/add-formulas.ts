/* Burgers et sandwichs déjà en base : passe de « menu uniquement » à « seul ou menu ».
   Prix menu = prix actuel (relevé), prix seul = menu − 2,50 €. L'accompagnement, les frites en plus
   et la boisson ne sont demandés qu'en menu. Rejouable sans effet (produits déjà convertis ignorés).
   Usage : npx tsx --env-file=.env prisma/add-formulas.ts [--dry-run] */
import { Prisma, PrismaClient } from '@prisma/client';
import { isMenuFormula, MENU_SUPPLEMENT, SANDWICH_CATEGORIES, SEUL_MENU_FORMULA } from './option-presets';

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL } } });
const dry = process.argv.includes('--dry-run');
const SUPPLEMENT = Math.round(MENU_SUPPLEMENT * 100);
const MENU_GROUPS = ['side', 'extras', 'drink'];
const CATEGORY_TEXT: Record<string, [string, string]> = {
  burgers: ['Tous nos burgers sont servis en menu avec frites et boisson.', 'Seul ou en menu avec frites et boisson.'],
  sandwichs: ['Pain frais, viandes halal, crudités au choix. Menu frites et boisson inclus.', 'Pain frais, viandes halal, crudités au choix. Seul ou en menu avec frites et boisson.'],
};

async function main() {
  const products = await prisma.product.findMany({
    where: { category: { slug: { in: SANDWICH_CATEGORIES } }, sizes: { none: {} } },
    include: { overrides: true },
  });
  const targets = products.filter(p => isMenuFormula(p.formula) && p.price > SUPPLEMENT);
  for (const p of targets) {
    const seul = p.price - SUPPLEMENT;
    console.log(`${p.name} : seul ${(seul / 100).toFixed(2)} €, menu ${(p.price / 100).toFixed(2)} €`);
    if (dry) continue;
    await prisma.$transaction([
      prisma.productSize.createMany({ data: [
        { productId: p.id, code: 'seul', label: 'Seul', hint: 'Sans frites ni boisson', price: seul, sortOrder: 0 },
        { productId: p.id, code: 'menu', label: 'Menu', hint: 'Frites + boisson', price: p.price, sortOrder: 1 },
      ] }),
      prisma.product.update({ where: { id: p.id }, data: { price: seul, priceFrom: false, formula: SEUL_MENU_FORMULA } }),
      prisma.optionGroup.updateMany({ where: { productId: p.id, key: { in: MENU_GROUPS } }, data: { sizeCodes: ['menu'] } }),
      // Prix propre d'un restaurant : il valait pour le menu, il devient le prix des deux formules
      ...p.overrides.filter(o => o.price != null).map(o => prisma.productOverride.update({
        where: { restaurantId_productId: { restaurantId: o.restaurantId, productId: p.id } },
        data: { price: null, sizePrices: { menu: o.price!, seul: o.price! - SUPPLEMENT } as Prisma.InputJsonValue },
      })),
    ]);
  }
  for (const [slug, [before, after]] of Object.entries(CATEGORY_TEXT)) {
    if (!dry) await prisma.category.updateMany({ where: { slug, description: before }, data: { description: after } });
  }
  console.log(`${targets.length} produits ${dry ? 'à convertir (simulation)' : 'convertis'} en « seul ou menu ».`);
}

main().finally(() => prisma.$disconnect());
