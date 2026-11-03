import { describe, expect, it } from 'vitest';
import { restaurantsFromClaim, roleFromClaim } from './roles';

describe('roleFromClaim', () => {
  it('donne le rôle le plus élevé transmis par Auth0', () => {
    expect(roleFromClaim(['superadmin', 'staff'])).toBe('SUPERADMIN');
    expect(roleFromClaim(['admin'])).toBe('ADMIN');
    expect(roleFromClaim(['staff', 'admin'])).toBe('ADMIN');
    expect(roleFromClaim(['staff'])).toBe('STAFF');
  });
  it('retombe sur client sans rôle reconnu, revendication absente ou malformée', () => {
    expect(roleFromClaim([])).toBe('CUSTOMER');
    expect(roleFromClaim(undefined)).toBe('CUSTOMER');
    expect(roleFromClaim('admin')).toBe('CUSTOMER');
    expect(roleFromClaim(['tacosfox:admin', 'Admin'])).toBe('CUSTOMER');
  });
});

describe('restaurantsFromClaim', () => {
  it('rattache un équipier à ses restaurants', () => {
    expect(roleFromClaim(['staff:stains-marcel-cachin'])).toBe('STAFF');
    expect(restaurantsFromClaim(['staff', 'staff:stains-marcel-cachin', 'staff:blanc-mesnil', 'staff:blanc-mesnil'])).toEqual(['stains-marcel-cachin', 'blanc-mesnil']);
  });
  it('ignore le reste', () => {
    expect(restaurantsFromClaim(['admin', 'staff', 'staff:', 'staff:Stains', 42])).toEqual([]);
    expect(restaurantsFromClaim(undefined)).toEqual([]);
  });
});
