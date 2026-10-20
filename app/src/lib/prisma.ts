import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

/**
 * Prisma + node-postgres, pooling Neon (PgBouncer).
 * Sur Vercel, attachDatabasePool réutilise le pool entre invocations Fluid.
 * Les migrations Prisma utilisent DATABASE_URL_UNPOOLED (directUrl).
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

function connectionString() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is missing');
  const parsed = new URL(url);
  if (!parsed.searchParams.has('connect_timeout')) parsed.searchParams.set('connect_timeout', '15');
  if (!parsed.searchParams.has('sslmode')) parsed.searchParams.set('sslmode', 'require');
  return parsed.toString();
}

function createPrisma() {
  const pool = globalForPrisma.pool ?? new Pool({ connectionString: connectionString(), max: 10 });
  globalForPrisma.pool = pool;
  if (process.env.VERCEL) {
    void import('@vercel/functions').then(({ attachDatabasePool }) => attachDatabasePool(pool));
  }
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
