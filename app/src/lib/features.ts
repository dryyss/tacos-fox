/* Qui a droit à quoi, selon le rôle et les options payées (devis DEV-2026-TFX-004).
   Partagé serveur / client : aucune donnée sensible ici, seulement la règle. */
import type { Role } from '@prisma/client';
import { makeOptions, OPTION, type Options } from './options';

/* Fonctionnalités du back-office */
export type AdminFeature =
  | 'orders' // écran cuisine, encaissement, remboursement (inclus)
  | 'history' // historique des commandes et factures (inclus)
  | 'qrcodes' // QR codes par restaurant (inclus)
  | 'menu' // carte, prix, photos, ruptures, vitrine (O1)
  | 'settings' // horaires, délais, réglages des restaurants (O1)
  | 'stock' // stocks (O2)
  | 'accounting' // comptabilité et exports (O3)
  | 'delivery' // zones de livraison (O5)
  | 'promos' // codes promo (O8)
  | 'options'; // activer ou couper les options : MAGAR uniquement

const BY_OPTION: Partial<Record<AdminFeature, string>> = {
  menu: OPTION.MENU_ADMIN, settings: OPTION.MENU_ADMIN, stock: OPTION.STOCK, accounting: OPTION.ACCOUNTING,
  delivery: OPTION.DELIVERY, promos: OPTION.PROMO_CODES,
};

export function canUse(feature: AdminFeature, role: Role | undefined, options: Options): boolean {
  if (role === 'SUPERADMIN') return true; // MAGAR fait les modifications prévues sans O1
  if (role !== 'STAFF' && role !== 'ADMIN') return false;
  if (feature === 'options') return false;
  if (feature === 'orders' || feature === 'history' || feature === 'qrcodes') return true;
  const code = BY_OPTION[feature];
  return role === 'ADMIN' && !!code && options.has(code as never);
}

/* Fonctionnalités côté client : uniquement les options, sans notion de rôle */
export interface PublicFeatures {
  delivery: boolean; // O5
  customerAccount: boolean; // O7 : connexion client, compte, favoris, adresses
  promoCodes: boolean; // O8
  stock: boolean; // O2 : décompte des stocks
  statusEmails: boolean; // O9 : e-mails « commande prête », « annulée »
}

export function publicFeatures(enabledOptions: string[] | Options): PublicFeatures {
  const o = Array.isArray(enabledOptions) ? makeOptions(enabledOptions) : enabledOptions;
  return {
    delivery: o.has(OPTION.DELIVERY),
    customerAccount: o.has(OPTION.CUSTOMER_ACCOUNT),
    promoCodes: o.has(OPTION.PROMO_CODES),
    stock: o.has(OPTION.STOCK),
    statusEmails: o.has(OPTION.CUSTOM_EMAILS),
  };
}
