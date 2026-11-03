/* Crée les restaurants manquants (5 au total) et met à jour leur identité (adresse, société).
   Relançable : ne touche jamais aux horaires, téléphone, ouverture ni compte Stripe.
   Usage : npm run db:add-restaurants */
import { PrismaClient } from '@prisma/client';
import { ensureRestaurants } from './restaurant-presets';

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL } } });
ensureRestaurants(prisma)
  .then(({ created, updated }) => console.log(`${created} restaurant(s) créé(s), ${updated} mis à jour.`))
  .finally(() => prisma.$disconnect());
