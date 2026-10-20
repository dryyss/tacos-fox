'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CartLineInput } from '@/lib/catalog-types';
import type { Mode } from '@/lib/pricing';
import { useToast } from '@/components/ui/Toast';

export interface CartItem {
  key: string;
  input: CartLineInput;
  // Affichage immédiat ; les montants qui font foi viennent de /api/quote
  name: string;
  unitPrice: number;
  details: string[];
  tbc?: boolean;
}

export interface CheckoutInfo {
  slot: string; // 'asap' ou 'HH:MM'
  name: string;
  phone: string;
  email: string;
  zoneId: string;
  line1: string;
  extra: string;
  addressId: string; // adresse enregistrée choisie, ou 'new'
  note: string;
  payment: 'CARD' | 'ONSITE';
  promoCode: string;
}

const EMPTY_CHECKOUT: CheckoutInfo = { slot: 'asap', name: '', phone: '', email: '', zoneId: '', line1: '', extra: '', addressId: '', note: '', payment: 'CARD', promoCode: '' };

interface CartContextValue {
  ready: boolean;
  items: CartItem[];
  mode: Mode;
  checkout: CheckoutInfo;
  count: number;
  subtotal: number;
  add(item: Omit<CartItem, 'key'>): void;
  setQty(key: string, qty: number): void;
  remove(key: string): void;
  clear(): void;
  setMode(mode: Mode): void;
  updateCheckout(patch: Partial<CheckoutInfo>): void;
  /* Aligne les prix affichés sur ceux recalculés par le serveur */
  syncPrices(prices: { key: string; unitPrice: number; name: string; details: string[] }[]): void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE = { items: 'tfx_cart_v2', mode: 'tfx_mode_v2', checkout: 'tfx_checkout_v2' };

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage indisponible */ }
}

export function lineKey(input: CartLineInput): string {
  const sel = Object.entries(input.selections ?? {}).filter(([, v]) => v.length).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${[...v].sort().join(',')}`);
  return [input.productId, input.sizeCode ?? '', input.freePizzaId ?? '', ...sel].join('|');
}

export function CartProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [mode, setModeState] = useState<Mode>('EMPORTER');
  const [checkout, setCheckout] = useState<CheckoutInfo>(EMPTY_CHECKOUT);

  useEffect(() => {
    setItems(load(STORAGE.items, []));
    setModeState(load(STORAGE.mode, 'EMPORTER'));
    setCheckout({ ...EMPTY_CHECKOUT, ...load(STORAGE.checkout, {}) });
    setReady(true);
  }, []);

  useEffect(() => { if (ready) save(STORAGE.items, items); }, [ready, items]);
  useEffect(() => { if (ready) save(STORAGE.mode, mode); }, [ready, mode]);
  useEffect(() => { if (ready) save(STORAGE.checkout, checkout); }, [ready, checkout]);

  const add = useCallback((item: Omit<CartItem, 'key'>) => {
    const key = lineKey(item.input);
    setItems(prev => {
      const same = prev.find(i => i.key === key);
      if (same) return prev.map(i => (i.key === key ? { ...i, input: { ...i.input, qty: Math.min(20, i.input.qty + item.input.qty) } } : i));
      return [...prev, { ...item, key }];
    });
    toast(`${item.name} ajouté au panier`, 'bag');
  }, [toast]);

  const setQty = useCallback((key: string, qty: number) => {
    setItems(prev => (qty <= 0 ? prev.filter(i => i.key !== key) : prev.map(i => (i.key === key ? { ...i, input: { ...i.input, qty: Math.min(20, qty) } } : i))));
  }, []);

  const value = useMemo<CartContextValue>(() => ({
    ready, items, mode, checkout,
    count: items.reduce((a, i) => a + i.input.qty, 0),
    subtotal: items.reduce((a, i) => a + i.input.qty * i.unitPrice, 0),
    add, setQty,
    remove: key => setItems(prev => prev.filter(i => i.key !== key)),
    clear: () => setItems([]),
    setMode: setModeState,
    updateCheckout: patch => setCheckout(prev => ({ ...prev, ...patch })),
    syncPrices: prices => setItems(prev => prev.map(i => {
      const p = prices.find(x => x.key === i.key);
      return p && (p.unitPrice !== i.unitPrice || p.name !== i.name) ? { ...i, unitPrice: p.unitPrice, name: p.name, details: p.details } : i;
    })),
  }), [ready, items, mode, checkout, add, setQty]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart hors de CartProvider');
  return ctx;
}
