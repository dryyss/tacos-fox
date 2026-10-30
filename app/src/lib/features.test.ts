import { describe, expect, it } from 'vitest';
import { canUse, publicFeatures } from './features';
import { makeOptions } from './options';

const none = makeOptions([]);
const withO1O3 = makeOptions(['O1', 'O3']);

describe('canUse : formule Essentiel (aucune option)', () => {
  it('l\'équipe et le gérant ont seulement ce qui est inclus', () => {
    for (const role of ['STAFF', 'ADMIN'] as const) {
      expect(canUse('orders', role, none)).toBe(true);
      expect(canUse('history', role, none)).toBe(true);
      expect(canUse('qrcodes', role, none)).toBe(true);
      for (const f of ['menu', 'settings', 'stock', 'accounting', 'delivery', 'promos', 'options'] as const) expect(canUse(f, role, none)).toBe(false);
    }
  });
  it('MAGAR (super-admin) garde tout, pour faire les modifications prévues sans O1', () => {
    for (const f of ['menu', 'settings', 'accounting', 'options', 'orders'] as const) expect(canUse(f, 'SUPERADMIN', none)).toBe(true);
  });
  it('un client ou un visiteur n\'a rien', () => {
    expect(canUse('orders', 'CUSTOMER', none)).toBe(false);
    expect(canUse('orders', undefined, none)).toBe(false);
  });
});

describe('canUse : options achetées', () => {
  it('O1 et O3 ouvrent la carte et la compta au gérant, pas à l\'équipe', () => {
    expect(canUse('menu', 'ADMIN', withO1O3)).toBe(true);
    expect(canUse('accounting', 'ADMIN', withO1O3)).toBe(true);
    expect(canUse('menu', 'STAFF', withO1O3)).toBe(false);
    expect(canUse('promos', 'ADMIN', withO1O3)).toBe(false);
    expect(canUse('options', 'ADMIN', withO1O3)).toBe(false);
  });
});

describe('publicFeatures', () => {
  it('tout est coupé par défaut, et suit les options', () => {
    expect(publicFeatures([])).toEqual({ delivery: false, customerAccount: false, promoCodes: false, stock: false, statusEmails: false });
    expect(publicFeatures(['O5', 'O7'])).toMatchObject({ delivery: true, customerAccount: true, promoCodes: false });
  });
});
