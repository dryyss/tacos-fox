import { notFound } from 'next/navigation';
import { requireStaffPage } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/catalog';
import { formatPrice } from '@/lib/money';
import { MODE_LABELS, orderNumberLabel } from '@/lib/format';
import { markPrinted } from '@/lib/order-admin';
import { AutoPrint } from './AutoPrint';

export const metadata = { title: 'Ticket', robots: { index: false } };
export const dynamic = 'force-dynamic';

const TZ = 'Europe/Paris';
const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleString('fr-FR', { ...o, timeZone: TZ });

/* Ticket cuisine / client au format imprimante thermique 80 mm */
export default async function TicketPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ print?: string }> }) {
  await requireStaffPage();
  const [{ id }, { print }] = await Promise.all([params, searchParams]);
  const [order, settings] = await Promise.all([prisma.order.findUnique({ where: { id }, include: { items: true } }), getSettings()]);
  if (!order) notFound();
  if (!order.printedAt) await markPrinted(order.id);

  return (
    <div className="receipt">
      <AutoPrint auto={!!print} />
      <h1>{settings.name}</h1>
      <div className="center">{settings.addressLine1}<br />{settings.postalCode} {settings.city}{settings.phone && <><br />{settings.phone}</>}</div>
      <hr />
      <div className="big">{orderNumberLabel(order.number)}</div>
      <div className="big">{MODE_LABELS[order.mode].toUpperCase()}</div>
      <div className="center">{order.asap ? 'DÈS QUE POSSIBLE' : `POUR ${fmt(order.scheduledFor!, { hour: '2-digit', minute: '2-digit' })}`}</div>
      <hr />
      <div>Client : <b>{order.customerName}</b></div>
      <div>Tél : {order.customerPhone}</div>
      {order.mode === 'LIVRAISON' && <div>Adresse : {order.addressLine1}{order.addressExtra ? `, ${order.addressExtra}` : ''}, {order.postalCode} {order.city}</div>}
      <hr />
      {order.items.map(i => (
        <div key={i.id} className="item">
          <div className="row"><b>{i.qty} x {i.name}</b><span>{formatPrice(i.unitPrice * i.qty)}</span></div>
          {i.details.map((d, k) => <small key={k}>- {d}</small>)}
        </div>
      ))}
      {order.note && <><hr /><div className="note">NOTE : {order.note}</div></>}
      <hr />
      <div className="row"><span>Sous-total</span><span>{formatPrice(order.subtotal)}</span></div>
      {order.discount > 0 && <div className="row"><span>Remise {order.promoCode}</span><span>-{formatPrice(order.discount)}</span></div>}
      {order.mode === 'LIVRAISON' && <div className="row"><span>Livraison</span><span>{formatPrice(order.deliveryFee)}</span></div>}
      <div className="row" style={{ fontSize: 16, fontWeight: 'bold' }}><span>TOTAL TTC</span><span>{formatPrice(order.total)}</span></div>
      <div className="center" style={{ marginTop: '2mm', fontWeight: 'bold' }}>
        {order.paymentStatus === 'PAID' ? (order.paymentMethod === 'CARD' ? 'PAYÉ EN LIGNE (CB)' : 'PAYÉ') : 'À ENCAISSER'}
      </div>
      <hr />
      <div className="center">Commande du {fmt(order.createdAt, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
      <div className="center">{settings.halalLabel}</div>
      <div className="center">Merci et à bientôt !</div>
    </div>
  );
}
