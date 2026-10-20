'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Euro, Toggle } from '@/components/admin/fields';
import { deleteZone, saveZone } from '../settings-actions';

interface Zone { id: string | null; city: string; postalCode: string; fee: number; freeFrom: number | null; minimum: number; isActive: boolean }

export function ZonesEditor({ zones }: { zones: Zone[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [rows, setRows] = useState<Zone[]>(zones);
  useEffect(() => setRows(zones), [zones]); // état serveur après enregistrement
  const set = (i: number, patch: Partial<Zone>) => setRows(r => r.map((z, k) => (k === i ? { ...z, ...patch } : z)));

  const save = (z: Zone) => start(async () => {
    const r = await saveZone(z.id, { city: z.city, postalCode: z.postalCode, fee: z.fee, freeFrom: z.freeFrom, minimum: z.minimum, isActive: z.isActive });
    if (!r.ok) return toast(r.error ?? 'Erreur');
    toast(`${z.city} enregistrée`);
    router.refresh();
  });

  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Ville</th><th>Code postal</th><th className="num">Frais €</th><th className="num">Offerte dès €</th><th className="num">Minimum €</th><th>Active</th><th /></tr></thead>
          <tbody>
            {rows.map((z, i) => (
              <tr key={z.id ?? `new-${i}`}>
                <td><input value={z.city} onChange={e => set(i, { city: e.target.value })} aria-label="Ville" /></td>
                <td><input value={z.postalCode} onChange={e => set(i, { postalCode: e.target.value })} style={{ width: 90 }} aria-label="Code postal" /></td>
                <td className="num"><Euro label="Frais" value={z.fee} onChange={v => set(i, { fee: v ?? 0 })} /></td>
                <td className="num"><Euro label="Offerte dès" nullable value={z.freeFrom} onChange={v => set(i, { freeFrom: v })} /></td>
                <td className="num"><Euro label="Minimum" value={z.minimum} onChange={v => set(i, { minimum: v ?? 0 })} /></td>
                <td><Toggle on={z.isActive} label="Active" onChange={v => set(i, { isActive: v })} /></td>
                <td className="num" style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn--primary btn--sm" disabled={pending} onClick={() => save(z)}>Enregistrer</button>{' '}
                  <button className="btn btn--ghost btn--sm" disabled={pending} onClick={() => {
                    if (!z.id) return setRows(r => r.filter((_, k) => k !== i));
                    if (confirm(`Supprimer la zone ${z.city} ?`)) start(async () => { const r = await deleteZone(z.id!); if (!r.ok) return toast(r.error ?? 'Erreur'); setRows(x => x.filter((_, k) => k !== i)); router.refresh(); });
                  }}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn btn--ghost btn--sm" style={{ marginTop: 12 }} onClick={() => setRows(r => [...r, { id: null, city: '', postalCode: '', fee: rows[0]?.fee ?? 250, freeFrom: rows[0]?.freeFrom ?? null, minimum: rows[0]?.minimum ?? 0, isActive: true }])}>Ajouter une commune</button>
      <p className="small muted" style={{ marginTop: 12 }}>« Offerte dès » vide : la livraison est toujours payante dans cette commune.</p>
    </>
  );
}
