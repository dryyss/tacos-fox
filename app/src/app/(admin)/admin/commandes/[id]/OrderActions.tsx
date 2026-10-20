'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { OrderStatus } from '@prisma/client';
import { useToast } from '@/components/ui/Toast';
import { formatAmount } from '@/lib/money';
import { cancel, changeStatus, collectOnsite, refund, type AdminResult } from '../../actions';

interface Props {
  id: string; status: OrderStatus; mode: string; paymentMethod: string; paymentStatus: string; refundable: number; invoiceToken: string | null;
}

export function OrderActions({ order }: { order: Props }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState('');

  const run = (fn: () => Promise<AdminResult>, ok: string) => start(async () => {
    const r = await fn();
    if (!r.ok) return toast(r.error ?? 'Action impossible');
    toast(ok);
    router.refresh();
  });

  const active = !['COMPLETED', 'CANCELLED', 'PENDING_PAYMENT'].includes(order.status);
  const next: OrderStatus | null = order.status === 'RECEIVED' ? 'PREPARING' : order.status === 'PREPARING' ? (order.mode === 'LIVRAISON' ? 'OUT_FOR_DELIVERY' : 'READY') : order.status === 'READY' || order.status === 'OUT_FOR_DELIVERY' ? 'COMPLETED' : null;
  const canRefund = order.paymentMethod === 'CARD' && ['PAID', 'PARTIALLY_REFUNDED'].includes(order.paymentStatus) && order.refundable > 0;

  return (
    <div className="filters" style={{ margin: 0 }}>
      <a className="btn btn--ghost btn--sm" href={`/admin/commandes/${order.id}/ticket?print=1`} target="_blank">Ticket</a>
      {order.invoiceToken && <a className="btn btn--ghost btn--sm" href={`/api/invoices/${order.invoiceToken}`}>Facture PDF</a>}
      {order.paymentStatus === 'UNPAID' && active && <button className="btn btn--yellow btn--sm" disabled={pending} onClick={() => run(() => collectOnsite(order.id), 'Encaissement enregistré')}>Encaisser</button>}
      {active && next && <button className="btn btn--primary btn--sm" disabled={pending} onClick={() => run(() => changeStatus(order.id, next), 'Statut mis à jour')}>Étape suivante</button>}
      {active && order.status !== 'OUT_FOR_DELIVERY' && (
        <button className="btn btn--ghost btn--sm" disabled={pending} onClick={() => {
          const reason = prompt('Motif de l\'annulation (visible du client) :', 'Produit indisponible');
          if (reason !== null) run(() => cancel(order.id, reason), 'Commande annulée');
        }}>Annuler{order.paymentStatus === 'PAID' && order.paymentMethod === 'CARD' ? ' et rembourser' : ''}</button>
      )}
      {canRefund && (
        <form style={{ display: 'flex', gap: 6 }} onSubmit={e => {
          e.preventDefault();
          const cents = Math.round(Number(amount.replace(',', '.')) * 100);
          if (!(cents > 0)) return toast('Montant invalide');
          const reason = prompt('Motif du remboursement :', 'Geste commercial');
          if (reason !== null) run(() => refund(order.id, cents, reason), 'Remboursement effectué');
        }}>
          <input aria-label="Montant à rembourser" placeholder={`max ${formatAmount(order.refundable)}`} value={amount} onChange={e => setAmount(e.target.value)} style={{ width: 110 }} />
          <button className="btn btn--dark btn--sm" disabled={pending}>Rembourser</button>
        </form>
      )}
    </div>
  );
}
