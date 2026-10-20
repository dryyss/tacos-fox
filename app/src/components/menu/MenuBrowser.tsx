'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/Icons';
import { useCart } from '@/components/cart/CartProvider';
import type { Catalog, CatalogProduct } from '@/lib/catalog-types';
import { priceLine } from '@/lib/pricing';
import { formatPrice } from '@/lib/money';
import { ProductCard } from './ProductCard';
import { ProductSheet } from './ProductSheet';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/* Ouverture d'un produit (fiche ou ajout direct), partagée entre la carte et l'accueil */
export function useProductOpener(pizzas: CatalogProduct[]) {
  const { add } = useCart();
  const [open, setOpen] = useState<{ product: CatalogProduct; size?: string } | null>(null);

  const openProduct = useCallback((product: CatalogProduct, size?: string) => {
    if (product.isAvailable) setOpen({ product, size });
  }, []);
  const quickAdd = useCallback((product: CatalogProduct) => {
    if (!product.isAvailable) return;
    if (product.sizes.length || product.groups.length) return setOpen({ product });
    const l = priceLine(product, { productId: product.id, qty: 1 });
    add({ input: l.config, name: l.name, unitPrice: l.unitPrice, details: l.details, tbc: product.tbc });
  }, [add]);

  const sheet = open && <ProductSheet key={open.product.id + (open.size ?? '')} product={open.product} initialSize={open.size} pizzas={pizzas} onClose={() => setOpen(null)} />;
  return { openProduct, quickAdd, sheet };
}

export function MenuBrowser({ catalog, initialCat }: { catalog: Catalog; initialCat?: string }) {
  const pizzas = useMemo(() => catalog.products.filter(p => p.kind === 'PIZZA'), [catalog]);
  const { openProduct, quickAdd, sheet } = useProductOpener(pizzas);
  const cats = useMemo(() => catalog.categories.filter(c => catalog.products.some(p => p.categorySlug === c.slug)), [catalog]);
  const home = initialCat && cats.some(c => c.slug === initialCat) ? initialCat : cats[0]?.slug;

  const [query, setQuery] = useState('');
  const [opened, setOpened] = useState<Set<string>>(() => new Set(home ? [home] : []));
  const [active, setActive] = useState<string | undefined>(home);
  const catsRef = useRef<HTMLElement>(null);
  const spyPaused = useRef(false);

  const q = norm(query.trim());
  const visible = useMemo(() => {
    const map = new Map<string, CatalogProduct[]>();
    for (const c of cats) {
      const label = norm(c.label);
      map.set(c.slug, catalog.products.filter(p => p.categorySlug === c.slug && (!q || norm(`${p.name} ${p.description} ${label} ${p.groups.flatMap(g => g.choices.map(ch => ch.label)).join(' ')}`).includes(q))));
    }
    return map;
  }, [catalog, cats, q]);
  const anyResult = [...visible.values()].some(v => v.length);

  // Centre la catégorie active dans la barre horizontale
  useEffect(() => {
    const bar = catsRef.current; const a = bar?.querySelector<HTMLElement>(`a[data-cat="${active}"]`);
    if (!bar || !a) return;
    const ar = a.getBoundingClientRect(), cr = bar.getBoundingClientRect();
    bar.scrollTo({ left: bar.scrollLeft + (ar.left - cr.left) - cr.width / 2 + ar.width / 2, behavior: 'smooth' });
  }, [active]);

  // Suit la section ouverte visible à l'écran
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      if (spyPaused.current) return;
      const vis = entries.filter(e => e.isIntersecting && e.target.classList.contains('is-open')).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setActive((vis[0].target as HTMLElement).dataset.cat);
    }, { rootMargin: '-40% 0px -55% 0px' });
    document.querySelectorAll('.menu-section').forEach(s => io.observe(s));
    return () => io.disconnect();
  }, [opened, q]);

  // Arrivée avec ?cat= : défile jusqu'à la section
  useEffect(() => {
    if (initialCat && home === initialCat) requestAnimationFrame(() => document.getElementById(`cat-${home}`)?.scrollIntoView({ block: 'start' }));
  }, [initialCat, home]);

  const pause = (ms: number) => { spyPaused.current = true; setTimeout(() => { spyPaused.current = false; }, ms); };

  const goTo = (slug: string) => {
    pause(800);
    setOpened(s => new Set(s).add(slug));
    setActive(slug);
    history.replaceState(null, '', `/carte?cat=${slug}`);
    requestAnimationFrame(() => document.getElementById(`cat-${slug}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const toggleSection = (slug: string) => {
    const willOpen = !opened.has(slug);
    setOpened(s => {
      const next = new Set(s);
      if (willOpen) next.add(slug); else next.delete(slug);
      return next;
    });
    if (willOpen) { pause(600); setActive(slug); }
  };

  return (
    <div className="page">
      <div className="menu-top"><div className="menu-top__inner">
        <div className="search">
          <Icon name="search" />
          <input type="search" inputMode="search" placeholder="Un plat, une viande, une sauce..." autoComplete="off" aria-label="Rechercher dans la carte" value={query} onChange={e => setQuery(e.target.value)} />
          {query && <button className="search__clear" onClick={() => setQuery('')} aria-label="Effacer la recherche"><Icon name="close" /></button>}
        </div>
        <nav className="cats" ref={catsRef} aria-label="Catégories">
          {cats.map(c => (
            <a key={c.slug} href={`/carte?cat=${c.slug}`} data-cat={c.slug} className={active === c.slug ? 'is-active' : ''} onClick={e => { e.preventDefault(); setQuery(''); goTo(c.slug); }}>{c.label}</a>
          ))}
        </nav>
      </div></div>

      <div>
        {cats.map(c => {
          const items = visible.get(c.slug) ?? [];
          if (!items.length) return null;
          const isOpen = !!q || opened.has(c.slug);
          const tacos = c.slug === 'tacos' ? items.find(p => p.kind === 'TACOS') : undefined;
          return (
            <section key={c.slug} className={`menu-section ${isOpen ? 'is-open' : ''}`} id={`cat-${c.slug}`} data-cat={c.slug}>
              <h2 className="menu-section__title">
                <button type="button" className="menu-section__toggle" aria-expanded={isOpen} aria-controls={`body-${c.slug}`} onClick={() => toggleSection(c.slug)}>
                  <span className="menu-section__name">{c.label}</span>
                  <small>{tacos ? tacos.sizes.length : items.length} choix</small>
                  <Icon name="chevron" className="ico menu-section__chev" />
                </button>
              </h2>
              {isOpen && (
                <div className="menu-section__body" id={`body-${c.slug}`}>
                  {c.description && <p className="menu-section__sub">{c.description}</p>}
                  {tacos ? (
                    <>
                      <div className="grid grid--1"><ProductCard product={tacos} onOpen={p => openProduct(p)} onQuickAdd={quickAdd} /></div>
                      <div className="sizes-row">
                        {tacos.sizes.map(s => (
                          <button key={s.code} className="size-chip" onClick={() => openProduct(tacos, s.code)} aria-label={`Composer un tacos ${s.label}`} disabled={!tacos.isAvailable}>
                            <b>{s.label}</b><small>{s.hint}</small><span className="price">{formatPrice(s.price)}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="grid">{items.map(p => <ProductCard key={p.id} product={p} onOpen={p => openProduct(p)} onQuickAdd={quickAdd} />)}</div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
      {!anyResult && <div className="empty"><p className="display">Rien trouvé</p><p>Essayez « tacos », « kebab », « chèvre miel »...</p></div>}
      <div style={{ height: 40 }} />
      {sheet}
    </div>
  );
}
