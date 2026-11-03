/* URL publique du site, sans slash final */
export function appUrl(): string {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

/* Référencement : le site n'est ouvert à Google qu'à la livraison (NEXT_PUBLIC_ALLOW_INDEXING=1).
   Avant, robots.txt bloque tout et chaque page porte « noindex » : pas de prix provisoires dans Google. */
export function indexingAllowed(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_INDEXING === '1';
}
