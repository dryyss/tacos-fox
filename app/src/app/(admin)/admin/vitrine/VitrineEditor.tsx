'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Toggle } from '@/components/admin/fields';
import { PromoBanner, PromoCarousel, PromoPanels } from '@/components/site/Slides';
import { uploadImage } from '../carte/actions';
import { PLACEMENT_LABEL, TONE_LABEL, type SlidePlacement, type SlideTone, type SlideView } from '@/lib/slide-types';
import { deleteSlide, insertExampleSlides, moveSlide, saveSlide } from './actions';

export interface SlideRow extends SlideView {
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

type Draft = Omit<SlideRow, 'id'> & { id: string | null };

const GROUPS: { id: SlidePlacement; help: string }[] = [
  { id: 'CAROUSEL', help: 'Grand diaporama sous le hero. Il défile seul, se met en pause au survol, et se feuillette au doigt.' },
  { id: 'BANNER', help: 'Bandeau qui chevauche le hero. Tant qu’aucun bandeau n’est actif, l’offre pizza calculée depuis la carte reste affichée.' },
  { id: 'PANEL', help: 'Cartes côte à côte. Sur téléphone elles défilent, sur ordinateur elles se rangent en grille.' },
];

function blank(placement: SlidePlacement): Draft {
  return {
    id: null, placement, tone: placement === 'PANEL' ? 'CREAM' : placement === 'CAROUSEL' ? 'RED' : 'YELLOW',
    kicker: '', title: '', highlight: '', text: '', ctaLabel: 'Voir', ctaHref: '/carte', imageUrl: null, badge: '',
    isActive: true, startsAt: null, endsAt: null,
  };
}

async function resize(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('conversion'))), 'image/webp', 0.82));
}

function previewOf(d: Draft): SlideView {
  return {
    id: d.id ?? 'preview', placement: d.placement, tone: d.tone, kicker: d.kicker, title: d.title || 'Titre du visuel',
    highlight: d.highlight, text: d.text, ctaLabel: d.ctaLabel, ctaHref: d.ctaHref || '/carte', imageUrl: d.imageUrl, badge: d.badge,
  };
}

export function VitrineEditor({ slides }: { slides: SlideRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<Draft | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setEdit(e => (e ? { ...e, [k]: v } : e));

  const save = () => edit && start(async () => {
    const { id, ...input } = edit;
    const r = await saveSlide(id, input);
    if (!r.ok) return toast(r.error ?? 'Erreur', 'close');
    toast('Visuel enregistré');
    setEdit(null);
    router.refresh();
  });

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const blob = await resize(file);
      const form = new FormData();
      form.set('file', new File([blob], 'visuel.webp', { type: 'image/webp' }));
      const r = await uploadImage(form);
      if (!r.ok) return toast(r.error ?? 'Envoi impossible', 'close');
      set('imageUrl', r.url!);
      toast('Photo ajoutée, pensez à enregistrer');
    } catch {
      toast('Image illisible', 'close');
    }
  };

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done: string) => start(async () => {
    const r = await fn();
    if (!r.ok) return toast(r.error ?? 'Erreur', 'close');
    if (done) toast(done);
    router.refresh();
  });

  return (
    <>
      {!slides.length && !edit && (
        <button type="button" className="btn btn--primary btn--sm" disabled={pending} onClick={() => run(insertExampleSlides, 'Exemples ajoutés')}>Mettre les visuels d’exemple</button>
      )}

      {edit && (
        <div className="panel" style={{ maxWidth: 860 }}>
          <div className="panel__title">{edit.id ? 'Modifier le visuel' : 'Nouveau visuel'}</div>
          <div className="form-grid">
            <div className="field"><label htmlFor="sl-place">Emplacement</label>
              <select id="sl-place" value={edit.placement} onChange={e => set('placement', e.target.value as SlidePlacement)}>{GROUPS.map(g => <option key={g.id} value={g.id}>{PLACEMENT_LABEL[g.id]}</option>)}</select>
            </div>
            <div className="field"><label htmlFor="sl-tone">Couleur</label>
              <select id="sl-tone" value={edit.tone} onChange={e => set('tone', e.target.value as SlideTone)}>{(Object.keys(TONE_LABEL) as SlideTone[]).map(t => <option key={t} value={t}>{TONE_LABEL[t]}</option>)}</select>
            </div>
            <div className="field"><label htmlFor="sl-kicker">Sur-titre</label><input id="sl-kicker" value={edit.kicker} maxLength={40} placeholder="Cette semaine" onChange={e => set('kicker', e.target.value)} /></div>
            <div className="field"><label htmlFor="sl-badge">Pastille</label><input id="sl-badge" value={edit.badge} maxLength={8} placeholder="2x, XXL, -20%" onChange={e => set('badge', e.target.value)} /></div>
            <div className="field span-2"><label htmlFor="sl-title">Titre</label><input id="sl-title" value={edit.title} maxLength={90} onChange={e => set('title', e.target.value)} /></div>
            <div className="field span-2"><label htmlFor="sl-high">Morceau en couleur</label><input id="sl-high" value={edit.highlight} maxLength={40} placeholder="S’il est dans le titre, il se colore. Sinon il s’ajoute à la fin." onChange={e => set('highlight', e.target.value)} /></div>
            <div className="field span-2"><label htmlFor="sl-text">Texte</label><textarea id="sl-text" value={edit.text} maxLength={180} onChange={e => set('text', e.target.value)} /></div>
            <div className="field"><label htmlFor="sl-cta">Bouton</label><input id="sl-cta" value={edit.ctaLabel} maxLength={28} placeholder="Voir les pizzas" onChange={e => set('ctaLabel', e.target.value)} /></div>
            <div className="field"><label htmlFor="sl-href">Lien</label><input id="sl-href" value={edit.ctaHref} placeholder="/carte?cat=pizzas" onChange={e => set('ctaHref', e.target.value)} /></div>
            <div className="field"><label htmlFor="sl-start">Début (vide = tout de suite)</label><input id="sl-start" type="datetime-local" value={edit.startsAt ?? ''} onChange={e => set('startsAt', e.target.value || null)} /></div>
            <div className="field"><label htmlFor="sl-end">Fin (vide = sans fin)</label><input id="sl-end" type="datetime-local" value={edit.endsAt ?? ''} onChange={e => set('endsAt', e.target.value || null)} /></div>
          </div>
          <div className="filters" style={{ marginTop: 4 }}>
            <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Toggle on={edit.isActive} label="Publié" onChange={v => set('isActive', v)} /> Publié sur le site</label>
            <label className="btn btn--dark btn--sm" style={{ cursor: 'pointer' }}>Photo<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => upload(e.target.files?.[0])} /></label>
            {edit.imageUrl && <button type="button" className="btn btn--ghost btn--sm" onClick={() => set('imageUrl', null)}>Retirer la photo</button>}
          </div>
          <p className="small muted">Aperçu</p>
          <div className="vitrine-preview">
            {edit.placement === 'CAROUSEL' && <PromoCarousel slides={[previewOf(edit)]} />}
            {edit.placement === 'BANNER' && <PromoBanner slides={[previewOf(edit)]} />}
            {edit.placement === 'PANEL' && <PromoPanels slides={[previewOf(edit)]} />}
          </div>
          <div className="filters">
            <button type="button" className="btn btn--primary btn--sm" disabled={pending} onClick={save}>Enregistrer</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEdit(null)}>Annuler</button>
          </div>
        </div>
      )}

      {GROUPS.map(g => {
        const rows = slides.filter(s => s.placement === g.id);
        return (
          <section key={g.id} style={{ marginTop: 28 }}>
            <h2 className="panel__title">{PLACEMENT_LABEL[g.id]}</h2>
            <p className="small muted" style={{ marginBottom: 10 }}>{g.help}</p>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Visuel</th><th>Période</th><th>Publié</th><th>Actions</th></tr></thead>
                <tbody>
                  {!rows.length && <tr><td colSpan={4} className="muted">Aucun {PLACEMENT_LABEL[g.id].toLowerCase()} pour le moment.</td></tr>}
                  {rows.map((s, i) => (
                    <tr key={s.id} style={s.isActive ? undefined : { opacity: .55 }}>
                      <td>
                        <span className={`tone-dot tone-${s.tone.toLowerCase()}`} />
                        <b>{s.title}</b>
                        {s.badge && <span className="pill" style={{ marginLeft: 8 }}>{s.badge}</span>}
                        {s.kicker && <div className="small muted">{s.kicker}</div>}
                      </td>
                      <td className="small">
                        {s.startsAt && <>Du {new Date(s.startsAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })} </>}
                        {s.endsAt && <>au {new Date(s.endsAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</>}
                        {!s.startsAt && !s.endsAt && 'En continu'}
                      </td>
                      <td><Toggle on={s.isActive} label="Publié" disabled={pending} onChange={v => { const { id, ...input } = s; return run(() => saveSlide(id, { ...input, isActive: v }), ''); }} /></td>
                      <td className="num" style={{ whiteSpace: 'nowrap' }}>
                        <button type="button" className="btn btn--ghost btn--sm" disabled={pending || i === 0} onClick={() => run(() => moveSlide(s.id, -1), '')} aria-label="Monter">↑</button>{' '}
                        <button type="button" className="btn btn--ghost btn--sm" disabled={pending || i === rows.length - 1} onClick={() => run(() => moveSlide(s.id, 1), '')} aria-label="Descendre">↓</button>{' '}
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEdit(s)}>Modifier</button>{' '}
                        <button type="button" className="btn btn--ghost btn--sm" disabled={pending} onClick={() => { if (confirm(`Retirer « ${s.title} » de la vitrine ?`)) run(() => deleteSlide(s.id), 'Visuel retiré'); }}>Supprimer</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!edit && <button type="button" className="btn btn--primary btn--sm" style={{ marginTop: 12 }} onClick={() => setEdit(blank(g.id))}>Nouveau {PLACEMENT_LABEL[g.id].toLowerCase()}</button>}
          </section>
        );
      })}
    </>
  );
}
