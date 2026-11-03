import { after, NextResponse } from 'next/server';
import { requireStaff, restaurantScope } from '@/lib/admin';
import { getBoardOrders } from '@/lib/admin-orders';
import { checkPendingPayments } from '@/lib/payment-check';

/* Écran cuisine : ?r=<id restaurant> pour un seul restaurant (dans le périmètre de la personne) */
export async function GET(req: Request) {
  let scope: string[] | null;
  try { scope = await restaurantScope(await requireStaff()); } catch { return NextResponse.json({ error: 'Accès refusé' }, { status: 401 }); }
  const r = new URL(req.url).searchParams.get('r');
  if (r && scope && !scope.includes(r)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  // Filet de sécurité : tant qu'un écran cuisine est ouvert, les paiements non confirmés par le webhook sont vérifiés auprès de Stripe
  after(() => checkPendingPayments().catch(e => console.error('Vérification des paiements :', e)));
  return NextResponse.json(await getBoardOrders(scope, r), { headers: { 'Cache-Control': 'no-store' } });
}
