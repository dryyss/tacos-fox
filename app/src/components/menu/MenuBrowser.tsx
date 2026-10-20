'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/Icons';
import { useCart } from '@/components/cart/CartProvider';
import type { Catalog, CatalogCategory, CatalogProduct } from '@/lib/catalog-types';
import { priceLine } from '@/lib/pricing';
import { formatPrice } from '@/lib/money';
import { MODE_LABELS } from '@/lib/format';
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
    add({ input: l.config, name: l.name, unitPrice: l.unitPrice, details: l.details, tbc: product.tbc, image: product.imageUrl });
  }, [add]);

  const sheet = open && <ProductSheet key={open.product.id + (open.size ?? '')} product={open.product} initialSize={open.size} pizzas={pizzas} onClose={() => setOpen(null)} />;
  return { openProduct, quickAdd, sheet };
}

interface CatView extends CatalogCategory {
  products: CatalogProduct[];
  count: number;
  image: string | null;
  from: number | null;
}

function CatThumb({ src, small }: { src: string | null; small?: boolean }) {
  return (
    <span className={`cat-thumb ${small ? 'cat-thumb--sm' : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" loading="lazy" /> : <Icon name="fox" />}
    </span>
  );
}

export function MenuBrowser({ catalog, initialCat }: { catalog: Catalog; initialCat?: string }) {
  const pizzas = useMemo(() => catalog.products.filter(p => p.kind === 'PIZZA'), [catalog]);
  const { openProduct, quickAdd, sheet } = useProductOpener(pizzas);

  // Catégories non vides, avec une photo représentative et le prix d'entrée
  const cats = useMemo<CatView[]>(() => catalog.categories.map(c => {
    const products = catalog.products.filter(p => p.categorySlug === c.slug);
    const tacos = products.find(p => p.kind === 'TACOS');
    const lead = tacos ?? products.find(p => p.isFeatured && p.imageUrl) ?? products.find(p => p.imageUrl);
    const prices = products.filter(p => p.isAvailable).map(p => p.price);
    return { ...c, products, count: tacos ? tacos.sizes.length : products.length, image: lead?.imageUrl ?? null, from: prices.length ? Math.min(...prices) : null };
  }).filter(c => c.products.length), [catalog]);

  const [cat, setCat] = useState<string | null>(initialCat && cats.some(c => c.slug === initialCat) ? initialCat : null);
  const [query, setQuery] = useState('');
  const chipsRef = useRef<HTMLElement>(null);

  const q = norm(query.trim());
  const results = useMemo(() => {
    if (!q) return [];
    return cats.map(c => ({
      cat: c,
      items: c.products.filter(p => norm(`${p.name} ${p.description} ${c.label} ${p.groups.flatMap(g => g.choices.map(ch => ch.label)).join(' ')}`).includes(q)),
    })).filter(r => r.items.length);
  }, [cats, q]);

  const current = cats.find(c => c.slug === cat) ?? null;

  const pick = (slug: string | null) => {
    setCat(slug);
    setQuery('');
    history.replaceState(null, '', slug ? `/carte?cat=${slug}` : '/carte');
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  // Centre la pastille active dans la barre mobile
  useEffect(() => {
    const bar = chipsRef.current; const a = bar?.querySelector<HTMLElement>(`a[data-cat="${cat}"]`);
    if (!bar || !a) return;
    const ar = a.getBoundingClientRect(), cr = bar.getBoundingClientRect();
    bar.scrollTo({ left: bar.scrollLeft + (ar.left - cr.left) - cr.width / 2 + ar.width / 2, behavior: 'smooth' });
  }, [cat]);

  const productGrid = (c: CatView, items: CatalogProduct[]) => {
    const tacos = items.find(p => p.kind === 'TACOS');
    if (!tacos) return <div className="grid">{items.map(p => <ProductCard key={p.id} product={p} onOpen={p => openProduct(p)} onQuickAdd={quickAdd} />)}</div>;
    return (
      <>
        <div className="grid grid--1"><ProductCard product={tacos} onOpen={p => openProduct(p)} onQuickAdd={quickAdd} /></div>
        <div className="sizes-row">
          {tacos.sizes.map(s => (
            <button key={s.code} className="size-chip" onClick={() => openProduct(tacos, s.code)} aria-label={`Composer un tacos ${s.label}`} disabled={!tacos.isAvailable}>
              <b>{s.label}</b><small>{s.hint}</small><span className="price">{formatPrice(s.price)}</span>
            </button>
          ))}
        </div>
        {items.filter(p => p !== tacos).length > 0 && <div className="grid" style={{ marginTop: 14 }}>{items.filter(p => p !== tacos).map(p => <ProductCard key={p.id} product={p} onOpen={p => openProduct(p)} onQuickAdd={quickAdd} />)}</div>}
      </>
    );
  };

  let main;
  if (q) {
    main = results.length ? (
      <>
        <h1 className="menu-heading">Résultats pour « {query.trim()} »</h1>
        {results.map(r => (
          <section key={r.cat.slug} className="menu-block">
            <h2 className="menu-block__title"><CatThumb src={r.cat.image} small />{r.cat.label}<small>{r.items.length}</small></h2>
            {productGrid(r.cat, r.items)}
          </section>
        ))}
      </>
    ) : <div className="empty"><p className="display">Rien trouvé</p><p>Essayez « tacos », « kebab », « chèvre miel »...</p></div>;
  } else if (current) {
    main = (
      <section className="menu-block">
        <div className="cat-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {current.image && <img src={current.image} alt="" />}
          <div className="cat-hero__copy">
            <button type="button" className="cat-hero__back" onClick={() => pick(null)}><Icon name="back" /> Toutes les catégories</button>
            <h1 className="cat-hero__title">{current.label}</h1>
            {current.description && <p className="cat-hero__sub">{current.description}</p>}
          </div>
        </div>
        {productGrid(current, current.products)}
      </section>
    );
  } else {
    main = (
      <>
        <h1 className="menu-heading">La <em>carte</em></h1>
        <div className="cat-grid">
          {cats.map(c => (
            <a key={c.slug} href={`/carte?cat=${c.slug}`} className="cat-card" onClick={e => { e.preventDefault(); pick(c.slug); }}>
              <span className="cat-card__media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.image ? <img src={c.image} alt="" loading="lazy" /> : <Icon name="fox" className="ph__fox" />}
              </span>
              <span className="cat-card__body">
                <span className="cat-card__name">{c.label}</span>
                <span className="cat-card__meta">{c.count} choix{c.from != null && <> · dès {formatPrice(c.from)}</>}</span>
              </span>
              <Icon name="chevron" className="ico cat-card__chev" />
            </a>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="page">
      <div className="menu-top"><div className="menu-top__inner">
        <div className="search">
          <Icon name="search" />
          <input type="search" inputMode="search" placeholder="Un plat, une viande, une sauce..." autoComplete="off" aria-label="Rechercher dans la carte" value={query} onChange={e => setQuery(e.target.value)} />
          {query && <button className="search__clear" onClick={() => setQuery('')} aria-label="Effacer la recherche"><Icon name="close" /></button>}
        </div>
        <nav className="cats" ref={chipsRef} aria-label="Catégories">
          <a href="/carte" data-cat="" className={!cat && !q ? 'is-active' : ''} onClick={e => { e.preventDefault(); pick(null); }}>Tout</a>
          {cats.map(c => (
            <a key={c.slug} href={`/carte?cat=${c.slug}`} data-cat={c.slug} className={cat === c.slug && !q ? 'is-active' : ''} onClick={e => { e.preventDefault(); pick(c.slug); }}>{c.label}</a>
          ))}
        </nav>
      </div></div>

      <div className="menu-layout">
        <aside className="menu-side" aria-label="Catégories">
          <div className="menu-side__inner">
            <div className="menu-side__title">Catégories</div>
            {cats.map(c => (
              <a key={c.slug} href={`/carte?cat=${c.slug}`} className={cat === c.slug && !q ? 'is-active' : ''} onClick={e => { e.preventDefault(); pick(c.slug); }}>
                <CatThumb src={c.image} small />
                <span className="menu-side__label">{c.label}</span>
                <small>{c.count}</small>
              </a>
            ))}
          </div>
        </aside>
        <div className="menu-main">{main}</div>
        <MiniCart />
      </div>
      <div style={{ height: 40 }} />
      {sheet}
    </div>
  );
}

/* Panier en colonne droite (ordinateur) */
function MiniCart() {
  const { ready, items, count, subtotal, mode } = useCart();
  return (
    <aside className="menu-cart" aria-label="Votre panier">
      <div className="menu-cart__inner">
        <div className="menu-cart__title">Votre panier {ready && count > 0 && <small>{count} article{count > 1 ? 's' : ''}</small>}</div>
        {!ready || !items.length ? (
          <div className="menu-cart__empty">
            <Icon name="bag" />
            <p>Votre panier est vide</p>
            <small>Choisissez un plat pour commencer.</small>
          </div>
        ) : (
          <>
            <div className="menu-cart__list">
              {items.map(i => (
                <div key={i.key} className="menu-cart__item">
                  <span className="qty-badge">{i.input.qty}</span>
                  <div className="menu-cart__info"><strong>{i.name}</strong>{i.details.length > 0 && <small>{i.details.join(' · ')}</small>}</div>
                  <span className="menu-cart__price">{formatPrice(i.unitPrice * i.input.qty)}</span>
                </div>
              ))}
            </div>
            <div className="menu-cart__mode"><Icon name={mode === 'LIVRAISON' ? 'scooter' : mode === 'SURPLACE' ? 'store' : 'takeaway'} /><span>{MODE_LABELS[mode]}</span><Link href="/panier">Changer</Link></div>
            <div className="totals"><div className="total"><span>Sous-total</span><span className="price">{formatPrice(subtotal)}</span></div></div>
            <Link className="btn btn--primary btn--xl btn--block" href="/panier">Commander</Link>
            <p className="menu-cart__note"><Icon name="lock" /> Prix vérifiés au moment du paiement</p>
          </>
        )}
      </div>
    </aside>
  );
}
