'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import { PENDING_KEY } from '@/components/checkout/Checkout';

/* Vide le panier de la commande qui vient d'être passée, puis suit le statut en direct */
export function TrackingRefresher({ token, status, live }: { token: string; status: string; live: boolean }) {
  const router = useRouter();
  const { clear, ready } = useCart();
  const last = useRef(status);

  useEffect(() => {
    if (!ready) return;
    try {
      if (localStorage.getItem(PENDING_KEY) === token && status !== 'PENDING_PAYMENT' && status !== 'CANCELLED') {
        clear();
        localStorage.removeItem(PENDING_KEY);
      }
    } catch { /* stockage indisponible */ }
  }, [ready, token, status, clear]);

  useEffect(() => {
    last.current = status;
    if (!live) return;
    const t = setInterval(async () => {
      if (document.hidden) return;
      const res = await fetch(`/api/track/${token}`, { cache: 'no-store' }).catch(() => null);
      if (!res?.ok) return;
      const data = await res.json();
      if (data.status !== last.current) { last.current = data.status; router.refresh(); }
    }, 8000);
    return () => clearInterval(t);
  }, [token, status, live, router]);

  return null;
}
