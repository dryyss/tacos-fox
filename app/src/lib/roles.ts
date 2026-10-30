import type { Role } from '@prisma/client';

/* Rôles gérés dans Auth0, transmis par l'Action « tacosfox-roles » (préfixe tacosfox: retiré) :
   superadmin (MAGAR Développement), admin (gérant), staff (équipe). */
export const ROLES_CLAIM = 'https://tacosfox.fr/roles';

export function roleFromClaim(claim: unknown): Role {
  const roles = Array.isArray(claim) ? claim : [];
  if (roles.includes('superadmin')) return 'SUPERADMIN';
  if (roles.includes('admin')) return 'ADMIN';
  if (roles.includes('staff')) return 'STAFF';
  return 'CUSTOMER';
}
