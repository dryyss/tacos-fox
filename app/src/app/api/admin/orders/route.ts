import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/admin';
import { getBoardOrders } from '@/lib/admin-orders';

export async function GET() {
  try { await requireStaff(); } catch { return NextResponse.json({ error: 'Accès refusé' }, { status: 401 }); }
  return NextResponse.json(await getBoardOrders(), { headers: { 'Cache-Control': 'no-store' } });
}
