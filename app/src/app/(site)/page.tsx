import Link from 'next/link';
import { Icon } from '@/components/Icons';
import { Photo } from '@/components/menu/ProductCard';
import { Featured } from '@/components/menu/Featured';
import { ModeLinks } from '@/components/site/ModeLinks';
import { PromoBanner, PromoCarousel, PromoPanels } from '@/components/site/Slides';
import { getCatalog, getRestaurant } from '@/lib/catalog';
import { hmLabel, openStatus, parisClock } from '@/lib/hours';
import { formatAmount, formatPrice } from '@/lib/money';
import { mapsSearchUrl, phoneHref } from '@/lib/format';
import { modeInfos } from '@/lib/site';
import { JsonLd, restaurantJsonLd } from '@/lib/seo';
import { getPublicSlides } from '@/lib/slides';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [catalog, restaurant, spots] = await Promise.all([getCatalog(), getRestaurant(), getPublicSlides()]);
  const { settings, hours } = restaurant;
  const status = openStatus(hours);
  const today = hours.find(h => h.dayOfWeek === parisClock().day);
  const featured = catalog.products.filter(p => p.isFeatured).slice(0, 8);
  const pizzas = catalog.products.filter(p => p.kind === 'PIZZA');
  const tacos = catalog.products.find(p => p.kind === 'TACOS');
  const bogoSizes = pizzas[0]?.sizes.filter(s => s.bogo) ?? [];
  const address = [settings.addressLine1, `${settings.postalCode} ${settings.city}`].filter(Boolean).join(', ');

  return (
    <div className="page">
      <JsonLd data={restaurantJsonLd(restaurant)} />
      <section className="hero">
        <div className="hero__inner">
          <div className="hero__copy">
            <div className="hero__badges">
              <span className="badge badge--halal"><Icon name="halal" />{settings.halalLabel}</span>
              <span className="badge hero__badge-direct">Commande directe, sans appli</span>
            </div>
            <h1 className="hero__title">La meilleure excuse pour <em>ne pas cuisiner</em> ce soir</h1>
            <p className="hero__text">Tacos généreux, burgers XXL, pizzas, bowls et Crousty Fox. Préparés à {settings.city}, prêts en {settings.prepMinutes} minutes, au prix de la carte.</p>
            <div className="hero__cta">
              <Link className="btn btn--primary btn--xl" href="/carte">Commander</Link>
              <div className="hero__sub"><span className={`dot ${status.open ? '' : 'is-closed'}`} />{status.label}</div>
            </div>
            <ul className="hero__facts">
              <li><strong>{settings.prepMinutes} min</strong>de préparation</li>
              <li><strong>0 €</strong>de commission</li>
              <li><strong>{hours.every(h => h.isOpen) ? '7j/7' : 'Aujourd\'hui'}</strong>{today?.isOpen ? `${hmLabel(today.open)} à ${hmLabel(today.close)}` : 'fermé'}</li>
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
          <p className="promo__text">Sur les tailles {bogoSizes.map(s => s.label).join(' et ')}, sur place et à emporter. {bogoSizes.map(s => `Deux ${s.label} pour ${formatPrice(s.price)}`).join(', ')}.</p>
          <span className="btn btn--dark promo__cta">Voir les pizzas</span>
        </Link>
      )}

      {spots.carousel.length > 0 && (
        <section className="section" aria-label="À l'affiche">
          <div className="section__head"><h2 className="section__title">À l&apos;<em>affiche</em></h2></div>
          <PromoCarousel slides={spots.carousel} />
        </section>
      )}

      {spots.panels.length > 0 && (
        <section className="section section--white">
          <div className="section__head"><h2 className="section__title">Les <em>bons plans</em></h2></div>
          <PromoPanels slides={spots.panels} />
        </section>
      )}

      {featured.length > 0 && (
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">Les <em>incontournables</em></h2>
            <Link className="section__link" href="/carte">Toute la carte <Icon name="chevron" /></Link>
          </div>
          <Featured products={featured} pizzas={pizzas} />
        </section>
      )}

      <section className="section section--white">
        <div className="section__head"><h2 className="section__title">Comme vous <em>voulez</em></h2></div>
        <ModeLinks modes={modeInfos(restaurant)} />
      </section>

      <section className="section why">
        <div className="section__head"><h2 className="section__title">Pourquoi commander ici plutôt que sur une appli ?</h2></div>
        <ul className="why__list">
          <li><span className="num">01</span><div><strong>Les prix de la carte, rien de plus</strong><span>Pas de majoration, pas de frais de service cachés.</span></div></li>
          <li><span className="num">02</span><div><strong>Votre commande arrive direct en cuisine</strong><span>Moins d&apos;attente, moins d&apos;erreurs, suivi en temps réel.</span></div></li>
          <li><span className="num">03</span><div><strong>Vous soutenez le resto du quartier</strong><span>100 % de ce que vous payez revient à Tacos Fox.</span></div></li>
        </ul>
      </section>

      <section className="section">
        <div className="section__head"><h2 className="section__title">On vous <em>attend</em></h2><Link className="section__link" href="/infos">Infos pratiques <Icon name="chevron" /></Link></div>
        <div className="info-card">
          <div className="info-row"><Icon name="clock" /><div><strong>{today?.isOpen ? `Aujourd'hui ${hmLabel(today.open)} à ${hmLabel(today.close)}` : 'Fermé aujourd\'hui'}</strong><span className={`open-pill ${status.open ? '' : 'is-closed'}`}>{status.label}</span></div></div>
          <div className="info-row"><Icon name="pin" /><div><strong>{settings.addressLine1}</strong><span>{settings.postalCode} {settings.city}</span></div></div>
          <div className="info-card__actions">
            {settings.phone && <a className="btn btn--light" href={phoneHref(settings.phone)}><Icon name="phone" /> Appeler</a>}
            <a className="btn btn--light" href={mapsSearchUrl(address)} target="_blank" rel="noopener"><Icon name="route" /> Itinéraire</a>
          </div>
        </div>
      </section>
    </div>
  );
}
