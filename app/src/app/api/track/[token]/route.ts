import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/* Statut léger interrogé par la page de suivi */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await prisma.order.findUnique({ where: { trackingToken: token }, select: { status: true, paymentStatus: true, updatedAt: true } });
  if (!order) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  return NextResponse.json(order, { headers: { 'Cache-Control': 'no-store' } });
}
