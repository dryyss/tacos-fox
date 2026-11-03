-- Accroche sous le logo : les villes des 5 restaurants (l'ancienne venait de la démo)
ALTER TABLE "Settings" ALTER COLUMN "tagline" SET DEFAULT 'Stains · Dugny · Le Blanc-Mesnil';
UPDATE "Settings" SET "tagline" = 'Stains · Dugny · Le Blanc-Mesnil' WHERE "tagline" = 'by Paris, since 1998';

-- Délai de préparation : 15 minutes par défaut (demande du 03/11/2026)
ALTER TABLE "Restaurant" ALTER COLUMN "prepMinutes" SET DEFAULT 15;
ALTER TABLE "Settings" ALTER COLUMN "prepMinutes" SET DEFAULT 15;
UPDATE "Settings" SET "prepMinutes" = 15;
