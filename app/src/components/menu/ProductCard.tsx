'use client';

import { Icon, type IconName } from '@/components/Icons';
import type { CatalogProduct } from '@/lib/catalog-types';
import { formatPrice } from '@/lib/money';

const BADGES: Record<string, { label: string; icon: IconName }> = {
  best: { label: 'Best-seller', icon: 'star' },
  nouveau: { label: 'Nouveau', icon: 'spark' },
  epice: { label: 'Épicé', icon: 'flame' },
};

export function Photo({ src, alt, label = 'Photo du plat', className = '' }: { src?: string | null; alt?: string; label?: string; className?: string }) {
  return (
    <div className={`ph ${className}`}>
      <Icon name="fox" className="ph__fox" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt={alt ?? ''} loading="lazy" /> : label && <span className="ph__tag"><Icon name="camera" />{label}</span>}
    </div>
  );
}

export function Badges({ product }: { product: CatalogProduct }) {
  const bogo = product.sizes.some(s => s.bogo);
  return (
    <>
      {!product.isAvailable && <span className="badge badge--off">Indisponible</span>}
      {bogo && <span className="badge badge--bogo" title="1 pizza achetée = 1 offerte (Senior et Mega)">2e offerte</span>}
      {product.badges.filter(b => BADGES[b]).map(b => <span key={b} className={`badge badge--${b}`}><Icon name={BADGES[b].icon} />{BADGES[b].label}</span>)}
    </>
  );
}

export function ProductCard({ product, onOpen, onQuickAdd }: { product: CatalogProduct; onOpen: (p: CatalogProduct) => void; onQuickAdd: (p: CatalogProduct) => void }) {
  if (product.kind === 'TACOS') return <TacosCard product={product} onOpen={onOpen} />;
  return (
    <article className="card" data-unavailable={product.isAvailable ? undefined : ''} onClick={() => onOpen(product)}>
      <div className="card__media"><Photo src={product.imageUrl} alt={product.name} /><div className="card__badges"><Badges product={product} /></div></div>
      <div className="card__body">
        <h3 className="card__name">{product.name}</h3>
        <p className="card__desc">{product.description}</p>
        {product.formula && <span className="card__formula">{product.formula}</span>}
        <div className="card__foot">
          <div className="card__price">
            {product.priceFrom && <small>dès</small>}
            <span className="price">{formatPrice(product.price)}</span>
            {product.tbc && <small>prix à confirmer</small>}
          </div>
          <button className="add" onClick={e => { e.stopPropagation(); onQuickAdd(product); }} aria-label={`Ajouter ${product.name}`} disabled={!product.isAvailable}><Icon name="plus" /></button>
        </div>
      </div>
    </article>
  );
}

export function TacosCard({ product, onOpen }: { product: CatalogProduct; onOpen: (p: CatalogProduct, size?: string) => void }) {
  return (
    <article className="card card--compose" data-unavailable={product.isAvailable ? undefined : ''} onClick={() => onOpen(product)}>
      <div className="card__media"><Photo src={product.imageUrl} alt={product.name} className="ph--red" /><div className="card__badges"><Badges product={product} /></div></div>
      <div className="card__body">
        <h3 className="card__name">{product.name}</h3>
        <p className="card__desc">{product.description}</p>
        <div className="card__foot">
          <div className="card__price"><small>dès</small><span className="price">{formatPrice(product.price)}</span></div>
          <button className="add add--wide" aria-label="Composer mon tacos" disabled={!product.isAvailable}>Composer <Icon name="plus" /></button>
        </div>
      </div>
    </article>
  );
}
