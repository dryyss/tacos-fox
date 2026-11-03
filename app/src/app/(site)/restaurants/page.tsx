import type { Metadata } from 'next';
import { RestaurantCard } from '@/components/restaurants/RestaurantCard';
import { NearestList } from '@/components/restaurants/NearestList';
import { getCurrentRestaurant, getRestaurants } from '@/lib/restaurants';

export const metadata: Metadata = {
  title: 'Nos restaurants',
  alternates: { canonical: '/restaurants' },
  description: 'Les 5 restaurants Tacos Fox à Stains, Dugny et Le Blanc-Mesnil : choisissez le vôtre et commandez à emporter.',
};
export const dynamic = 'force-dynamic';

/* C2 : le client choisit son restaurant (liste avec adresse et horaires) */
export default async function RestaurantsPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, restaurants, current] = await Promise.all([searchParams, getRestaurants(), getCurrentRestaurant()]);
  const safeNext = next && /^\/(?!\/)/.test(next) ? next : undefined;
  return (
    <div className="page">
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="section__head" style={{ maxWidth: 'var(--max)', marginInline: 'auto' }}>
          <div><span className="kicker">Nos restaurants</span><h1 className="section__title">Choisissez votre restaurant</h1></div>
        </div>
        <p className="muted" style={{ maxWidth: 'var(--max)', marginInline: 'auto' }}>Votre commande est préparée dans le restaurant choisi, à emporter au créneau de votre choix. Vous pourrez en changer avant de payer.</p>
      </section>
      <section className="section" style={{ paddingTop: 12 }}>
        <NearestList items={restaurants.map(r => ({ id: r.id, lat: r.latitude, lng: r.longitude, card: <RestaurantCard r={r} current={r.id === current?.id} next={safeNext} /> }))} />
      </section>
    </div>
  );
}
