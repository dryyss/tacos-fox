import type { Metadata } from 'next';
import { MenuBrowser } from '@/components/menu/MenuBrowser';
import { redirect } from 'next/navigation';
import { getCatalog } from '@/lib/catalog';
import { openStatus } from '@/lib/hours';
import { getCurrentRestaurant, restaurantTitle } from '@/lib/restaurants';

export const metadata: Metadata = {
  title: 'La carte',
  alternates: { canonical: '/carte' },
  description: 'Tacos à composer, burgers, pizzas (1 achetée = 1 offerte), sandwichs, bowls, Crousty Fox et desserts. Commande en ligne à emporter à Stains, Dugny et Le Blanc-Mesnil.',
};
export const dynamic = 'force-dynamic';

/* C3 : carte du restaurant choisi. Sans restaurant, le client le choisit d'abord (C2). */
export default async function MenuPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const [{ cat }, restaurant] = await Promise.all([searchParams, getCurrentRestaurant()]);
  if (!restaurant) redirect(`/restaurants?next=${encodeURIComponent(cat ? `/carte?cat=${cat}` : '/carte')}`);
  const catalog = await getCatalog(restaurant.id);
  // Hors horaires (ou commande pas encore ouverte) : carte consultable, commande bloquée avec un message
  const status = openStatus(restaurant.hours);
  const closedNotice = !restaurant.isActive || !restaurant.orderingEnabled
    ? `${restaurantTitle(restaurant)} : la commande en ligne ouvre bientôt. Vous pouvez consulter la carte.`
    : !status.open ? `${restaurantTitle(restaurant)} est fermé (${status.label.replace(/^Fermé, ?/, '')}). Vous pouvez consulter la carte, la commande reprend à l'ouverture.` : null;
  return <MenuBrowser catalog={catalog} initialCat={cat} closedNotice={closedNotice} />;
}
