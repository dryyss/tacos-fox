/* Petites fonctions d'affichage partagées serveur / client */

export const MODE_LABELS = { SURPLACE: 'Sur place', EMPORTER: 'À emporter', LIVRAISON: 'Livraison' } as const;

/* Remise enregistrée : un code promo, ou une offre de la carte (3+1, bouteille). */
export const discountLabel = (promoCode?: string | null) => (promoCode ? `Remise ${promoCode}` : 'Offre');

/* Paiement au comptoir : moyens que le restaurant accepte (Gestion > Restaurants) */
export const ONSITE_METHODS = ['ESPECES', 'TITRE_RESTAURANT', 'CHEQUE_VACANCES'] as const;
export type OnsiteMethod = typeof ONSITE_METHODS[number];
export const ONSITE_LABELS: Record<OnsiteMethod, string> = { ESPECES: 'Espèces', TITRE_RESTAURANT: 'Titre-restaurant', CHEQUE_VACANCES: 'Chèques-vacances' };
export const onsiteLabel = (methods: string[]) => methods.map(m => ONSITE_LABELS[m as OnsiteMethod] ?? m).join(' + ');
/* Libellé du paiement d'une commande : « CB en ligne » ou « Au comptoir (Espèces + Titre-restaurant) » */
export const paymentLabel = (o: { paymentMethod: string; onsiteMethods?: string[] }) =>
  o.paymentMethod === 'CARD' ? 'CB en ligne' : `Au comptoir${o.onsiteMethods?.length ? ` (${onsiteLabel(o.onsiteMethods)})` : ''}`;

export const STATUS_LABELS = {
  PENDING_PAYMENT: 'Paiement en attente',
  RECEIVED: 'Reçue',
  PREPARING: 'En préparation',
  READY: 'Prête',
  OUT_FOR_DELIVERY: 'En livraison',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
} as const;

/* "01 48 00 00 00" -> "tel:+33148000000" */
export function phoneHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return 'tel:' + (digits.startsWith('0') ? '+33' + digits.slice(1) : '+' + digits);
}

/* Pizza « 1 achetée = 1 offerte » : la pizza offerte est rangée dans les détails de la ligne
   (« Pizza offerte : Calzone »). On l'affiche comme une ligne à 0 €, regroupée sous la pizza payée. */
const FREE_PIZZA = 'Pizza offerte : ';
export function splitFreePizza(details: string[]): { details: string[]; free: string | null } {
  const d = details.find(x => x.startsWith(FREE_PIZZA));
  if (!d) return { details, free: null };
  const rest = details.filter(x => x !== d);
  // La taille (Senior, Mega) est le premier détail d'une pizza : la pizza offerte a la même
  return { details: rest, free: `Pizza ${d.slice(FREE_PIZZA.length)}${rest[0] ? ` ${rest[0]}` : ''} offerte` };
}

export const orderNumberLabel =(n: number) => `TF-${String(n).padStart(4, '0')}`;

export function mapsSearchUrl(q: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
