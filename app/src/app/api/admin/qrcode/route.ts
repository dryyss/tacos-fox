import QRCode from 'qrcode';
import { requireStaff } from '@/lib/admin';
import { appUrl } from '@/lib/url';

/* QR code SVG vers la carte, éventuellement pour une table (sur place) */
export async function GET(req: Request) {
  try { await requireStaff(); } catch { return new Response('Accès refusé', { status: 401 }); }
  const table = new URL(req.url).searchParams.get('table');
  const target = `${appUrl()}/carte${table && /^\d{1,3}$/.test(table) ? `?mode=surplace&table=${table}` : ''}`;
  const svg = await QRCode.toString(target, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#141414', light: '#ffffff' } });
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Content-Disposition': `inline; filename="qr-tacosfox${table ? '-table-' + table : ''}.svg"` } });
}
