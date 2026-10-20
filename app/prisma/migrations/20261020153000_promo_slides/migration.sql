-- CreateEnum
CREATE TYPE "SlidePlacement" AS ENUM ('CAROUSEL', 'BANNER', 'PANEL');

-- CreateEnum
CREATE TYPE "SlideTone" AS ENUM ('YELLOW', 'RED', 'DARK', 'CREAM');

-- CreateTable
CREATE TABLE "PromoSlide" (
    "id" TEXT NOT NULL,
    "placement" "SlidePlacement" NOT NULL,
    "tone" "SlideTone" NOT NULL DEFAULT 'YELLOW',
    "kicker" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "highlight" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL DEFAULT '',
    "ctaLabel" TEXT NOT NULL DEFAULT '',
    "ctaHref" TEXT NOT NULL DEFAULT '/carte',
    "imageUrl" TEXT,
    "badge" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoSlide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromoSlide_placement_isActive_sortOrder_idx" ON "PromoSlide"("placement", "isActive", "sortOrder");

-- Visuels de départ (ignorés si la table a déjà des lignes, ce qui n'arrive pas à la création)
INSERT INTO "PromoSlide" ("id", "placement", "tone", "kicker", "title", "highlight", "text", "ctaLabel", "ctaHref", "badge", "sortOrder", "isActive", "updatedAt") VALUES
('slide_carousel_tacos', 'CAROUSEL', 'RED', 'Signature', 'Le tacos qui calme une faim de loup', 'faim de loup', 'Frites, sauce fromagère et boisson incluses. De la taille S au XXL.', 'Composer', '/carte?cat=tacos', 'XXL', 0, true, CURRENT_TIMESTAMP),
('slide_carousel_pizza', 'CAROUSEL', 'YELLOW', 'Offre pizza', '1 achetée = 1 offerte', '= 1 offerte', 'Sur les tailles Senior et Mega, sur place et à emporter.', 'Voir les pizzas', '/carte?cat=pizzas', '2x', 1, true, CURRENT_TIMESTAMP),
('slide_carousel_prix', 'CAROUSEL', 'DARK', 'Sans appli', 'Les prix de la carte, rien de plus', 'rien de plus', 'Zéro commission. Votre commande arrive directement en cuisine.', 'Commander', '/carte', '0 €', 2, true, CURRENT_TIMESTAMP),
('slide_banner_pizza', 'BANNER', 'YELLOW', 'Cette semaine', '1 pizza achetée = 1 offerte', '= 1 offerte', 'Senior et Mega, sur place et à emporter.', 'Voir les pizzas', '/carte?cat=pizzas', '2x', 0, true, CURRENT_TIMESTAMP),
('slide_banner_prix', 'BANNER', 'DARK', 'Direct cuisine', 'Les prix de la carte, rien de plus', 'rien de plus', 'Pas de commission, pas de frais cachés.', 'Commander', '/carte', '0 €', 1, true, CURRENT_TIMESTAMP),
('slide_panel_halal', 'PANEL', 'CREAM', 'Viande', 'Halal certifiée', '', 'Achahada, sur toutes nos viandes.', 'La carte', '/carte', '', 0, true, CURRENT_TIMESTAMP),
('slide_panel_prep', 'PANEL', 'RED', 'Cuisine', 'Prêt en 20 min', '20 min', 'Préparé à Stains, à emporter ou livré.', 'Commander', '/carte', '20', 1, true, CURRENT_TIMESTAMP),
('slide_panel_zones', 'PANEL', 'DARK', 'Quartier', 'Livraison autour de Stains', 'Stains', 'Saint-Denis, Pierrefitte, La Courneuve et plus.', 'Voir les zones', '/infos', '', 2, true, CURRENT_TIMESTAMP);
