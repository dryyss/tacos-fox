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
      {/* Fermé ou commande pas encore ouverte : le restaurant reste sélectionnable pour consulter sa carte,
          seule la commande est bloquée (message ici, sur la carte et au panier) */}
      {(!r.orderingEnabled || !status.open) && (
        <p className="resto-card__notice"><Icon name="clock" /> {!r.orderingEnabled ? 'Commande en ligne bientôt disponible' : `${status.label} : carte consultable, commande à l'ouverture`}</p>
      )}
      <div className="actions-row">
        <Link className={`btn ${r.orderingEnabled && status.open ? 'btn--primary' : 'btn--ghost'}`} href={order} prefetch={false}>
          {r.orderingEnabled && status.open ? (current ? 'Continuer ici' : 'Commander ici') : 'Voir la carte'}
        </Link>
        <Link className="btn btn--dark" href={`/restaurants/${r.slug}`}>Infos et accès</Link>
      </div>
      {current && <span className="resto-card__current">Votre restaurant</span>}
    </article>
  );
}
