/* Ajoute les options (crudités, sauces, suppléments, accompagnement, boisson) aux sandwichs et burgers
   déjà en base, sans toucher aux groupes existants ni aux prix modifiés par le gérant.
   Usage : npx tsx --env-file=.env prisma/add-options.ts [--dry-run] */
import { PrismaClient } from '@prisma/client';
import { SANDWICH_CATEGORIES, sandwichGroups } from './option-presets';

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL } } });
const dry = process.argv.includes('--dry-run');
const cents = (euros: number) => Math.round(euros * 100);

async function main() {
  const products = await prisma.product.findMany({
    where: { category: { slug: { in: SANDWICH_CATEGORIES } } },
    include: { optionGroups: true },
  });
  let added = 0;
  for (const p of products) {
    const have = new Set(p.optionGroups.map(g => g.key));
    const next = p.optionGroups.length;
    for (const [i, g] of sandwichGroups(p).entries()) {
      if (have.has(g.key)) continue;
      added++;
      if (dry) continue;
      await prisma.optionGroup.create({
        data: {
          productId: p.id, key: g.key, label: g.label, hint: g.hint ?? null, min: g.min, max: g.max, sortOrder: next + i,
          choices: { create: g.choices.map((c, j) => ({ label: c.label, price: cents(c.price ?? 0), isAvailable: c.isAvailable ?? true, sortOrder: j })) },
        },
      });
    }
  }
  console.log(`${products.length} produits examinés, ${added} groupes ${dry ? 'à ajouter (simulation)' : 'ajoutés'}.`);
}

main().finally(() => prisma.$disconnect());
