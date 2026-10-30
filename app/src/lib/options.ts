/* Options du devis DEV-2026-TFX-004. Le code de chaque option existe déjà dans le socle ;
   elle n'est visible que si son code figure dans Settings.enabledOptions (vide en formule Essentiel). */

export const OPTION = {
  MENU_ADMIN: 'O1', // espace de gestion de la carte (produits, prix, photos, horaires, vitrine)
  STOCK: 'O2', // stocks par produit
  ACCOUNTING: 'O3', // comptabilité et exports
  SAV: 'O4', // réclamations
  DELIVERY: 'O5', // livraison par zones
  DRIVERS: 'O6', // livreurs et tournées
  CUSTOMER_ACCOUNT: 'O7', // compte client, historique, adresses, favoris
  PROMO_CODES: 'O8', // codes promo et remises
  CUSTOM_EMAILS: 'O9', // e-mails personnalisés
  NEWSLETTER: 'O10',
} as const;
export type OptionCode = (typeof OPTION)[keyof typeof OPTION];

export const OPTION_LABELS: Record<OptionCode, string> = {
  O1: 'Espace de gestion de la carte', O2: 'Gestion des stocks', O3: 'Comptabilité et exports', O4: 'SAV et réclamations',
  O5: 'Livraison par zones', O6: 'Livreurs et tournées', O7: 'Espace client', O8: 'Codes promo et remises',
  O9: 'E-mails personnalisés', O10: 'Newsletter',
};

export interface Options {
  list: OptionCode[];
  has(code: OptionCode): boolean;
}

export function makeOptions(enabled: string[]): Options {
  const set = new Set(enabled);
  return { list: [...set].filter((c): c is OptionCode => c in OPTION_LABELS), has: code => set.has(code) };
}
