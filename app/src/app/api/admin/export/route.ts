import { requireStaff } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { parisDayRange, splitVat } from '@/lib/accounting';
import { getSettings } from '@/lib/catalog';
import { MODE_LABELS, orderNumberLabel, STATUS_LABELS } from '@/lib/format';

const isDay = (s: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const euros = (c: number) => (c / 100).toFixed(2).replace('.', ',');
const cell = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/* Export CSV (séparateur « ; », compatible Excel français) des commandes d'une période */
export async function GET(req: Request) {
  try { await requireStaff(true); } catch { return new Response('Accès refusé', { status: 401 }); }
  const url = new URL(req.url);
  const du = url.searchParams.get('du'), au = url.searchParams.get('au');
  if (!isDay(du) || !isDay(au)) return new Response('Période invalide', { status: 400 });

  const [orders, settings] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: parisDayRange(du!).from, lt: parisDayRange(au!).to }, status: { not: 'PENDING_PAYMENT' } },
      orderBy: { createdAt: 'asc' },
    }),
    getSettings(),
  ]);

  const head = ['Date', 'Heure', 'Commande', 'Facture', 'Mode', 'Statut', 'Paiement', 'Etat paiement', 'Client', 'Sous-total', 'Remise', 'Code promo', 'Livraison', 'Total TTC', 'Rembourse', 'Net TTC', 'Net HT', 'TVA'];
  const rows = orders.map(o => {
    const paid = ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(o.paymentStatus);
    const net = paid ? o.total - o.refundedAmount : 0;
    const { ht, vat } = splitVat(net, settings.vatRate);
    const d = o.createdAt;
    return [
      d.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }), d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }),
      orderNumberLabel(o.number), o.invoiceNumber ?? '', MODE_LABELS[o.mode], STATUS_LABELS[o.status], o.paymentMethod === 'CARD' ? 'CB en ligne' : 'Sur place', o.paymentStatus,
      o.customerName, euros(o.subtotal), euros(o.discount), o.promoCode ?? '', euros(o.deliveryFee), euros(o.total), euros(o.refundedAmount), euros(net), euros(ht), euros(vat),
    ].map(v => cell(String(v))).join(';');
  });

  // BOM pour qu'Excel lise correctement les accents
  const csv = '﻿' + [head.join(';'), ...rows].join('\r\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="tacosfox-commandes-${du}-au-${au}.csv"` } });
}
