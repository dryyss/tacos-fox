'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Photo } from '@/components/menu/ProductCard';
import { ALLERGENS } from '@/lib/allergens';
import { deleteProduct, saveProduct, uploadImage, type ProductInput } from './actions';
import { Euro as EuroField, Toggle } from '@/components/admin/fields';

interface Choice { id: string | null; label: string; price: number; isAvailable: boolean }
interface Group { id: string | null; key: string; label: string; min: number; max: number; maxFromSize?: boolean; choices: Choice[] }
export interface EditorProduct {
  id: string; kind: string; name: string; description: string; categoryId: string; formula: string | null; range: string | null; price: number;
  badges: string[]; allergens: string[]; imageUrl: string | null; tbc: boolean; isAvailable: boolean; isHidden: boolean; isFeatured: boolean; stock: number | null;
  sizes: { code: string; label: string; hint: string | null; price: number; bogo: boolean }[];
  groups: Group[];
}

const BADGES = [['best', 'Best-seller'], ['nouveau', 'Nouveau'], ['epice', 'Épicé']] as const;

const Euro = ({ value, onChange, label }: { value: number; onChange: (c: number) => void; label: string }) => <EuroField value={value} label={label} onChange={c => onChange(c ?? 0)} />;

/* Redimensionne la photo dans le navigateur (WebP 1200 px) avant envoi */
async function resize(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('conversion'))), 'image/webp', 0.82));
}

export function ProductEditor({ product, categories }: { product: EditorProduct | null; categories: { id: string; label: string }[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [p, setP] = useState<EditorProduct>(product ?? {
    id: '', kind: 'STANDARD', name: '', description: '', categoryId: categories[0]?.id ?? '', formula: null, range: null, price: 0, badges: [], allergens: [],
    imageUrl: null, tbc: false, isAvailable: true, isHidden: false, isFeatured: false, stock: null, sizes: [], groups: [],
  });
  const set = <K extends keyof EditorProduct>(k: K, v: EditorProduct[K]) => setP(x => ({ ...x, [k]: v }));
  const setGroup = (i: number, patch: Partial<Group>) => set('groups', p.groups.map((g, k) => (k === i ? { ...g, ...patch } : g)));
  const setChoice = (gi: number, ci: number, patch: Partial<Choice>) => setGroup(gi, { choices: p.groups[gi].choices.map((c, k) => (k === ci ? { ...c, ...patch } : c)) });
  const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

  const save = () => start(async () => {
    const input: ProductInput = {
      name: p.name, description: p.description, categoryId: p.categoryId, formula: p.formula, range: p.range, price: p.price,
      badges: p.badges as ProductInput['badges'], allergens: p.allergens, imageUrl: p.imageUrl, tbc: p.tbc, isAvailable: p.isAvailable,
      isHidden: p.isHidden, isFeatured: p.isFeatured, stock: p.stock, sizes: p.sizes,
      groups: p.groups.map(g => ({ id: g.id, key: g.key, label: g.label, min: g.min, max: g.max, choices: g.choices })),
    };
    const r = await saveProduct(product?.id ?? null, input);
    if (!r.ok) return toast(r.error ?? 'Erreur');
    toast('Produit enregistré');
    if (!product) router.replace(`/admin/carte/${r.id}`); else router.refresh();
  });

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const blob = await resize(file);
      const form = new FormData();
      form.set('file', new File([blob], 'photo.webp', { type: 'image/webp' }));
      const r = await uploadImage(form);
      if (!r.ok) return toast(r.error ?? 'Envoi impossible');
      set('imageUrl', r.url!);
      toast('Photo ajoutée, pensez à enregistrer');
    } catch {
      toast('Image illisible');
    }
  };

  return (
    <div className="infos-grid" style={{ padding: 0 }}>
      <div>
        <div className="panel" style={{ marginTop: 0 }}>
          <div className="panel__title">Informations</div>
          <div className="field"><label htmlFor="e-name">Nom</label><input id="e-name" value={p.name} onChange={e => set('name', e.target.value)} /></div>
          <div className="field"><label htmlFor="e-desc">Description</label><textarea id="e-desc" value={p.description} onChange={e => set('description', e.target.value)} /></div>
          <div className="form-grid">
            <div className="field"><label htmlFor="e-cat">Catégorie</label><select id="e-cat" value={p.categoryId} onChange={e => set('categoryId', e.target.value)}>{categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
            <div className="field"><label htmlFor="e-formula">Formule</label><input id="e-formula" placeholder="Menu : frites + boisson" value={p.formula ?? ''} onChange={e => set('formula', e.target.value || null)} /></div>
          </div>
          {!p.sizes.length && <div className="field"><label>Prix TTC (€)</label><Euro label="Prix" value={p.price} onChange={v => set('price', v)} /></div>}
          <div className="field">
            <label>Pastilles</label>
            <div className="chips">{BADGES.map(([k, l]) => <button key={k} type="button" className={`chip ${p.badges.includes(k) ? 'is-selected' : ''}`} onClick={() => set('badges', toggleIn(p.badges, k))}>{l}</button>)}</div>
          </div>
          <div className="filters" style={{ margin: '8px 0 0', gap: 16 }}>
            <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Toggle on={p.isAvailable} label="Disponible" onChange={v => set('isAvailable', v)} /> Disponible</label>
            <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Toggle on={!p.isHidden} label="Visible" onChange={v => set('isHidden', !v)} /> Visible</label>
            <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Toggle on={p.isFeatured} label="Incontournable" onChange={v => set('isFeatured', v)} /> Incontournable</label>
            <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Toggle on={p.tbc} label="Prix à confirmer" onChange={v => set('tbc', v)} /> Prix à confirmer</label>
          </div>
          <div className="field" style={{ marginTop: 12 }}><label htmlFor="e-stock">Stock (vide = illimité)</label><input id="e-stock" inputMode="numeric" style={{ maxWidth: 160 }} value={p.stock ?? ''} onChange={e => set('stock', e.target.value === '' ? null : Math.max(0, Number.parseInt(e.target.value, 10) || 0))} /></div>
        </div>

        <div className="panel">
          <div className="panel__title">Allergènes</div>
          <div className="chips">{ALLERGENS.map(a => <button key={a} type="button" className={`chip ${p.allergens.includes(a) ? 'is-selected' : ''}`} onClick={() => set('allergens', toggleIn(p.allergens, a))}>{a}</button>)}</div>
          <p className="small muted" style={{ marginTop: 8 }}>Affichés sur la fiche produit et sur la page Allergènes.</p>
        </div>
      </div>

      <div>
        <div className="panel" style={{ marginTop: 0 }}>
          <div className="panel__title">Photo</div>
          <div style={{ maxWidth: 260, borderRadius: 12, overflow: 'hidden' }}><Photo src={p.imageUrl} alt={p.name} /></div>
          <div className="filters" style={{ marginTop: 10 }}>
            <label className="btn btn--dark btn--sm" style={{ cursor: 'pointer' }}>Choisir une photo<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => upload(e.target.files?.[0])} /></label>
            {p.imageUrl && <button className="btn btn--ghost btn--sm" onClick={() => set('imageUrl', null)}>Retirer</button>}
          </div>
        </div>

        {p.sizes.length > 0 && (
          <div className="panel">
            <div className="panel__title">Tailles</div>
            <div className="table-wrap"><table className="table"><thead><tr><th>Taille</th><th>Précision</th><th className="num">Prix €</th>{p.kind === 'PIZZA' && <th>2e offerte</th>}</tr></thead><tbody>
              {p.sizes.map((s, i) => (
                <tr key={s.code}>
                  <td><input value={s.label} onChange={e => set('sizes', p.sizes.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} /></td>
                  <td><input value={s.hint ?? ''} onChange={e => set('sizes', p.sizes.map((x, k) => (k === i ? { ...x, hint: e.target.value || null } : x)))} /></td>
                  <td className="num"><Euro label={`Prix ${s.label}`} value={s.price} onChange={v => set('sizes', p.sizes.map((x, k) => (k === i ? { ...x, price: v } : x)))} /></td>
                  {p.kind === 'PIZZA' && <td><Toggle on={s.bogo} label="2e offerte" onChange={v => set('sizes', p.sizes.map((x, k) => (k === i ? { ...x, bogo: v } : x)))} /></td>}
                </tr>
              ))}
            </tbody></table></div>
          </div>
        )}

        <div className="panel">
          <div className="panel__title">Options</div>
          {p.groups.map((g, gi) => (
            <div key={g.id ?? `new-${gi}`} style={{ border: '1.5px solid var(--grey-2)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
              <div className="form-grid">
                <div className="field"><label>Nom du groupe</label><input value={g.label} onChange={e => setGroup(gi, { label: e.target.value })} /></div>
                <div className="field-row">
                  <div className="field"><label>Min</label><input inputMode="numeric" value={g.min} onChange={e => setGroup(gi, { min: Math.max(0, Number.parseInt(e.target.value, 10) || 0) })} /></div>
                  <div className="field"><label>Max</label><input inputMode="numeric" value={g.max} disabled={g.maxFromSize} title={g.maxFromSize ? 'Défini par la taille' : undefined} onChange={e => setGroup(gi, { max: Math.max(1, Number.parseInt(e.target.value, 10) || 1) })} /></div>
                </div>
              </div>
              <table className="table"><thead><tr><th>Choix</th><th className="num">Suppl. €</th><th>Dispo</th><th /></tr></thead><tbody>
                {g.choices.map((c, ci) => (
                  <tr key={c.id ?? `n-${ci}`}>
                    <td><input value={c.label} onChange={e => setChoice(gi, ci, { label: e.target.value })} /></td>
                    <td className="num"><Euro label={`Supplément ${c.label}`} value={c.price} onChange={v => setChoice(gi, ci, { price: v })} /></td>
                    <td><Toggle on={c.isAvailable} label="Disponible" onChange={v => setChoice(gi, ci, { isAvailable: v })} /></td>
                    <td className="num"><button className="btn btn--ghost btn--sm" onClick={() => setGroup(gi, { choices: g.choices.filter((_, k) => k !== ci) })} aria-label="Retirer le choix">×</button></td>
                  </tr>
                ))}
              </tbody></table>
              <div className="filters" style={{ margin: '8px 0 0' }}>
                <button className="btn btn--ghost btn--sm" onClick={() => setGroup(gi, { choices: [...g.choices, { id: null, label: '', price: 0, isAvailable: true }] })}>Ajouter un choix</button>
                {!g.maxFromSize && <button className="btn btn--ghost btn--sm" onClick={() => { if (confirm(`Supprimer le groupe « ${g.label} » ?`)) set('groups', p.groups.filter((_, k) => k !== gi)); }}>Supprimer le groupe</button>}
              </div>
            </div>
          ))}
          <button className="btn btn--ghost btn--sm" onClick={() => set('groups', [...p.groups, { id: null, key: `option-${Date.now().toString(36)}`, label: 'Nouvelle option', min: 0, max: 1, choices: [{ id: null, label: '', price: 0, isAvailable: true }] }])}>Ajouter un groupe d&apos;options</button>
        </div>

        <div className="filters" style={{ marginTop: 16 }}>
          <button className="btn btn--primary" disabled={pending} onClick={save}>{pending ? 'Enregistrement...' : 'Enregistrer'}</button>
          {product && <button className="btn btn--ghost" disabled={pending} onClick={() => {
            if (!confirm(`Supprimer « ${product.name} » ? S'il a déjà été commandé, il sera seulement masqué.`)) return;
            start(async () => { const r = await deleteProduct(product.id); if (!r.ok) return toast(r.error ?? 'Erreur'); toast('Produit supprimé'); router.push('/admin/carte'); });
          }}>Supprimer</button>}
        </div>
      </div>
    </div>
  );
}
