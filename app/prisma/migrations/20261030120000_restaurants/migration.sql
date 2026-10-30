-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "restaurantId" TEXT;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "enabledOptions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "staffRestaurants" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "intro" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "prepMinutes" INTEGER NOT NULL DEFAULT 20,
    "slotInterval" INTEGER NOT NULL DEFAULT 15,
    "tables" INTEGER NOT NULL DEFAULT 0,
    "legalName" TEXT NOT NULL DEFAULT '',
    "siret" TEXT NOT NULL DEFAULT '',
    "vatNumber" TEXT NOT NULL DEFAULT '',
    "vatRate" INTEGER NOT NULL DEFAULT 1000,
    "stripeAccountId" TEXT,
    "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantHours" (
    "restaurantId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "open" TEXT NOT NULL,
    "close" TEXT NOT NULL,

    CONSTRAINT "RestaurantHours_pkey" PRIMARY KEY ("restaurantId","dayOfWeek")
);

-- CreateTable
CREATE TABLE "_ProductRestaurants" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProductRestaurants_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "Restaurant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_code_key" ON "Restaurant"("code");

-- CreateIndex
CREATE INDEX "_ProductRestaurants_B_index" ON "_ProductRestaurants"("B");

-- CreateIndex
CREATE INDEX "Order_restaurantId_status_createdAt_idx" ON "Order"("restaurantId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantHours" ADD CONSTRAINT "RestaurantHours_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductRestaurants" ADD CONSTRAINT "_ProductRestaurants_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductRestaurants" ADD CONSTRAINT "_ProductRestaurants_B_fkey" FOREIGN KEY ("B") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Reprise des données : le restaurant existant devient « Stains », avec ses réglages, horaires et commandes
INSERT INTO "Restaurant" ("id", "slug", "code", "name", "city", "postalCode", "addressLine1", "phone", "email",
  "orderingEnabled", "prepMinutes", "slotInterval", "legalName", "siret", "vatNumber", "vatRate", "sortOrder", "updatedAt")
SELECT 'rest_stains', 'stains', 'STA', 'Tacos Fox Stains', COALESCE(NULLIF(s."city", ''), 'Stains'), COALESCE(NULLIF(s."postalCode", ''), '93240'),
  s."addressLine1", s."phone", s."email", s."orderingEnabled", s."prepMinutes", s."slotInterval",
  s."legalName", s."siret", s."vatNumber", s."vatRate", 0, CURRENT_TIMESTAMP
FROM "Settings" s WHERE s."id" = 'main'
ON CONFLICT DO NOTHING;

INSERT INTO "Restaurant" ("id", "slug", "code", "name", "city", "postalCode", "sortOrder", "updatedAt")
SELECT 'rest_stains', 'stains', 'STA', 'Tacos Fox Stains', 'Stains', '93240', 0, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Restaurant" WHERE "id" = 'rest_stains');

INSERT INTO "RestaurantHours" ("restaurantId", "dayOfWeek", "isOpen", "open", "close")
SELECT 'rest_stains', h."dayOfWeek", h."isOpen", h."open", h."close" FROM "OpeningHours" h
ON CONFLICT DO NOTHING;

UPDATE "Order" SET "restaurantId" = 'rest_stains' WHERE "restaurantId" IS NULL;
