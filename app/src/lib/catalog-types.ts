/* Forme sérialisable de la carte, partagée entre serveur et client. Montants en centimes. */

export type ProductKind = 'STANDARD' | 'TACOS' | 'PIZZA';

export interface CatalogChoice {
  id: string;
  label: string;
  price: number;
  isAvailable: boolean;
}

export interface CatalogGroup {
  id: string;
  key: string;
  label: string;
  hint: string | null;
  min: number;
  max: number;
  maxFromSize: boolean;
  allowRepeat: boolean;
  choices: CatalogChoice[];
}

export interface CatalogSize {
  code: string;
  label: string;
  hint: string | null;
  price: number;
  includedQty: number;
  bogo: boolean;
}

export interface CatalogProduct {
  id: string;
  slug: string;
  categorySlug: string;
  kind: ProductKind;
  name: string;
  description: string;
  formula: string | null;
  range: string | null;
  price: number;
  priceFrom: boolean;
  badges: string[];
  allergens: string[];
  imageUrl: string | null;
  tbc: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
  sizes: CatalogSize[];
  groups: CatalogGroup[];
}

export interface CatalogCategory {
  slug: string;
  label: string;
  description: string | null;
}

export interface Catalog {
  categories: CatalogCategory[];
  products: CatalogProduct[];
}

/* Ligne de panier telle que le client l'envoie : uniquement des identifiants, jamais de prix. */
export interface CartLineInput {
  productId: string;
  qty: number;
  sizeCode?: string | null;
  selections?: Record<string, string[]>; // clé de groupe -> ids de choix (répétables si allowRepeat)
  freePizzaId?: string | null;
}
