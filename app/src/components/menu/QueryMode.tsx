'use client';

import { useEffect } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import { useToast } from '@/components/ui/Toast';

/* Arrivée par le QR code d'une table : mode sur place et numéro de table pour la cuisine */
export function QueryMode({ mode, table }: { mode?: string; table?: string }) {
  const { ready, setMode, updateCheckout, checkout } = useCart();
  const toast = useToast();
  useEffect(() => {
    if (!ready || mode !== 'surplace') return;
    setMode('SURPLACE');
    if (table && /^\d{1,3}$/.test(table)) {
      const tag = `Table ${table}`;
      if (!checkout.note.startsWith('Table ')) updateCheckout({ note: checkout.note ? `${tag} · ${checkout.note}` : tag });
      else updateCheckout({ note: checkout.note.replace(/^Table \d+/, tag) });
      toast(`Bienvenue ! Commande pour la ${tag.toLowerCase()}`, 'store');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, mode, table]);
  return null;
}
