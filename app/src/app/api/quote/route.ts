import { NextResponse } from 'next/server';
import { quoteCart, quoteSchema } from '@/lib/quote';

/* Prix recalculés côté serveur pour l'affichage du panier */
export async function POST(req: Request) {
  const parsed = quoteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Panier invalide' }, { status: 400 });
  return NextResponse.json(await quoteCart(parsed.data));
}
