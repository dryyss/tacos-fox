'use client';

import Link from 'next/link';
import { createContext, useContext, useState, useTransition, type ReactNode } from 'react';
import { Icon } from '@/components/Icons';
import { useToast } from '@/components/ui/Toast';
import { toggleFavorite } from '@/app/(site)/compte/actions';

const FavoritesContext = createContext<{ loggedIn: boolean; ids: Set<string>; setIds: (s: Set<string>) => void }>({ loggedIn: false, ids: new Set(), setIds: () => {} });

export function FavoritesProvider({ loggedIn, initial, children }: { loggedIn: boolean; initial: string[]; children: ReactNode }) {
  const [ids, setIds] = useState(() => new Set(initial));
  return <FavoritesContext.Provider value={{ loggedIn, ids, setIds }}>{children}</FavoritesContext.Provider>;
}

/* Cœur de la fiche produit ; invite à se connecter si besoin */
export function FavoriteButton({ productId }: { productId: string }) {
  const { loggedIn, ids, setIds } = useContext(FavoritesContext);
  const toast = useToast();
  const [pending, start] = useTransition();
  const on = ids.has(productId);

  if (!loggedIn) return <Link className="small link" href="/connexion?retour=/carte" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6 }}><Icon name="heart-o" /> Connectez-vous pour l&apos;ajouter aux favoris</Link>;

  return (
    <button type="button" className="btn--text" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 32, marginTop: 4 }} disabled={pending} aria-pressed={on}
      onClick={() => start(async () => {
        const r = await toggleFavorite(productId);
        if (!r.ok) return toast(r.error ?? 'Action impossible');
        const next = new Set(ids);
        if (r.favorite) next.add(productId); else next.delete(productId);
        setIds(next);
        toast(r.favorite ? 'Ajouté aux favoris' : 'Retiré des favoris', r.favorite ? 'heart' : 'check');
      })}>
      <Icon name={on ? 'heart' : 'heart-o'} /> {on ? 'Dans vos favoris' : 'Ajouter aux favoris'}
    </button>
  );
}
