'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Toggle } from '@/components/admin/fields';
import { DAY_NAMES, type DayHours } from '@/lib/hours';
import { saveHours, saveSettings, setOrderingEnabled, type SettingsInput } from '../settings-actions';

export function SettingsEditor({ settings, hours, services }: { settings: SettingsInput; hours: DayHours[]; services: { stripe: boolean; email: boolean } }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [s, setS] = useState(settings);
  const [h, setH] = useState(hours);
  const set = <K extends keyof SettingsInput>(k: K, v: SettingsInput[K]) => setS(x => ({ ...x, [k]: v }));
  const setDay = (i: number, patch: Partial<DayHours>) => setH(x => x.map((d, k) => (k === i ? { ...d, ...patch } : d)));

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) => start(async () => {
    const r = await fn();
    if (!r.ok) return toast(r.error ?? 'Erreur');
    toast(ok);
    router.refresh();
  });

  const text = (k: keyof SettingsInput, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="field"><label htmlFor={`s-${k}`}>{label}</label><input id={`s-${k}`} value={(s[k] as string | null) ?? ''} onChange={e => set(k, e.target.value as never)} {...props} /></div>
  );
  const num = (k: keyof SettingsInput, label: string) => (
    <div className="field"><label htmlFor={`s-${k}`}>{label}</label><input id={`s-${k}`} inputMode="numeric" value={s[k] as number} onChange={e => set(k, (Number.parseInt(e.target.value, 10) || 0) as never)} /></div>
  );
  const sw = (k: keyof SettingsInput, label: string) => (
    <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}><Toggle on={s[k] as boolean} label={label} onChange={v => set(k, v as never)} /> {label}</label>
  );

  return (
    <div className="infos-grid" style={{ padding: 0 }}>
      <div>
        <div className="panel" style={{ marginTop: 0, background: s.orderingEnabled ? 'var(--white)' : 'var(--red-soft)' }}>
          <div className="panel__title">Commandes en ligne</div>
          <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}>
            <Toggle on={s.orderingEnabled} label="Commandes en ligne" disabled={pending} onChange={v => { set('orderingEnabled', v); run(() => setOrderingEnabled(v), v ? 'Commandes en ligne rouvertes' : 'Commandes en ligne suspendues'); }} />
            {s.orderingEnabled ? 'Ouvertes' : 'Suspendues (rush, fermeture exceptionnelle)'}
          </label>
          <p className="small muted" style={{ marginTop: 8 }}>Effet immédiat. Suspendre bloque les nouvelles commandes sans masquer la carte.</p>
        </div>

        <div className="panel">
          <div className="panel__title">Horaires d&apos;ouverture</div>
          <div className="table-wrap"><table className="table"><tbody>
            {h.map((d, i) => (
              <tr key={d.dayOfWeek}>
                <td><b>{DAY_NAMES[d.dayOfWeek]}</b></td>
                <td><Toggle on={d.isOpen} label="Ouvert" onChange={v => setDay(i, { isOpen: v })} /></td>
                <td><input type="time" value={d.open} disabled={!d.isOpen} onChange={e => setDay(i, { open: e.target.value })} aria-label={`Ouverture ${DAY_NAMES[d.dayOfWeek]}`} /></td>
                <td><input type="time" value={d.close} disabled={!d.isOpen} onChange={e => setDay(i, { close: e.target.value })} aria-label={`Fermeture ${DAY_NAMES[d.dayOfWeek]}`} /></td>
              </tr>
            ))}
          </tbody></table></div>
          <p className="small muted" style={{ marginTop: 8 }}>Fermeture à 00:00 = minuit.</p>
          <button className="btn btn--primary btn--sm" style={{ marginTop: 10 }} disabled={pending} onClick={() => run(() => saveHours(h), 'Horaires enregistrés')}>Enregistrer les horaires</button>
        </div>

        <div className="panel">
          <div className="panel__title">Modes, délais et paiement</div>
          <div className="filters" style={{ gap: 16 }}>{sw('modeSurplace', 'Sur place')}{sw('modeEmporter', 'À emporter')}{sw('modeLivraison', 'Livraison')}</div>
          <div className="filters" style={{ gap: 16 }}>
            {sw('acceptCard', 'Carte en ligne')}{sw('acceptOnsite', 'Paiement sur place')}
          </div>
          {!services.stripe && <p className="alert alert--info"><span>Stripe n&apos;est pas encore configuré : le paiement carte est indisponible en production.</span></p>}
          <div className="form-grid">
            {num('prepMinutes', 'Préparation (min)')}
            {num('deliveryMinutes', 'Livraison (min)')}
            <div className="field"><label htmlFor="s-slot">Intervalle des créneaux</label>
              <select id="s-slot" value={s.slotInterval} onChange={e => set('slotInterval', Number(e.target.value))}>{[10, 15, 20, 30].map(v => <option key={v} value={v}>{v} minutes</option>)}</select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="panel" style={{ marginTop: 0 }}>
          <div className="panel__title">Restaurant</div>
          <div className="form-grid">
            {text('name', 'Nom')}{text('tagline', 'Signature')}
          </div>
          {text('slogan', 'Slogan')}{text('halalLabel', 'Mention halal')}
          <div className="form-grid">
            {text('phone', 'Téléphone')}{text('email', 'E-mail de contact', { type: 'email' })}
          </div>
          {text('addressLine1', 'Adresse')}
          <div className="form-grid">{text('postalCode', 'Code postal')}{text('city', 'Ville')}</div>
        </div>
        <div className="panel">
          <div className="panel__title">Mentions légales et factures</div>
          {text('legalName', 'Raison sociale')}
          <div className="form-grid">
            {text('siret', 'SIRET')}{text('vatNumber', 'N° TVA intracommunautaire')}
          </div>
          <div className="field"><label htmlFor="s-vat">Taux de TVA (%)</label>
            <input id="s-vat" inputMode="decimal" style={{ maxWidth: 120 }} value={String(s.vatRate / 100).replace('.', ',')} onChange={e => { const v = Number(e.target.value.replace(',', '.')); if (!Number.isNaN(v)) set('vatRate', Math.round(v * 100)); }} />
            <span className="small muted">10 % pour la restauration (sur place et à emporter, hors boissons alcoolisées).</span>
          </div>
        </div>
        <div className="panel">
          <div className="panel__title">Réseaux sociaux</div>
          {text('instagram', 'Instagram')}{text('snapchat', 'Snapchat')}{text('tiktok', 'TikTok')}{text('facebook', 'Facebook')}
        </div>
        {!services.email && <p className="alert alert--info"><span>Resend n&apos;est pas configuré : les e-mails de confirmation ne partent pas encore.</span></p>}
        <button className="btn btn--primary" style={{ marginTop: 14 }} disabled={pending} onClick={() => run(() => saveSettings({ ...s, instagram: s.instagram || null, snapchat: s.snapchat || null, tiktok: s.tiktok || null, facebook: s.facebook || null }), 'Réglages enregistrés')}>Enregistrer les réglages</button>
      </div>
    </div>
  );
}
