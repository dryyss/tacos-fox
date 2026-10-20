import { describe, expect, it } from 'vitest';
import { roleFromClaim } from './roles';

describe('roleFromClaim', () => {
  it('donne le rôle le plus élevé transmis par Auth0', () => {
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
