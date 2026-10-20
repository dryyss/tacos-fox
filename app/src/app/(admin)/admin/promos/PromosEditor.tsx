'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Euro, Toggle } from '@/components/admin/fields';
import { formatPrice } from '@/lib/money';
import { deletePromo, savePromo } from '../settings-actions';

interface Promo { id: string | null; code: string; description: string | null; type: 'PERCENT' | 'FIXED'; value: number; minSubtotal: number; startsAt: string | null; endsAt: string | null; maxUses: number | null; uses: number; isActive: boolean }

const EMPTY: Promo = { id: null, code: '', description: '', type: 'PERCENT', value: 10, minSubtotal: 0, startsAt: null, endsAt: null, maxUses: null, uses: 0, isActive: true };

export function PromosEditor({ promos }: { promos: Promo[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<Promo | null>(null);

  const save = () => edit && start(async () => {
    const { id, uses, ...input } = edit; void uses;
    const r = await savePromo(id, input);
    if (!r.ok) return toast(r.error ?? 'Erreur');
    toast(`Code ${edit.code.toUpperCase()} enregistré`);
    setEdit(null);
    router.refresh();
  });
  const set = <K extends keyof Promo>(k: K, v: Promo[K]) => setEdit(e => (e ? { ...e, [k]: v } : e));
  const label = (p: Promo) => (p.type === 'PERCENT' ? `-${p.value} %` : `-${formatPrice(p.value)}`);

  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Code</th><th>Remise</th><th>Conditions</th><th className="num">Utilisations</th><th>Actif</th><th /></tr></thead>
          <tbody>
            {!promos.length && <tr><td colSpan={6} className="muted">Aucun code promo pour le moment.</td></tr>}
            {promos.map(p => (
              <tr key={p.id}>
                <td><b>{p.code}</b>{p.description && <div className="small muted">{p.description}</div>}</td>
                <td>{label(p)}</td>
                <td className="small">
                  {p.minSubtotal > 0 && <>Dès {formatPrice(p.minSubtotal)}<br /></>}
                  {p.startsAt && <>Du {new Date(p.startsAt).toLocaleDateString('fr-FR')} </>}{p.endsAt && <>au {new Date(p.endsAt).toLocaleDateString('fr-FR')}</>}
                  {!p.minSubtotal && !p.startsAt && !p.endsAt && 'Sans condition'}
                </td>
                <td className="num">{p.uses}{p.maxUses ? ` / ${p.maxUses}` : ''}</td>
                <td><Toggle on={p.isActive} label="Actif" disabled={pending} onChange={v => start(async () => { const { id, uses, ...input } = p; void uses; const r = await savePromo(id, { ...input, isActive: v }); if (!r.ok) toast(r.error ?? 'Erreur'); router.refresh(); })} /></td>
                <td className="num" style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn--ghost btn--sm" onClick={() => setEdit(p)}>Modifier</button>{' '}
                  <button className="btn btn--ghost btn--sm" disabled={pending} onClick={() => { if (confirm(`Supprimer le code ${p.code} ?`)) start(async () => { await deletePromo(p.id!); router.refresh(); }); }}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!edit && <button className="btn btn--primary btn--sm" style={{ marginTop: 12 }} onClick={() => setEdit({ ...EMPTY })}>Nouveau code promo</button>}

      {edit && (
        <div className="panel" style={{ maxWidth: 720 }}>
          <div className="panel__title">{edit.id ? `Modifier ${edit.code}` : 'Nouveau code promo'}</div>
          <div className="form-grid">
            <div className="field"><label htmlFor="pc-code">Code</label><input id="pc-code" value={edit.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="FOX10" /></div>
            <div className="field"><label htmlFor="pc-desc">Description interne</label><input id="pc-desc" value={edit.description ?? ''} onChange={e => set('description', e.target.value)} placeholder="Flyers octobre" /></div>
            <div className="field"><label htmlFor="pc-type">Type</label>
              <select id="pc-type" value={edit.type} onChange={e => set('type', e.target.value as Promo['type'])}><option value="PERCENT">Pourcentage</option><option value="FIXED">Montant fixe</option></select>
            </div>
            <div className="field"><label>{edit.type === 'PERCENT' ? 'Pourcentage' : 'Montant (€)'}</label>
              {edit.type === 'PERCENT'
                ? <input inputMode="numeric" value={edit.value} onChange={e => set('value', Math.max(0, Number.parseInt(e.target.value, 10) || 0))} />
                : <Euro label="Montant" value={edit.value} onChange={v => set('value', v ?? 0)} />}
            </div>
            <div className="field"><label>Commande minimum (€)</label><Euro label="Minimum" value={edit.minSubtotal} onChange={v => set('minSubtotal', v ?? 0)} /></div>
            <div className="field"><label htmlFor="pc-max">Utilisations max (vide = illimité)</label><input id="pc-max" inputMode="numeric" value={edit.maxUses ?? ''} onChange={e => set('maxUses', e.target.value ? Math.max(1, Number.parseInt(e.target.value, 10) || 1) : null)} /></div>
            <div className="field"><label htmlFor="pc-start">Début</label><input id="pc-start" type="datetime-local" value={edit.startsAt ?? ''} onChange={e => set('startsAt', e.target.value || null)} /></div>
            <div className="field"><label htmlFor="pc-end">Fin</label><input id="pc-end" type="datetime-local" value={edit.endsAt ?? ''} onChange={e => set('endsAt', e.target.value || null)} /></div>
          </div>
          <div className="filters">
            <button className="btn btn--primary btn--sm" disabled={pending} onClick={save}>Enregistrer</button>
            <button className="btn btn--ghost btn--sm" onClick={() => setEdit(null)}>Annuler</button>
          </div>
        </div>
      )}
    </>
  );
}
