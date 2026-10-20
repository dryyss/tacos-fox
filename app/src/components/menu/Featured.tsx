'use client';

import { useRef } from 'react';
import type { CatalogProduct } from '@/lib/catalog-types';
import { Icon } from '@/components/Icons';
import { ProductCard } from './ProductCard';
import { useProductOpener } from './MenuBrowser';

/* Incontournables de l'accueil, ouvrables directement sans passer par la carte */
export function Featured({ products, pizzas }: { products: CatalogProduct[]; pizzas: CatalogProduct[] }) {
  const { openProduct, quickAdd, sheet } = useProductOpener(pizzas);
  const scroller = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    const el = scroller.current;
    if (!el) return;
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior });
  };
  return (
    <>
      <div className="rail">
        <button type="button" className="rail__btn rail__btn--prev" aria-label="Plats précédents" onClick={() => scroll(-1)}><Icon name="back" /></button>
        <div className="scroller" ref={scroller}>{products.map(p => <ProductCard key={p.id} product={p} onOpen={p => openProduct(p)} onQuickAdd={quickAdd} />)}</div>
        <button type="button" className="rail__btn rail__btn--next" aria-label="Plats suivants" onClick={() => scroll(1)}><Icon name="chevron" /></button>
      </div>
      {sheet}
    </>
  );
}
