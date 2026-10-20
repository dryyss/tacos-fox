/* Montants en centimes -> affichage français : 1050 -> « 10,50 € » */
export function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €';
}

/* « 10,50 » sans symbole, pour les pastilles de prix */
export function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}
