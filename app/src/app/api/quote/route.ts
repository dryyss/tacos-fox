import { NextResponse } from 'next/server';
import { limited } from '@/lib/rate-limit';
import { quoteCart, quoteSchema } from '@/lib/quote';
import { getCurrentRestaurant } from '@/lib/restaurants';

/* Prix recalculés côté serveur pour l'affichage du panier */
export async function POST(req: Request) {
  const tooMany = limited(req, 'quote');
  if (tooMany) return tooMany;
  const parsed = quoteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Panier invalide' }, { status: 400 });
  const restaurant = await getCurrentRestaurant();
  if (!restaurant) return NextResponse.json({ error: 'Choisissez votre restaurant.', needRestaurant: true }, { status: 409 });
  return NextResponse.json(await quoteCart(parsed.data, restaurant.id));
}
