/* Crée les restaurants manquants (5 au total). Relançable : ne modifie jamais un restaurant existant.
   Usage : npm run db:add-restaurants */
import { PrismaClient } from '@prisma/client';
import { ensureRestaurants } from './restaurant-presets';

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL } } });
ensureRestaurants(prisma)
  .then(n => console.log(`${n} restaurant(s) créé(s).`))
  .finally(() => prisma.$disconnect());
