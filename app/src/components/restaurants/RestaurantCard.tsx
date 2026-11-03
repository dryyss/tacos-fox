import Link from 'next/link';
import { Icon } from '@/components/Icons';
import { hmLabel, openStatus, parisClock } from '@/lib/hours';
import { restaurantTitle, type RestaurantWithHours } from '@/lib/restaurants';

/* Carte d'un restaurant dans la liste de choix (C2) : adresse, horaires du jour, ouvert ou fermé */
export function RestaurantCard({ r, current, next }: { r: RestaurantWithHours; current: boolean; next?: string }) {
  const status = openStatus(r.hours);
  const today = r.hours.find(h => h.dayOfWeek === parisClock().day);
  const order = `/r/${r.slug}${next ? `?next=${encodeURIComponent(next)}` : ''}`;
  return (
    <article className={`resto-card ${current ? 'is-current' : ''}`}>
      <div className="resto-card__head">
        <h2 className="resto-card__title">{restaurantTitle(r)}</h2>
        <span className={`open-pill ${status.open ? '' : 'is-closed'}`}>{status.label}</span>
      </div>
      <p className="resto-card__addr"><Icon name="pin" /> {r.addressLine1}, {r.postalCode} {r.city}</p>
      <p className="resto-card__hours"><Icon name="clock" /> Aujourd&apos;hui : {today?.isOpen ? `${hmLabel(today.open)} à ${hmLabel(today.close)}` : 'fermé'}</p>
      <div className="actions-row">
        {r.orderingEnabled
          ? <Link className="btn btn--primary" href={order} prefetch={false}>{current ? 'Continuer ici' : 'Commander ici'}</Link>
          : <span className="btn btn--ghost is-disabled" aria-disabled="true">Commande en ligne bientôt</span>}
        <Link className="btn btn--dark" href={`/restaurants/${r.slug}`}>Infos et accès</Link>
      </div>
      {current && <span className="resto-card__current">Votre restaurant</span>}
    </article>
  );
}
