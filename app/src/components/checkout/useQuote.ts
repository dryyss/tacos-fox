'use client';

import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import type { Totals } from '@/lib/pricing';

export interface QuoteResult {
  lines: { index: number; ok: boolean; error?: string; line?: { unitPrice: number; name: string; details: string[] } }[];
  totals: Totals;
  promo: { code: string; valid: boolean; message?: string } | null;
  errors: string[];
}

/* Recalcul serveur du panier dès qu'il change. Les prix affichés sont alignés sur la réponse. */
export function useQuote(promoCode?: string) {
  const { ready, items, mode, checkout, syncPrices } = useCart();
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  const zoneId = mode === 'LIVRAISON' ? checkout.zoneId || null : null;
  const payload = JSON.stringify({ lines: items.map(i => i.input), mode, zoneId, promoCode: promoCode || null });

  useEffect(() => {
    if (!ready || !items.length) { setQuote(null); return; }
    const id = ++seq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/quote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload });
        if (!res.ok || id !== seq.current) return;
        const q: QuoteResult = await res.json();
        setQuote(q);
        syncPrices(q.lines.filter(l => l.ok).map(l => ({ key: items[l.index].key, ...l.line! })));
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, payload]);

  const lineError = (index: number) => quote?.lines.find(l => l.index === index && !l.ok)?.error;
  return { quote, loading, lineError };
}
