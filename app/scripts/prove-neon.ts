import { prisma } from '../src/lib/prisma';

async function main() {
  const [products, categories, settings] = await Promise.all([
    prisma.product.count({ where: { isHidden: false } }),
    prisma.category.count(),
    prisma.settings.findFirst({ select: { name: true, city: true } }),
  ]);
  if (products < 1) throw new Error('Aucun produit visible');
  if (categories < 1) throw new Error('Aucune catégorie');
  console.log(JSON.stringify({
    ok: true,
    branch: process.env.NEON_BRANCH,
    products,
    categories,
    restaurant: settings,
    pooledHost: process.env.DATABASE_URL?.includes('-pooler') ?? false,
  }));
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
