import { OrdersBoard } from '@/components/admin/OrdersBoard';
import { getBoardOrders } from '@/lib/admin-orders';

export const metadata = { title: 'Commandes' };

export default async function AdminOrdersPage() {
  return <OrdersBoard initial={await getBoardOrders()} />;
}
