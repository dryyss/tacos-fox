import 'server-only';
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Order, OrderItem, Settings } from '@prisma/client';
import { splitVat } from './accounting';
import { MODE_LABELS, orderNumberLabel } from './format';

const euros = (c: number) => (c / 100).toFixed(2).replace('.', ',') + ' EUR';
const TZ = 'Europe/Paris';

/* Les polices standard PDF (WinAnsi) ne couvrent pas certains caractères : on les remplace */
const safe = (s: string) => s.replace(/[  ]/g, ' ').replace(/[œ]/g, 'oe').replace(/[Œ]/g, 'OE').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/[^\x20-\x7E -ÿ€]/g, '');

/* Facture PDF conforme : vendeur, numéro unique, date, détail, HT / TVA / TTC */
export async function renderInvoice(order: Order & { items: OrderItem[] }, s: Settings): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Facture ${order.invoiceNumber}`);
  pdf.setAuthor(s.legalName || s.name);
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const red = rgb(0.84, 0.15, 0.12), grey = rgb(0.35, 0.35, 0.35), black = rgb(0.08, 0.08, 0.08);

  const text = (p: PDFPage, t: string, x: number, y: number, o: { size?: number; f?: PDFFont; color?: ReturnType<typeof rgb>; right?: boolean; center?: boolean } = {}) => {
    const size = o.size ?? 10, f = o.f ?? font, str = safe(t), w = f.widthOfTextAtSize(str, size);
    p.drawText(str, { x: o.right ? x - w : o.center ? x - w / 2 : x, y, size, font: f, color: o.color ?? black });
  };

  let y = 790;
  text(page, 'TACOS', 50, y, { size: 24, f: bold });
  text(page, 'FOX', 50 + bold.widthOfTextAtSize('TACOS', 24), y, { size: 24, f: bold, color: red });
  text(page, 'FACTURE', 545, y, { size: 20, f: bold, right: true });
  y -= 18;
  text(page, `N° ${order.invoiceNumber}`, 545, y, { size: 11, f: bold, right: true });
  y -= 14;
  const issued = (order.invoicedAt ?? order.createdAt).toLocaleDateString('fr-FR', { timeZone: TZ });
  text(page, `Date : ${issued}`, 545, y, { right: true, color: grey });
  text(page, `Commande ${orderNumberLabel(order.number)} du ${order.createdAt.toLocaleDateString('fr-FR', { timeZone: TZ })}`, 545, y - 14, { right: true, color: grey });

  // Vendeur
  let sy = 768;
  for (const line of [s.legalName || s.name, s.addressLine1, `${s.postalCode} ${s.city}`, s.siret && `SIRET ${s.siret}`, s.vatNumber && `TVA ${s.vatNumber}`, s.phone, s.email].filter(Boolean) as string[]) {
    text(page, line, 50, sy, { color: grey }); sy -= 13;
  }

  // Client
  y = 660;
  text(page, 'Facturé à', 50, y, { f: bold });
  y -= 14;
  for (const line of [order.customerName, order.customerEmail, order.customerPhone, order.mode === 'LIVRAISON' ? `${order.addressLine1 ?? ''}${order.addressExtra ? ', ' + order.addressExtra : ''}` : '', order.mode === 'LIVRAISON' ? `${order.postalCode ?? ''} ${order.city ?? ''}` : ''].filter(Boolean)) {
    text(page, line, 50, y); y -= 13;
  }
  text(page, `Mode : ${MODE_LABELS[order.mode]}`, 545, 646, { right: true });
  text(page, `Paiement : ${order.paymentMethod === 'CARD' ? 'carte bancaire en ligne' : 'au restaurant'}`, 545, 632, { right: true });

  // Tableau
  y = 570;
  page.drawRectangle({ x: 50, y: y - 6, width: 495, height: 22, color: rgb(0.08, 0.08, 0.08) });
  text(page, 'Désignation', 58, y, { f: bold, color: rgb(1, 1, 1) });
  text(page, 'Qté', 380, y, { f: bold, color: rgb(1, 1, 1), right: true });
  text(page, 'PU TTC', 460, y, { f: bold, color: rgb(1, 1, 1), right: true });
  text(page, 'Total TTC', 537, y, { f: bold, color: rgb(1, 1, 1), right: true });
  y -= 26;

  const wrap = (t: string, max: number, f: PDFFont, size: number) => {
    const words = safe(t).split(' '); const lines: string[] = []; let cur = '';
    for (const w of words) { const next = cur ? `${cur} ${w}` : w; if (f.widthOfTextAtSize(next, size) > max && cur) { lines.push(cur); cur = w; } else cur = next; }
    if (cur) lines.push(cur);
    return lines;
  };

  let current = page;
  for (const item of order.items) {
    const details = wrap(item.details.join(' · '), 300, font, 8);
    if (y - 14 - details.length * 10 < 120) { current = pdf.addPage([595.28, 841.89]); y = 790; }
    text(current, item.name, 58, y, { f: bold });
    text(current, String(item.qty), 380, y, { right: true });
    text(current, euros(item.unitPrice), 460, y, { right: true });
    text(current, euros(item.unitPrice * item.qty), 537, y, { right: true });
    y -= 12;
    for (const d of details) { text(current, d, 58, y, { size: 8, color: grey }); y -= 10; }
    current.drawLine({ start: { x: 50, y: y + 2 }, end: { x: 545, y: y + 2 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
    y -= 12;
  }

  // Totaux
  const net = order.total - order.refundedAmount;
  const { ht, vat } = splitVat(order.total, s.vatRate);
  const rows: [string, string, boolean?][] = [['Sous-total TTC', euros(order.subtotal)]];
  if (order.discount) rows.push([`Remise ${order.promoCode ?? ''}`, '-' + euros(order.discount)]);
  if (order.mode === 'LIVRAISON') rows.push(['Livraison TTC', euros(order.deliveryFee)]);
  rows.push(['Total HT', euros(ht)], [`TVA ${(s.vatRate / 100).toString().replace('.', ',')} %`, euros(vat)], ['Total TTC', euros(order.total), true]);
  if (order.refundedAmount) rows.push(['Remboursé', '-' + euros(order.refundedAmount)], ['Net payé TTC', euros(net), true]);
  if (y < 200) { current = pdf.addPage([595.28, 841.89]); y = 790; }
  y -= 6;
  for (const [label, value, strong] of rows) {
    text(current, label, 440, y, { right: true, f: strong ? bold : font, size: strong ? 12 : 10 });
    text(current, value, 537, y, { right: true, f: strong ? bold : font, size: strong ? 12 : 10 });
    y -= strong ? 18 : 14;
  }

  const foot = `${s.legalName || s.name} · ${s.addressLine1} ${s.postalCode} ${s.city}${s.siret ? ' · SIRET ' + s.siret : ''}. Facture acquittée${order.paymentMethod === 'CARD' ? ' par carte bancaire' : ''}.`;
  for (const p of pdf.getPages()) text(p, foot, 297, 40, { size: 8, color: grey, center: true });
  return pdf.save();
}
