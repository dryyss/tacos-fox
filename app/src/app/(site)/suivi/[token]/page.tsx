import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/Icons';
import { TrackingRefresher } from '@/components/order/TrackingRefresher';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/catalog';
import { formatPrice } from '@/lib/money';
import { MODE_LABELS, orderNumberLabel, phoneHref } from '@/lib/format';

export const metadata: Metadata = { title: 'Suivi de commande', robots: { index: false } };
export const dynamic = 'force-dynamic';

const TZ = 'Europe/Paris';
const time = (d?: Date | null) => d?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).replace(':', 'h');

export default async function TrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [order, settings] = await Promise.all([
    prisma.order.findUnique({ where: { trackingToken: token }, include: { items: true, events: { orderBy: { createdAt: 'asc' } } } }),
    getSettings(),
  ]);
  if (!order) notFound();

  const delivery = order.mode === 'LIVRAISON';
  const flow = ['RECEIVED', 'PREPARING', delivery ? 'OUT_FOR_DELIVERY' : 'READY'];
  const index = order.status === 'COMPLETED' ? 3 : flow.indexOf(order.status);
  const at = (s: string) => order.events.find(e => e.status === s)?.createdAt;

  const steps = [
    { t: 'Commande reçue', d: 'Le restaurant a bien reçu votre commande' + (order.paymentMethod === 'CARD' ? ' et votre paiement.' : '. Règlement au comptoir.') },
    { t: 'En préparation', d: 'La cuisine s\'en occupe. On vous prévient dès que c\'est prêt.' },
    delivery
      ? { t: 'En livraison', d: `Le livreur est en route vers ${order.addressLine1 ?? 'votre adresse'}.` }
      : { t: 'Prête à récupérer', d: order.mode === 'SURPLACE' ? 'Présentez-vous au comptoir avec votre numéro.' : 'Passez au comptoir, votre sac vous attend.' },
  ];
  const eta = !order.asap && order.scheduledFor ? time(order.scheduledFor) : `${delivery ? settings.deliveryMinutes : settings.prepMinutes} min`;
  const live = !['COMPLETED', 'CANCELLED'].includes(order.status);
  const active = !['CANCELLED', 'PENDING_PAYMENT'].includes(order.status);

  let head;
  if (order.status === 'CANCELLED') {
    head = (
      <>
        <h1 className="confirm__title">Commande annulée</h1>
        <p className="muted">
          {order.paymentStatus === 'FAILED' ? 'Le paiement n\'a pas abouti, aucun montant n\'a été débité.' : 'Cette commande a été annulée.'}
          {order.paymentStatus === 'REFUNDED' && ' Le remboursement a été effectué sur votre carte.'}
        </p>
      </>
    );
  } else if (order.status === 'PENDING_PAYMENT') {
    head = (
      <>
        <h1 className="confirm__title">Paiement en cours</h1>
        <p className="muted">Nous attendons la confirmation de votre banque. Cette page se met à jour toute seule.</p>
      </>
    );
  } else {
    head = (
      <>
        <div className="confirm__check"><Icon name="check" /></div>
        <h1 className="confirm__title">Merci {order.customerName} !</h1>
        <p className="muted">Commande passée le {order.createdAt.toLocaleDateString('fr-FR', { timeZone: TZ })} à {time(order.createdAt)}</p>
      </>
    );
  }

  return (
    <div className="page">
      <TrackingRefresher token={token} status={order.status} live={live} />
      <section className="confirm">
        {head}
        <div className="confirm__num" aria-label="Numéro de commande">{orderNumberLabel(order.number)}</div>

        {active && (
          <>
            <div className="eta">
              <Icon name="clock" />
              <div className="eta__label"><strong>{MODE_LABELS[order.mode]}</strong>{order.asap ? 'Temps estimé' : 'Créneau choisi'}</div>
              <div className="eta__time">{order.status === 'COMPLETED' ? 'Terminée' : eta}</div>
            </div>
            <div className="timeline">
              {steps.map((s, i) => (
                <div key={s.t} className={`tl ${i < index ? 'is-done' : i === index ? 'is-current' : ''}`}>
                  <div className="tl__dot"><Icon name="check" /></div>
                  <div>
                    <div className="tl__title">{s.t}</div>
                    <div className="tl__text">{s.d}</div>
                    {i <= index && at(flow[i]) && <div className="tl__time">{time(at(flow[i]))}</div>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="recap panel">
          <div className="panel__title">Récapitulatif</div>
          <div className="recap__items">
            {order.items.map(i => <div key={i.id} className="recap__item"><div>{i.qty} x {i.name}<small>{i.details.join(' · ')}</small></div><b>{formatPrice(i.unitPrice * i.qty)}</b></div>)}
          </div>
          <div style={{ height: 12 }} />
          <div className="totals">
            {order.discount > 0 && <div className="is-free"><span>Remise {order.promoCode}</span><span>-{formatPrice(order.discount)}</span></div>}
            {delivery && <div><span>Livraison</span><span>{order.deliveryFee ? formatPrice(order.deliveryFee) : 'Offerte'}</span></div>}
            <div className="total">
              <span>Total {order.paymentMethod === 'ONSITE' ? 'à régler sur place' : order.paymentStatus === 'PAID' ? 'payé' : ''}</span>
              <span className="price price--red">{formatPrice(order.total)}</span>
            </div>
            {order.refundedAmount > 0 && <div className="is-free"><span>Remboursé</span><span>{formatPrice(order.refundedAmount)}</span></div>}
          </div>
        </div>
        <div className="actions-row" style={{ maxWidth: 420, marginInline: 'auto' }}>
          {settings.phone && <a className="btn btn--light" href={phoneHref(settings.phone)}><Icon name="phone" /> Appeler le resto</a>}
          {order.invoiceNumber
            ? <a className="btn btn--dark" href={`/api/invoices/${token}`}>Facture PDF</a>
            : <Link className="btn btn--dark" href="/compte">Mes commandes</Link>}
        </div>
        <p className="small muted" style={{ margin: '18px auto 0', maxWidth: 420 }}>Un reçu a été envoyé à {order.customerEmail}. Un problème ? Appelez-nous, on règle ça tout de suite.</p>
      </section>
      <div style={{ height: 32 }} />
    </div>
  );
}
