'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/Icons';
import { Qty, Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { useCart } from '@/components/cart/CartProvider';
import type { CatalogGroup, CatalogProduct } from '@/lib/catalog-types';
import { effectiveMax, MAX_QTY, priceLine, PricingError } from '@/lib/pricing';
import { formatPrice } from '@/lib/money';
import { Photo } from './ProductCard';
import { FavoriteButton } from './Favorites';

type Selections = Record<string, string[]>;

function StepHead({ n, title, hint, count }: { n: number; title: string; hint?: string | null; count?: { text: string; cls?: string } | null }) {
  return (
    <div className="step__head">
      <span className="step__num">{n}</span>
      <div><div className="step__title">{title}</div>{hint && <div className="step__hint">{hint}</div>}</div>
      {count && <span className={`step__count ${count.cls ?? ''}`}>{count.text}</span>}
    </div>
  );
}

/* Composeur unique : tacos, pizzas (taille + pizza offerte) et produits à options */
export function ProductSheet({ product, pizzas, initialSize, onClose }: { product: CatalogProduct; pizzas: CatalogProduct[]; initialSize?: string; onClose: () => void }) {
  const { add } = useCart();
  const toast = useToast();
  const defaultSize = initialSize ?? (product.kind === 'TACOS' ? 'M' : (product.sizes.find(s => s.bogo) ?? product.sizes[0])?.code);
  const [sizeCode, setSizeCode] = useState<string | undefined>(product.sizes.some(s => s.code === defaultSize) ? defaultSize : product.sizes[0]?.code);
  // Choix obligatoire à option unique (accompagnement « Frites ») : présélectionné
  const [selections, setSelections] = useState<Selections>(() => Object.fromEntries(
    product.groups.filter(g => g.min > 0 && g.choices.filter(c => c.isAvailable).length === 1).map(g => [g.key, [g.choices.find(c => c.isAvailable)!.id]]),
  ));
  const [freePizzaId, setFreePizzaId] = useState(product.id);
  const [qty, setQty] = useState(1);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const size = product.sizes.find(s => s.code === sizeCode);
  const isTacos = product.kind === 'TACOS';
  const bogoActive = product.kind === 'PIZZA' && !!size?.bogo;

  const unit = useMemo(() => {
    let u = size ? size.price : product.price;
    for (const g of product.groups) for (const id of selections[g.key] ?? []) u += g.choices.find(c => c.id === id)?.price ?? 0;
    return u;
  }, [product, size, selections]);

  const setGroup = (key: string, ids: string[]) => {
    setSelections(s => ({ ...s, [key]: ids }));
    if (errorKey === key) setErrorKey(null);
  };

  const changeSize = (code: string) => {
    setSizeCode(code);
    const next = product.sizes.find(s => s.code === code);
    // Réduit les sélections qui dépassent le nouveau maximum (viandes du tacos)
    setSelections(s => Object.fromEntries(Object.entries(s).map(([k, v]) => {
      const g = product.groups.find(x => x.key === k);
      return [k, g ? v.slice(0, effectiveMax(g, next)) : v];
    })));
  };

  const toggle = (g: CatalogGroup, id: string) => {
    const sel = selections[g.key] ?? [];
    const max = effectiveMax(g, size);
    if (sel.includes(id)) return setGroup(g.key, max === 1 && g.min === 1 ? sel : sel.filter(x => x !== id));
    if (max === 1) return setGroup(g.key, [id]);
    if (sel.length >= max) return toast(g.key === 'meats' ? `${max} viande${max > 1 ? 's' : ''} maximum en taille ${size?.label}` : `${max} maximum pour « ${g.label} »`);
    setGroup(g.key, [...sel, id]);
  };

  const submit = () => {
    try {
      const priced = priceLine(product, { productId: product.id, qty, sizeCode, selections, freePizzaId: bogoActive ? freePizzaId : null }, pizzas);
      add({ input: priced.config, name: priced.name, unitPrice: priced.unitPrice, details: priced.details, tbc: product.tbc, image: product.imageUrl });
      onClose();
    } catch (e) {
      if (!(e instanceof PricingError)) throw e;
      setErrorKey(e.groupKey ?? null);
      toast(e.message);
      requestAnimationFrame(() => document.querySelector('.sheet .step.is-error')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };

  let n = 0;
  const sub = isTacos ? 'Prix mis à jour en direct' : [product.description, product.formula].filter(Boolean).join(' · ') + (product.tbc ? ' · Prix à confirmer' : '');

  return (
    <Sheet
      title={isTacos ? 'Composer mon tacos' : product.name}
      sub={sub}
      onClose={onClose}
      foot={<>
        <Qty value={qty} onChange={v => setQty(Math.max(1, Math.min(MAX_QTY, v)))} />
        <button className="btn btn--primary" onClick={submit} disabled={!product.isAvailable}>
          {product.isAvailable ? (isTacos ? 'Ajouter au panier' : 'Ajouter') : 'Indisponible'} <span className="price" key={unit * qty}>{formatPrice(unit * qty)}</span>
        </button>
      </>}
    >
      {!isTacos && <div className="sheet__media" style={{ marginTop: 12 }}><Photo src={product.imageUrl} alt={product.name} label={`Photo ${product.name}`} /></div>}
      <div style={{ padding: '0 var(--page-x)' }}>
        <FavoriteButton productId={product.id} />
        {product.allergens.length > 0 && <p className="small muted" style={{ marginTop: 4 }}>Allergènes : {product.allergens.join(', ')}</p>}
      </div>

      {product.sizes.length > 0 && (
        <div className="step">
          <StepHead n={++n} title="La taille" hint={isTacos ? product.description.split('.')[0] : bogoActive || product.sizes.some(s => s.bogo) ? 'Senior et Mega : la 2e pizza est offerte' : null}
            count={{ text: size ? (isTacos ? `${size.label} · ${size.hint ?? ''}` : size.label) : 'À choisir', cls: size ? 'is-ok' : 'is-need' }} />
          <div className="sizes" style={isTacos ? undefined : { gridTemplateColumns: `repeat(${product.sizes.length},1fr)` }}>
            {product.sizes.map(s => (
              <button key={s.code} type="button" className={`size ${s.code === sizeCode ? 'is-selected' : ''}`} onClick={() => changeSize(s.code)}>
                <b>{s.label}</b>
                <small>{isTacos ? `${s.includedQty} viande${s.includedQty > 1 ? 's' : ''}` : s.hint}</small>
                <span className="price">{formatPrice(s.price)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {bogoActive && (
        <div className={`step ${errorKey === 'free' ? 'is-error' : ''}`}>
          <StepHead n={++n} title="Votre pizza offerte" hint="Même taille, recette au choix" count={{ text: pizzas.find(p => p.id === freePizzaId)?.name ?? product.name, cls: 'is-ok' }} />
          <div className="bogo-note" style={{ margin: '0 0 10px' }}><Icon name="star" />1 {size!.label} achetée = 1 {size!.label} offerte, sur place et à emporter.</div>
          <div className="chips">
            {pizzas.filter(p => p.isAvailable).map(p => (
              <button key={p.id} type="button" className={`chip ${freePizzaId === p.id ? 'is-selected' : ''}`} onClick={() => setFreePizzaId(p.id)}>
                <Icon name="check" className="ico chip__check" />{p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {product.groups.map(g => {
        n++;
        const sel = selections[g.key] ?? [];
        const max = effectiveMax(g, size);
        const full = sel.length >= max;
        const req = g.min > 0;
        const labelOf = (id: string) => g.choices.find(c => c.id === id)?.label ?? '';

        const title = g.key === 'meats' ? (max > 1 ? 'Vos viandes' : 'Votre viande') : g.label;
        const hint = g.key === 'meats'
          ? (max > 1 ? `Jusqu'à ${max} viandes. Appuyez sur +1 pour doubler une viande.` : 'Appuyez pour choisir')
          : g.hint ?? (max > 1 ? `${req ? `Au moins ${g.min}, ` : ''}${max} maximum` : req ? '1 choix' : 'Optionnel');
        const count = max > 1
          ? { text: `${sel.length}/${max}`, cls: sel.length >= g.min && sel.length ? 'is-ok' : req ? 'is-need' : '' }
          : sel.length ? { text: labelOf(sel[0]), cls: 'is-ok' } : req ? { text: 'À choisir', cls: 'is-need' } : null;

        // Choix optionnel unique (gratinage, frites en plus) : liste à cocher
        if (max === 1 && g.min === 0) {
          return (
            <div key={g.id} className={`step ${errorKey === g.key ? 'is-error' : ''}`}>
              <StepHead n={n} title={title} hint={hint} count={sel.length ? { text: 'Ajouté', cls: 'is-ok' } : null} />
              <div className="opt-list">
                {g.choices.map(c => (
                  <button key={c.id} type="button" className={`opt ${sel.includes(c.id) ? 'is-selected' : ''}`} disabled={!c.isAvailable}
                    onClick={() => setGroup(g.key, sel.includes(c.id) ? [] : [c.id])}>
                    <span className={`opt__box ${g.choices.length > 1 ? 'opt__box--round' : ''}`}><Icon name="check" /></span>
                    <span className="opt__label">{c.label}{!c.isAvailable && <small>Indisponible</small>}</span>
                    {c.price > 0 && <span className="opt__price">+{formatPrice(c.price)}</span>}
                  </button>
                ))}
              </div>
            </div>
          );
        }

        return (
          <div key={g.id} className={`step ${errorKey === g.key ? 'is-error' : ''}`}>
            <StepHead n={n} title={title} hint={hint} count={count} />
            <div className="chips">
              {g.choices.map(c => {
                const times = sel.filter(x => x === c.id).length;
                const disabled = !c.isAvailable || (!times && full && max > 1);
                return (
                  <button key={c.id} type="button" className={`chip ${times ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''}`} onClick={() => c.isAvailable && toggle(g, c.id)}>
                    <Icon name="check" className="ico chip__check" />{c.label}
                    {c.price > 0 && <span className="chip__price">+{formatPrice(c.price)}</span>}
                    {times > 1 && <span className="chip__price">x{times}</span>}
                    {g.allowRepeat && times > 0 && max > 1 && !full && (
                      <span className="chip__more" role="button" aria-label={`Doubler ${c.label}`}
                        onClick={e => { e.stopPropagation(); setGroup(g.key, [...sel, c.id]); }}>+1</span>
                    )}
                  </button>
                );
              })}
            </div>
            {g.allowRepeat && sel.length > 0 && <p className="step__hint" style={{ marginTop: 8 }}>Sélection : {sel.map(labelOf).join(', ')}. Appuyez sur une viande sélectionnée pour la retirer.</p>}
          </div>
        );
      })}

      {!product.sizes.length && !product.groups.length && (
        <div className="step"><p className="muted">{product.formula ? product.formula + '. ' : ''}Ajoutez directement au panier, ou précisez une demande au moment de commander.</p></div>
      )}
    </Sheet>
  );
}
