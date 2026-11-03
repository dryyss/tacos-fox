import { NextResponse } from 'next/server';
import { getRestaurantBySlug, RESTAURANT_COOKIE } from '@/lib/restaurants';

/* Choix du restaurant (C2) : liste, page restaurant (C8) et QR code (R7) passent par ici.
   Mémorise le restaurant puis ouvre sa carte (ou la page demandée, chemin interne uniquement). */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(req.url);
  const next = url.searchParams.get('next');
  const target = next && /^\/(?!\/)/.test(next) ? next : '/carte';
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return NextResponse.redirect(new URL('/restaurants', url));
  const res = NextResponse.redirect(new URL(target, url));
  res.cookies.set(RESTAURANT_COOKIE, restaurant.slug, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: true });
  return res;
}
