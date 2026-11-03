-- Mentions légales de la société qui exploite chaque restaurant (factures)
ALTER TABLE "Restaurant" ADD COLUMN "legalForm" TEXT NOT NULL DEFAULT '',
ADD COLUMN "shareCapital" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "siren" TEXT NOT NULL DEFAULT '',
ADD COLUMN "rcsCity" TEXT NOT NULL DEFAULT '';
