'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useToast } from '@/components/ui/Toast';
import { formatAmount } from '@/lib/money';
import { Toggle } from '@/components/admin/fields';
import { moveCategory, quickUpdate, updateCategory, type Result } from './actions';

interface Row { id: string; name: string; price: number; sizes: number; isAvailable: boolean; isHidden: boolean; isFeatured: boolean; tbc: boolean; stock: number | null; imageUrl: string | null }
interface Cat { id: string; label: string; description: string | null; isVisible: boolean; products: Row[] }

const toCents = (s: string) => {
  const v = s.trim().replace(/\s|€/g, '').replace(',', '.');
  return /^\d+(\.\d{1,2})?$/.test(v) ? Math.round(Number(v) * 100) : null;
};


export function MenuAdmin({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState('');
  const [onlyIssues, setOnlyIssues] = useState(false);

  const run = (fn: () => Promise<Result>, ok?: string) => start(async () => {
    const r = await fn();
    if (!r.ok) toast(r.error ?? 'Erreur'); else if (ok) toast(ok);
    router.refresh();
  });

  const q = filter.trim().toLowerCase();
  return (
    <>
      <div className="filters">
        <input type="search" placeholder="Rechercher un produit" value={filter} onChange={e => setFilter(e.target.value)} />
        <label className="small" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={onlyIssues} onChange={e => setOnlyIssues(e.target.checked)} /> Ruptures, masqués et prix à confirmer</label>
      </div>
      {categories.map((c, ci) => {
        const rows = c.products.filter(p => (!q || p.name.toLowerCase().includes(q)) && (!onlyIssues || !p.isAvailable || p.isHidden || p.tbc));
        if ((q || onlyIssues) && !rows.length) return null;
        return (
          <section key={c.id} style={{ marginBottom: 22 }}>
            <div className="admin-head" style={{ marginBottom: 8, alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.7rem' }}>{c.label} <small className="muted" style={{ fontFamily: 'var(--text)', fontSize: '.85rem' }}>{c.products.length} produits</small></h2>
              <div className="filters" style={{ margin: 0 }}>
                <span className="small">Catégorie visible</span>
                <Toggle on={c.isVisible} label="Catégorie visible" disabled={pending} onChange={v => run(() => updateCategory(c.id, { isVisible: v }))} />
                <button className="btn btn--ghost btn--sm" disabled={pending || ci === 0} onClick={() => run(() => moveCategory(c.id, -1))} aria-label="Monter">↑</button>
                <button className="btn btn--ghost btn--sm" disabled={pending || ci === categories.length - 1} onClick={() => run(() => moveCategory(c.id, 1))} aria-label="Descendre">↓</button>
              </div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Produit</th><th className="num">Prix €</th><th>Dispo</th><th>Visible</th><th>Incontournable</th><th>Stock</th><th /></tr></thead>
                <tbody>
                  {rows.map(p => (
                    <tr key={p.id} style={p.isHidden ? { opacity: .55 } : undefined}>
                      <td>
                        <b>{p.name}</b>
                        {p.sizes > 1 && <span className="small muted"> · {p.sizes} tailles</span>}
                        {p.tbc && <span className="pill pill--yellow" style={{ marginLeft: 6 }}>prix à confirmer</span>}
                        {!p.imageUrl && <span className="pill" style={{ marginLeft: 6 }}>sans photo</span>}
                      </td>
                      <td className="num">
                        <PriceCell value={p.price} disabled={pending} title={p.sizes > 1 ? 'Prix de la plus petite taille' : undefined} onSave={v => run(() => quickUpdate(p.id, { price: v, tbc: false }), `${p.name} : ${formatAmount(v)} €`)} />
                      </td>
                      <td><Toggle on={p.isAvailable} label="Disponible" disabled={pending} onChange={v => run(() => quickUpdate(p.id, { isAvailable: v }), v ? `${p.name} de nouveau disponible` : `${p.name} en rupture`)} /></td>
                      <td><Toggle on={!p.isHidden} label="Visible sur la carte" disabled={pending} onChange={v => run(() => quickUpdate(p.id, { isHidden: !v }), v ? `${p.name} visible` : `${p.name} masqué`)} /></td>
                      <td><Toggle on={p.isFeatured} label="Incontournable (accueil)" disabled={pending} onChange={v => run(() => quickUpdate(p.id, { isFeatured: v }))} /></td>
                      <td><StockCell value={p.stock} disabled={pending} onSave={v => run(() => quickUpdate(p.id, { stock: v }), 'Stock mis à jour')} /></td>
                      <td className="num"><Link className="btn btn--ghost btn--sm" href={`/admin/carte/${p.id}`}>Modifier</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </>
  );
}

function PriceCell({ value, onSave, disabled, title }: { value: number; onSave: (v: number) => void; disabled: boolean; title?: string }) {
  const [v, setV] = useState(formatAmount(value));
  const commit = () => {
    const c = toCents(v);
    if (c === null) { setV(formatAmount(value)); return; }
    if (c !== value) onSave(c);
  };
  return <input className="price-input" inputMode="decimal" value={v} title={title} disabled={disabled} onChange={e => setV(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} aria-label="Prix" />;
}

function StockCell({ value, onSave, disabled }: { value: number | null; onSave: (v: number | null) => void; disabled: boolean }) {
  const [v, setV] = useState(value === null ? '' : String(value));
  const commit = () => {
    const next = v.trim() === '' ? null : Number.parseInt(v, 10);
    if (next !== null && (Number.isNaN(next) || next < 0)) { setV(value === null ? '' : String(value)); return; }
    if (next !== value) onSave(next);
  };
  return <input style={{ width: 80 }} inputMode="numeric" placeholder="∞" value={v} disabled={disabled} title="Vide = illimité" onChange={e => setV(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} aria-label="Stock" />;
}
