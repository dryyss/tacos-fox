import { OrdersBoard } from '@/components/admin/OrdersBoard';
import { boardRestaurants, getBoardOrders } from '@/lib/admin-orders';
import { requireStaffPage, restaurantScope } from '@/lib/admin';

export const metadata = { title: 'Commandes' };

/* R2 : écran cuisine. Un équipier voit son restaurant ; le gérant choisit un restaurant ou les voit tous. */
export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const user = await requireStaffPage();
  const scope = await restaurantScope(user);
  const restaurants = await boardRestaurants(scope);
  const { r } = await searchParams;
  const selected = restaurants.find(x => x.slug === r)?.id ?? (restaurants.length === 1 ? restaurants[0].id : null);
  return <OrdersBoard key={selected ?? 'all'} initial={await getBoardOrders(scope, selected)} restaurants={restaurants} selected={selected} allowAll={!scope || scope.length > 1} />;
}
