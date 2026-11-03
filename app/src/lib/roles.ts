import type { Role } from '@prisma/client';

/* Rôles gérés dans Auth0, transmis par l'Action « tacosfox-roles » (préfixe tacosfox: retiré) :
   superadmin (MAGAR Développement), admin (gérant, les 5 restaurants), staff (équipe).
   R8 : un équipier est rattaché à son restaurant par le rôle « tacosfox:staff:<restaurant> »
   (ex. tacosfox:staff:stains-marcel-cachin) ; il ne voit que les commandes de ce restaurant. */
export const ROLES_CLAIM = 'https://tacosfox.fr/roles';

const list = (claim: unknown): string[] => (Array.isArray(claim) ? claim.filter((r): r is string => typeof r === 'string') : []);

export function roleFromClaim(claim: unknown): Role {
  const roles = list(claim);
  if (roles.includes('superadmin')) return 'SUPERADMIN';
  if (roles.includes('admin')) return 'ADMIN';
  if (roles.includes('staff') || roles.some(r => r.startsWith('staff:'))) return 'STAFF';
  return 'CUSTOMER';
}

/* Restaurants (slugs) d'un équipier, d'après ses rôles « staff:<restaurant> » */
export function restaurantsFromClaim(claim: unknown): string[] {
  return [...new Set(list(claim).filter(r => /^staff:[a-z0-9-]+$/.test(r)).map(r => r.slice('staff:'.length)))];
}
