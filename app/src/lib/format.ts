/* Petites fonctions d'affichage partagées serveur / client */

export const MODE_LABELS = { SURPLACE: 'Sur place', EMPORTER: 'À emporter', LIVRAISON: 'Livraison' } as const;

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

export const orderNumberLabel = (n: number) => `TF-${String(n).padStart(4, '0')}`;

export function mapsSearchUrl(q: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
