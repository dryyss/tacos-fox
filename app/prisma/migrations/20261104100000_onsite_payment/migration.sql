-- Paiement au comptoir : moyens acceptés par restaurant, moyens annoncés par le client
ALTER TABLE "Restaurant" ADD COLUMN "onsiteMethods" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Order" ADD COLUMN "onsiteMethods" TEXT[] DEFAULT ARRAY[]::TEXT[];
