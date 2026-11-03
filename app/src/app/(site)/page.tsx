import Link from 'next/link';
import { Icon } from '@/components/Icons';
import { Photo } from '@/components/menu/ProductCard';
import { Featured } from '@/components/menu/Featured';
import { ModeLinks } from '@/components/site/ModeLinks';
import { PromoBanner, PromoCarousel, PromoPanels } from '@/components/site/Slides';
import { getCatalog, getRestaurant } from '@/lib/catalog';
import { openStatus } from '@/lib/hours';
import { formatAmount, formatPrice } from '@/lib/money';
import { modeInfos } from '@/lib/site';
import { getCurrentRestaurant, getRestaurants, restaurantTitle } from '@/lib/restaurants';
import { RestaurantCard } from '@/components/restaurants/RestaurantCard';
import { getPublicSlides } from '@/lib/slides';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [current, restaurants, restaurant, spots] = await Promise.all([getCurrentRestaurant(), getRestaurants(), getRestaurant(), getPublicSlides()]);
  const catalog = await getCatalog(current?.id);
  const { settings } = restaurant;
  const status = current ? openStatus(current.hours) : null;
  const featured = catalog.products.filter(p => p.isFeatured).slice(0, 8);
  const pizzas = catalog.products.filter(p => p.kind === 'PIZZA');
  const tacos = catalog.products.find(p => p.kind === 'TACOS');
  const bogoSizes = pizzas[0]?.sizes.filter(s => s.bogo) ?? [];
  const modes = modeInfos(restaurant);

  return (
    <div className="page">
      <section className="hero">
        <div className="hero__inner">
          <div className="hero__copy">
            <div className="hero__badges">
              <span className="badge badge--halal"><Icon name="halal" />{settings.halalLabel}</span>
              <span className="badge hero__badge-direct">À emporter</span>
            </div>
            <h1 className="hero__title">La meilleure excuse pour <em>ne pas cuisiner</em> ce soir</h1>
            <p className="hero__text">Tacos, burgers, pizzas, bowls et Crousty Fox. Commandez en ligne dans l&apos;un de nos {restaurants.length} restaurants (Stains, Dugny, Le Blanc-Mesnil) et passez la récupérer à l&apos;heure choisie.</p>
            <div className="hero__cta">
              {/* Restaurant choisi fermé : bouton grisé (la carte reste consultable dans le menu) */}
              {current && status && !status.open
                ? <span className="btn btn--ghost btn--xl is-disabled" aria-disabled="true">Fermé pour le moment</span>
                : <Link className="btn btn--primary btn--xl" href="/carte">Commander</Link>}
              {current && status && <div className="hero__sub"><span className={`dot ${status.open ? '' : 'is-closed'}`} />{restaurantTitle(current)} : {status.label}</div>}
            </div>
            <ul className="hero__facts">
              <li><strong>{restaurants.length}</strong>restaurants</li>
              {current && <li><strong>{current.prepMinutes} min</strong>de préparation</li>}
              <li><strong>Carte</strong>bancaire</li>
            </ul>
          </div>
          <div className="hero__visual">
            <Photo src={tacos?.imageUrl} className="ph--hero ph--red" label="Photo tacos XXL" />
            {tacos && <div className="hero__sticker">Tacos dès<strong>{formatAmount(tacos.price).replace(/,00$/, '')}€</strong></div>}
          </div>
        </div>
      </section>

      {spots.banners.length > 0 ? <PromoBanner slides={spots.banners} /> : bogoSizes.length > 0 && (
        <Link className="promo" href="/carte?cat=pizzas" aria-label="Voir l'offre pizza">
          <div className="promo__pizza">2x</div>
          <div>
            <span className="promo__kicker">Offre pizza</span>
            <div className="promo__title">1 pizza achetée <span>= 1 offerte</span></div>
          </div>
          <p className="promo__text">Sur les tailles {bogoSizes.map(s => s.label).join(' et ')}, à emporter. {bogoSizes.map(s => `Deux ${s.label} pour ${formatPrice(s.price)}`).join(', ')}.</p>
          <span className="btn btn--dark promo__cta">Voir les pizzas</span>
        </Link>
      )}

      {spots.carousel.length > 0 && (
        <section className="section" aria-label="À l'affiche">
          <div className="section__head"><h2 className="section__title">À l&apos;affiche</h2></div>
          <PromoCarousel slides={spots.carousel} />
        </section>
      )}

      {spots.panels.length > 0 && (
        <section className="section section--white">
          <div className="section__head"><h2 className="section__title">Bons plans</h2></div>
          <PromoPanels slides={spots.panels} />
        </section>
      )}

      {featured.length > 0 && (
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">Les plus commandés</h2>
            <Link className="section__link" href="/carte">Toute la carte <Icon name="chevron" /></Link>
          </div>
          <Featured products={featured} pizzas={pizzas} />
        </section>
      )}

      {/* Plusieurs modes seulement si la livraison (option O5) est achetée */}
      {modes.length > 1 && (
        <section className="section section--white">
          <div className="section__head"><h2 className="section__title">Votre commande</h2></div>
          <ModeLinks modes={modes} />
        </section>
      )}

      <section className="section">
        <div className="section__head"><h2 className="section__title">Nos restaurants</h2><Link className="section__link" href="/restaurants">Tous les restaurants <Icon name="chevron" /></Link></div>
        <div className="resto-grid">
          {restaurants.map(r => <RestaurantCard key={r.id} r={r} current={r.id === current?.id} />)}
        </div>
      </section>
    </div>
  );
}
