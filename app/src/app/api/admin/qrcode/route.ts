import QRCode from 'qrcode';
import { requireStaff } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { appUrl } from '@/lib/url';

/* R7 : QR code SVG qui ouvre la carte d'un restaurant (/r/<restaurant> mémorise le choix) */
export async function GET(req: Request) {
  try { await requireStaff('qrcodes'); } catch { return new Response('Accès refusé', { status: 401 }); }
  const slug = new URL(req.url).searchParams.get('r') ?? '';
  const restaurant = await prisma.restaurant.findUnique({ where: { slug }, select: { slug: true } });
  if (!restaurant) return new Response('Restaurant inconnu', { status: 404 });
  const svg = await QRCode.toString(`${appUrl()}/r/${restaurant.slug}`, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#141414', light: '#ffffff' } });
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Content-Disposition': `inline; filename="qr-tacosfox-${restaurant.slug}.svg"` } });
}
