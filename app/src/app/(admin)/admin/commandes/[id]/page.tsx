import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { formatPrice } from '@/lib/money';
import { MODE_LABELS, orderNumberLabel, STATUS_LABELS } from '@/lib/format';
import { OrderActions } from './OrderActions';

export const metadata = { title: 'Commande' };

const TZ = 'Europe/Paris';
const dt = (d: Date) => d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: TZ });
const PAYMENT = { UNPAID: 'Non payée', PAID: 'Payée', PARTIALLY_REFUNDED: 'Remboursée en partie', REFUNDED: 'Remboursée', FAILED: 'Paiement échoué' } as const;

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true, events: { orderBy: { createdAt: 'asc' } }, user: { select: { email: true } } } });
  if (!order) notFound();

  return (
    <>
      <Link className="back-link" href="/admin">← Commandes</Link>
      <div className="admin-head">
        <div>
          <h1 className="admin-title">{orderNumberLabel(order.number)}</h1>
          <p className="admin-sub" style={{ margin: 0 }}>
            <span className="pill pill--dark">{MODE_LABELS[order.mode]}</span>{' '}
            <span className={`pill ${order.status === 'CANCELLED' ? 'pill--red' : order.status === 'COMPLETED' ? 'pill--green' : 'pill--yellow'}`}>{STATUS_LABELS[order.status]}</span>{' '}
            <span className="pill">{order.paymentMethod === 'CARD' ? 'CB en ligne' : 'Sur place'} · {PAYMENT[order.paymentStatus]}</span>
          </p>
        </div>
        <OrderActions order={{ id: order.id, status: order.status, mode: order.mode, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, refundable: order.total - order.refundedAmount, invoiceToken: order.invoiceNumber ? order.trackingToken : null }} />
      </div>

      <div className="infos-grid" style={{ padding: 0 }}>
        <div>
          <div className="panel" style={{ marginTop: 0 }}>
            <div className="panel__title">Client</div>
            <div className="summary-mini">
              <div><span>Nom</span><b>{order.customerName}</b></div>
              <div><span>Téléphone</span><b><a href={`tel:${order.customerPhone}`}>{order.customerPhone}</a></b></div>
              <div><span>E-mail</span><b>{order.customerEmail}</b></div>
              <div><span>Compte</span><b>{order.user ? 'Client inscrit' : 'Invité'}</b></div>
              {order.mode === 'LIVRAISON' && <div><span>Adresse</span><b style={{ textAlign: 'right' }}>{order.addressLine1}{order.addressExtra ? `, ${order.addressExtra}` : ''}<br />{order.postalCode} {order.city}</b></div>}
              <div><span>Créneau</span><b>{order.asap ? 'Dès que possible' : dt(order.scheduledFor!)}</b></div>
              <div><span>Passée le</span><b>{dt(order.createdAt)}</b></div>
              {order.invoiceNumber && <div><span>Facture</span><b>{order.invoiceNumber}</b></div>}
            </div>
            {order.note && <p className="ticket__note" style={{ marginTop: 12 }}>{order.note}</p>}
          </div>
          <div className="panel">
            <div className="panel__title">Historique</div>
            <div className="summary-mini">
              {order.events.map(e => <div key={e.id}><span>{dt(e.createdAt)}</span><b style={{ textAlign: 'right' }}>{e.message}</b></div>)}
            </div>
          </div>
        </div>
        <div>
          <div className="panel" style={{ marginTop: 0 }}>
            <div className="panel__title">Articles</div>
            <div className="recap__items">
              {order.items.map(i => <div key={i.id} className="recap__item"><div>{i.qty} x {i.name} <small>{i.details.join(' · ')}</small></div><b>{formatPrice(i.unitPrice * i.qty)}</b></div>)}
            </div>
            <div style={{ height: 12 }} />
            <div className="totals">
              <div><span>Sous-total</span><span>{formatPrice(order.subtotal)}</span></div>
              {order.discount > 0 && <div><span>Remise {order.promoCode}</span><span>-{formatPrice(order.discount)}</span></div>}
              {order.mode === 'LIVRAISON' && <div><span>Livraison</span><span>{formatPrice(order.deliveryFee)}</span></div>}
              <div className="total"><span>Total TTC</span><span className="price">{formatPrice(order.total)}</span></div>
              {order.refundedAmount > 0 && <div><span>Remboursé</span><span>-{formatPrice(order.refundedAmount)}</span></div>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
