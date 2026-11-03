-- Repère pour distinguer deux restaurants d'une même ville, et coordonnées pour « le plus proche de moi »
ALTER TABLE "Restaurant" ADD COLUMN "label" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Restaurant" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Restaurant" ADD COLUMN "longitude" DOUBLE PRECISION;

-- Coordonnées : Base Adresse Nationale (api-adresse.data.gouv.fr), 03/11/2026
UPDATE "Restaurant" SET "label" = 'Marcel Cachin',   "latitude" = 48.959232, "longitude" = 2.382357 WHERE "slug" = 'stains-marcel-cachin';
UPDATE "Restaurant" SET "label" = 'Louis Bordes',    "latitude" = 48.954721, "longitude" = 2.386198 WHERE "slug" = 'stains-louis-bordes';
UPDATE "Restaurant" SET "label" = '22 Larivière',    "latitude" = 48.954151, "longitude" = 2.416494 WHERE "slug" = 'dugny-22-lariviere';
UPDATE "Restaurant" SET "label" = '21 Larivière',    "latitude" = 48.953849, "longitude" = 2.416207 WHERE "slug" = 'dugny-21-lariviere';
UPDATE "Restaurant" SET "latitude" = 48.946933, "longitude" = 2.437073 WHERE "slug" = 'blanc-mesnil';
