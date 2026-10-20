import type { Role } from '@prisma/client';

/* Rôles gérés dans Auth0 (tacosfox:admin, tacosfox:staff), transmis par l'Action « tacosfox-roles » */
export const ROLES_CLAIM = 'https://tacosfox.fr/roles';

export function roleFromClaim(claim: unknown): Role {
  const roles = Array.isArray(claim) ? claim : [];
  if (roles.includes('admin')) return 'ADMIN';
  if (roles.includes('staff')) return 'STAFF';
  return 'CUSTOMER';
}
