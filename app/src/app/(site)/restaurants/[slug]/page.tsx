import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/Icons';
import { getSettings } from '@/lib/catalog';
import { DAY_NAMES, hmLabel, openStatus, parisClock } from '@/lib/hours';
import { phoneHref } from '@/lib/format';
import { getRestaurantBySlug, restaurantAddress, restaurantTitle } from '@/lib/restaurants';
import { JsonLd, restaurantPageJsonLd } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const r = await getRestaurantBySlug((await params).slug);
  if (!r) return {};
  return {
    title: `${restaurantTitle(r)}, ${r.addressLine1}`,
    description: `Tacos, burgers, pizzas, bowls et Crousty Fox à emporter à ${r.city} (${r.postalCode}), ${r.addressLine1}. Commandez en ligne et récupérez au créneau choisi.`,
    alternates: { canonical: `/restaurants/${r.slug}` },
  };
}

/* C8 : page locale d'un restaurant (adresse, horaires, accès, lien de commande) */
export default async function RestaurantPage({ params }: { params: Promise<{ slug: string }> }) {
  const r = await getRestaurantBySlug((await params).slug);
  if (!r) notFound();
  const settings = await getSettings();
  const status = openStatus(r.hours);
  const today = parisClock().day;
  const query = `${restaurantAddress(r)}, France`;

  return (
    <div className="page">
      <JsonLd data={restaurantPageJsonLd(r, settings)} />
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="section__head" style={{ maxWidth: 'var(--max)', marginInline: 'auto' }}>
          <div><span className="kicker">Tacos Fox à {r.city}</span><h1 className="section__title">{restaurantTitle(r)}</h1></div>
        </div>
        <p style={{ maxWidth: 'var(--max)', marginInline: 'auto' }}>
          {r.intro || `Tacos à composer, burgers, pizzas (1 achetée = 1 offerte), bowls et Crousty Fox, préparés au ${r.addressLine1} à ${r.city}. Commandez en ligne, payez par carte et récupérez votre commande au créneau choisi.`}
        </p>
        <div className="actions-row" style={{ maxWidth: 'var(--max)', marginInline: 'auto', marginTop: 14 }}>
          {!r.orderingEnabled
            ? <span className="btn btn--ghost btn--xl is-disabled" aria-disabled="true">Commande en ligne bientôt disponible</span>
            : !status.open
              ? <span className="btn btn--ghost btn--xl is-disabled" aria-disabled="true">{status.label}</span>
              : <Link className="btn btn--primary btn--xl" href={`/r/${r.slug}`} prefetch={false}>Commander à {r.city}</Link>}
          <Link className="btn btn--ghost btn--xl" href="/restaurants">Changer de restaurant</Link>
        </div>
      </section>
      <section className="section infos-grid" style={{ paddingTop: 12 }}>
        <div>
          <div className="panel" style={{ margin: 0 }}>
            <div className="panel__title"><Icon name="clock" /> Horaires <span className={`open-pill ${status.open ? '' : 'is-closed'}`} style={{ marginLeft: 'auto' }}>{status.label}</span></div>
            <ul className="hours">
              {r.hours.map(h => (
                <li key={h.dayOfWeek} className={h.dayOfWeek === today ? 'is-today' : ''}>
                  <span>{DAY_NAMES[h.dayOfWeek]}</span><span>{h.isOpen ? `${hmLabel(h.open)} à ${hmLabel(h.close)}` : 'Fermé'}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="panel">
            <div className="panel__title"><Icon name="pin" /> Adresse</div>
            <p><strong>{r.addressLine1}</strong><br />{r.postalCode} {r.city}</p>
            <div className="actions-row" style={{ marginTop: 14 }}>
              {r.phone && <a className="btn btn--primary" href={phoneHref(r.phone)}><Icon name="phone" /> {r.phone}</a>}
              <a className="btn btn--dark" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`} target="_blank" rel="noopener"><Icon name="route" /> Itinéraire</a>
            </div>
          </div>
        </div>
        <div>
          <div className="map"><iframe title={`Plan d'accès ${restaurantTitle(r)}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`} /></div>
          <div className="panel" style={{ background: 'var(--black)', color: '#fff' }}>
            <div className="panel__title" style={{ color: '#fff' }}><Icon name="halal" /> {settings.halalLabel}</div>
            <p className="small" style={{ color: 'rgba(255,255,255,.75)' }}>Toutes nos viandes sont contrôlées et certifiées. Le certificat est disponible sur demande au restaurant.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
