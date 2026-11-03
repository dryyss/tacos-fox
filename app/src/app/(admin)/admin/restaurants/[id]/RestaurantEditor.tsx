'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Euro, Toggle } from '@/components/admin/fields';
import { DAY_NAMES, type DayHours } from '@/lib/hours';
import { formatPrice } from '@/lib/money';
import { saveRestaurant, saveRestaurantHours, setProductOverride, type RestaurantInput, type Result } from '../actions';

interface Product { id: string; name: string; category: string; price: number; sized: boolean; isHidden: boolean; ownPrice: number | null }
type Info = Required<RestaurantInput>;

export function RestaurantEditor({ id, initial, hours, products }: { id: string; initial: Info; hours: DayHours[]; products: Product[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [s, setS] = useState<Info>(initial);
  const [h, setH] = useState(hours);
  const [rows, setRows] = useState(products);
  const [filter, setFilter] = useState('');
  const set = <K extends keyof Info>(k: K, v: Info[K]) => setS(x => ({ ...x, [k]: v }));
  const setDay = (i: number, patch: Partial<DayHours>) => setH(x => x.map((d, k) => (k === i ? { ...d, ...patch } : d)));

  const run = (fn: () => Promise<Result>, ok: string) => start(async () => {
    const r = await fn();
    if (!r.ok) return toast(r.error ?? 'Erreur');
    toast(ok);
    router.refresh();
  });

  const text = (k: keyof Info, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="field"><label htmlFor={`r-${k}`}>{label}</label><input id={`r-${k}`} value={String(s[k] ?? '')} onChange={e => set(k, e.target.value as never)} {...props} /></div>
  );
  const num = (k: keyof Info, label: string) => (
    <div className="field"><label htmlFor={`r-${k}`}>{label}</label><input id={`r-${k}`} inputMode="numeric" value={s[k] as number} onChange={e => set(k, (Number.parseInt(e.target.value, 10) || 0) as never)} /></div>
  );

  const updateProduct = (p: Product, patch: Partial<Pick<Product, 'isHidden' | 'ownPrice'>>) => {
    const next = { ...p, ...patch };
    setRows(x => x.map(r => (r.id === p.id ? next : r)));
    run(() => setProductOverride(id, p.id, { isHidden: next.isHidden, price: next.ownPrice }), next.isHidden ? `${p.name} masqué dans ce restaurant` : `${p.name} enregistré`);
  };
  const shown = rows.filter(r => !filter || `${r.name} ${r.category}`.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="infos-grid" style={{ padding: 0 }}>
      <div>
        <div className="panel" style={{ marginTop: 0, background: s.orderingEnabled && s.isActive ? 'var(--white)' : 'var(--red-soft)' }}>
          <div className="panel__title">Commande en ligne</div>
          <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}>
            <Toggle on={s.orderingEnabled} label="Commande en ligne" onChange={v => set('orderingEnabled', v)} /> {s.orderingEnabled ? 'Ouverte' : 'Fermée (rush, fermeture exceptionnelle, pas encore lancé)'}
          </label>
          <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, marginTop: 8 }}>
            <Toggle on={s.isActive} label="Visible sur le site" onChange={v => set('isActive', v)} /> {s.isActive ? 'Visible sur le site' : 'Masqué du site'}
          </label>
        </div>

        <div className="panel">
          <div className="panel__title">Coordonnées et préparation</div>
          {text('label', 'Repère affiché après le nom (ex. « Marcel Cachin »)')}
          {text('phone', 'Téléphone affiché aux clients', { inputMode: 'tel' })}
          {text('email', 'E-mail du restaurant', { type: 'email' })}
          {num('prepMinutes', 'Délai moyen de préparation (minutes)')}
          {num('slotInterval', 'Intervalle entre deux créneaux (minutes)')}
          <div className="field"><label htmlFor="r-intro">Texte de la page du restaurant (référencement)</label><textarea id="r-intro" rows={4} value={s.intro} onChange={e => set('intro', e.target.value)} /></div>
        </div>

        <div className="panel">
          <div className="panel__title">Société qui encaisse (factures)</div>
          {text('legalName', 'Raison sociale')}
          {text('legalForm', 'Forme juridique (SAS, SARL…)')}
          <div className="field"><label>Capital social (€)</label><Euro label="Capital social" value={s.shareCapital} onChange={c => set('shareCapital', c ?? 0)} /></div>
          {text('siren', 'SIREN')}
          {text('siret', 'SIRET (si connu)')}
          {text('rcsCity', 'Greffe (RCS)')}
          {text('vatNumber', 'N° de TVA intracommunautaire')}
          <div className="field"><label htmlFor="r-vat">Taux de TVA des ventes à emporter (%)</label><input id="r-vat" inputMode="decimal" value={String(s.vatRate / 100).replace('.', ',')} onChange={e => set('vatRate', Math.round((Number.parseFloat(e.target.value.replace(',', '.')) || 0) * 100))} /></div>
          <p className="small muted">Taux à confirmer par le comptable du restaurant.</p>
        </div>
        <button className="btn btn--primary" disabled={pending} onClick={() => run(() => saveRestaurant(id, s), 'Restaurant enregistré')}>Enregistrer le restaurant</button>
      </div>

      <div>
        <div className="panel" style={{ marginTop: 0 }}>
          <div className="panel__title">Horaires d&apos;ouverture</div>
          <div className="table-wrap" tabIndex={0}><table className="table"><tbody>
            {h.map((d, i) => (
              <tr key={d.dayOfWeek}>
                <td><b>{DAY_NAMES[d.dayOfWeek]}</b></td>
                <td><Toggle on={d.isOpen} label="Ouvert" onChange={v => setDay(i, { isOpen: v })} /></td>
                <td><input type="time" value={d.open} disabled={!d.isOpen} onChange={e => setDay(i, { open: e.target.value })} aria-label={`Ouverture ${DAY_NAMES[d.dayOfWeek]}`} /></td>
                <td><input type="time" value={d.close} disabled={!d.isOpen} onChange={e => setDay(i, { close: e.target.value })} aria-label={`Fermeture ${DAY_NAMES[d.dayOfWeek]}`} /></td>
              </tr>
            ))}
          </tbody></table></div>
          <p className="small muted" style={{ marginTop: 8 }}>Fermeture à 00:00 = minuit. Les créneaux proposés aux clients en découlent.</p>
          <button className="btn btn--primary btn--sm" style={{ marginTop: 10 }} disabled={pending} onClick={() => run(() => saveRestaurantHours(id, h), 'Horaires enregistrés')}>Enregistrer les horaires</button>
        </div>

        {rows.length > 0 && (
          <div className="panel">
            <div className="panel__title">Carte de ce restaurant</div>
            <p className="small muted">Décochez un produit pour le masquer dans ce seul restaurant (rupture, absent de sa carte). Un prix propre remplace celui de la carte commune ; vide = prix commun.</p>
            <input type="search" placeholder="Rechercher un produit" value={filter} onChange={e => setFilter(e.target.value)} style={{ margin: '8px 0', width: '100%' }} />
            <div className="table-wrap" tabIndex={0} style={{ maxHeight: 560, overflow: 'auto' }}><table className="table"><tbody>
              {shown.map(p => (
                <tr key={p.id} style={p.isHidden ? { opacity: .5 } : undefined}>
                  <td><Toggle on={!p.isHidden} label={`${p.name} disponible`} disabled={pending} onChange={v => updateProduct(p, { isHidden: !v })} /></td>
                  <td><b>{p.name}</b><div className="small muted">{p.category} · carte commune {formatPrice(p.price)}{p.sized ? ' (selon taille)' : ''}</div></td>
                  <td>{!p.sized && <Euro label={`Prix propre ${p.name}`} nullable value={p.ownPrice} onChange={c => setRows(x => x.map(r => (r.id === p.id ? { ...r, ownPrice: c } : r)))} />}</td>
                  <td>{!p.sized && <button className="btn btn--ghost btn--sm" disabled={pending} onClick={() => updateProduct(p, {})}>OK</button>}</td>
                </tr>
              ))}
            </tbody></table></div>
          </div>
        )}
      </div>
    </div>
  );
}
