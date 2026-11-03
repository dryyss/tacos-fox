import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { allow } = await import('./rate-limit');

describe('allow', () => {
  it('accepte jusqu\'à la limite puis refuse, et repart après la fenêtre', () => {
    const t = 1_000_000;
    expect([1, 2, 3].map(() => allow('k', 3, 1000, t))).toEqual([true, true, true]);
    expect(allow('k', 3, 1000, t + 10)).toBe(false);
    expect(allow('k', 3, 1000, t + 1001)).toBe(true);
  });

  it('compte chaque clé séparément', () => {
    expect(allow('a', 1, 1000, 5)).toBe(true);
    expect(allow('b', 1, 1000, 5)).toBe(true);
    expect(allow('a', 1, 1000, 6)).toBe(false);
  });
});
