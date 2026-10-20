'use client';

import Link from 'next/link';
import { Icon, type IconName } from '@/components/Icons';
import { useCart } from '@/components/cart/CartProvider';
import type { Mode } from '@/lib/pricing';

export interface ModeInfo { id: Mode; label: string; icon: IconName; note: string }

/* Choisir un mode depuis l'accueil le présélectionne pour le panier */
export function ModeLinks({ modes }: { modes: ModeInfo[] }) {
  const { setMode } = useCart();
  return (
    <div className="modes">
      {modes.map(m => (
        <Link key={m.id} className="mode" href="/carte" onClick={() => setMode(m.id)}>
          <div className="mode__ico"><Icon name={m.icon} /></div>
          <div><div className="mode__title">{m.label}</div><div className="mode__text">{m.note}</div></div>
          <Icon name="chevron" className="ico mode__chevron" />
        </Link>
      ))}
    </div>
  );
}
