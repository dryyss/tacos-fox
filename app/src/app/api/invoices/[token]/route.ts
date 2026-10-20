import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/catalog';
import { renderInvoice } from '@/lib/invoice';

/* Facture PDF, accessible avec le jeton de suivi (lien privé envoyé au client) */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await prisma.order.findUnique({ where: { trackingToken: token }, include: { items: true } });
  if (!order?.invoiceNumber) return new Response('Facture indisponible', { status: 404 });
  const pdf = await renderInvoice(order, await getSettings());
  return new Response(new Uint8Array(pdf), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="facture-${order.invoiceNumber}.pdf"`, 'Cache-Control': 'private, no-store' },
  });
}
