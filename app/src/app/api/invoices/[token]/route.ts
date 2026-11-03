import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/catalog';
import { renderInvoice } from '@/lib/invoice';
import { limited } from '@/lib/rate-limit';

/* Facture PDF, accessible avec le jeton de suivi (lien privé envoyé au client) */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const tooMany = limited(req, 'invoice');
  if (tooMany) return tooMany;
  const { token } = await params;
  // ?telecharger=1 : enregistre le fichier au lieu de l'ouvrir dans le navigateur
  const download = new URL(req.url).searchParams.has('telecharger');
  const order = await prisma.order.findUnique({ where: { trackingToken: token }, include: { items: true, restaurant: true } });
  if (!order?.invoiceNumber) return new Response('Facture indisponible', { status: 404 });
  const pdf = await renderInvoice(order, await getSettings(), order.restaurant);
  return new Response(new Uint8Array(pdf), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="facture-${order.invoiceNumber}.pdf"`, 'Cache-Control': 'private, no-store' },
  });
}
