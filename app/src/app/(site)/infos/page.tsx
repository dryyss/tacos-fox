import type { Metadata } from 'next';
import { Icon } from '@/components/Icons';
import { getRestaurant } from '@/lib/catalog';
import { DAY_NAMES, hmLabel, openStatus, parisClock } from '@/lib/hours';
import { phoneHref } from '@/lib/format';
import { deliveryNote } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Infos pratiques',
  description: 'Horaires, adresse, zones de livraison et contact de Tacos Fox à Stains (93240).',
};
export const dynamic = 'force-dynamic';

const SOCIAL = [
  { key: 'instagram', label: 'Instagram', color: '#E1306C' },
  { key: 'snapchat', label: 'Snapchat', color: '#E5C300' },
  { key: 'tiktok', label: 'TikTok', color: '#141414' },
  { key: 'facebook', label: 'Facebook', color: '#1877F2' },
] as const;

export default async function InfosPage() {
  const { settings, hours, zones } = await getRestaurant();
  const status = openStatus(hours);
  const today = parisClock().day;
  const query = [settings.addressLine1, settings.postalCode, settings.city, 'France'].filter(Boolean).join(' ');

  return (
    <div className="page">
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="section__head" style={{ maxWidth: 'var(--max)', marginInline: 'auto' }}>
          <div><span className="kicker">Infos pratiques</span><h1 className="section__title">Venir, appeler, <em>suivre</em></h1></div>
        </div>
      </section>
      <section className="section infos-grid" style={{ paddingTop: 12 }}>
        <div>
          <div className="panel" style={{ margin: 0 }}>
            <div className="panel__title"><Icon name="clock" /> Horaires <span className={`open-pill ${status.open ? '' : 'is-closed'}`} style={{ marginLeft: 'auto' }}>{status.label}</span></div>
            <ul className="hours">
              {hours.map(h => (
                <li key={h.dayOfWeek} className={h.dayOfWeek === today ? 'is-today' : ''}>
                  <span>{DAY_NAMES[h.dayOfWeek]}</span><span>{h.isOpen ? `${hmLabel(h.open)} à ${hmLabel(h.close)}` : 'Fermé'}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="panel">
            <div className="panel__title"><Icon name="pin" /> Adresse</div>
            <p><strong>{settings.addressLine1}</strong><br />{settings.postalCode} {settings.city}</p>
            <div className="actions-row" style={{ marginTop: 14 }}>
              {settings.phone && <a className="btn btn--primary" href={phoneHref(settings.phone)}><Icon name="phone" /> {settings.phone}</a>}
              <a className="btn btn--dark" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`} target="_blank" rel="noopener"><Icon name="route" /> Itinéraire</a>
            </div>
          </div>
          {settings.modeLivraison && zones.length > 0 && (
            <div className="panel">
              <div className="panel__title"><Icon name="scooter" /> Zones de livraison</div>
              <div className="zones">{zones.map(z => <span key={z.id}>{z.city}</span>)}</div>
              <p className="small muted" style={{ marginTop: 10 }}>{deliveryNote(zones)}</p>
            </div>
          )}
        </div>
        <div>
          <div className="map"><iframe title="Plan d'accès Tacos Fox" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`} /></div>
          <div className="panel">
            <div className="panel__title">Suivez-nous</div>
            <div className="social">
              {SOCIAL.filter(s => settings[s.key]).map(s => (
                <a key={s.key} href={settings[s.key]!} target="_blank" rel="noopener"><span className="social__dot" style={{ background: s.color }}>{s.label[0]}</span>{s.label}</a>
              ))}
            </div>
          </div>
          <div className="panel" style={{ background: 'var(--black)', color: '#fff' }}>
            <div className="panel__title" style={{ color: '#fff' }}><Icon name="halal" /> {settings.halalLabel}</div>
            <p className="small" style={{ color: 'rgba(255,255,255,.75)' }}>Toutes nos viandes sont contrôlées et certifiées. Le certificat est affiché en salle et disponible sur demande.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
