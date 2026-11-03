-- Carte par restaurant : produit masqué ou prix propre à un restaurant
CREATE TABLE "ProductOverride" (
    "restaurantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "price" INTEGER,
    "sizePrices" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOverride_pkey" PRIMARY KEY ("restaurantId","productId")
);

CREATE INDEX "ProductOverride_productId_idx" ON "ProductOverride"("productId");

ALTER TABLE "ProductOverride" ADD CONSTRAINT "ProductOverride_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductOverride" ADD CONSTRAINT "ProductOverride_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Compte Stripe Connect qui a encaissé chaque commande (remboursements sur le bon compte)
ALTER TABLE "Order" ADD COLUMN "stripeAccountId" TEXT;
