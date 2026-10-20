import Link from 'next/link';
import type { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { formatPrice } from '@/lib/money';
import { MODE_LABELS, orderNumberLabel, STATUS_LABELS } from '@/lib/format';

export const metadata = { title: 'Historique' };

const PAGE = 50;

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ q?: string; statut?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? '';
  const page = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1);
  const status = sp.statut && sp.statut in STATUS_LABELS ? (sp.statut as OrderStatus) : undefined;

  const num = Number.parseInt(q.replace(/^TF-?/i, ''), 10);
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? {
      OR: [
        ...(Number.isFinite(num) ? [{ number: num }] : []),
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q.replace(/\s/g, '') } },
        { customerEmail: { contains: q, mode: 'insensitive' } },
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
      ],
    } : {}),
  };
  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, take: PAGE, skip: (page - 1) * PAGE }),
    prisma.order.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (p: number) => `/admin/historique?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { statut: status } : {}), page: String(p) })}`;

  return (
    <>
      <h1 className="admin-title">Historique des commandes</h1>
      <form className="filters">
        <input type="search" name="q" defaultValue={q} placeholder="N°, nom, téléphone, e-mail, facture" style={{ minWidth: 260 }} />
        <select name="statut" defaultValue={status ?? ''}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn btn--dark btn--sm">Rechercher</button>
        <span className="small muted">{total} commande{total > 1 ? 's' : ''}</span>
      </form>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>N°</th><th>Date</th><th>Client</th><th>Mode</th><th>Statut</th><th>Paiement</th><th className="num">Total</th></tr></thead>
          <tbody>
            {!orders.length && <tr><td colSpan={7} className="muted">Aucune commande.</td></tr>}
            {orders.map(o => (
              <tr key={o.id}>
                <td><Link className="link" href={`/admin/commandes/${o.id}`}>{orderNumberLabel(o.number)}</Link></td>
                <td>{o.createdAt.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}</td>
                <td>{o.customerName}<div className="small muted">{o.customerPhone}</div></td>
                <td>{MODE_LABELS[o.mode]}</td>
                <td><span className={`pill ${o.status === 'CANCELLED' ? 'pill--red' : o.status === 'COMPLETED' ? 'pill--green' : 'pill--yellow'}`}>{STATUS_LABELS[o.status]}</span></td>
                <td className="small">{o.paymentMethod === 'CARD' ? 'CB' : 'Sur place'} · {o.paymentStatus === 'PAID' ? 'payée' : o.paymentStatus === 'UNPAID' ? 'à encaisser' : o.paymentStatus.toLowerCase().replace('_', ' ')}</td>
                <td className="num">{formatPrice(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="filters" style={{ marginTop: 12 }}>
          {page > 1 && <Link className="btn btn--ghost btn--sm" href={link(page - 1)}>Précédent</Link>}
          <span className="small">Page {page} / {pages}</span>
          {page < pages && <Link className="btn btn--ghost btn--sm" href={link(page + 1)}>Suivant</Link>}
        </div>
      )}
    </>
  );
}
