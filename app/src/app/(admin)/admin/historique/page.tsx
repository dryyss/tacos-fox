import { requireStaffPage, restaurantScope, scopeWhere } from '@/lib/admin';
import Link from 'next/link';
import type { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { formatPrice } from '@/lib/money';
import { MODE_LABELS, orderNumberLabel, paymentLabel, STATUS_LABELS } from '@/lib/format';
import { parisDayRange } from '@/lib/accounting';

export const metadata = { title: 'Historique' };

const PAGE = 50;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/* R6 : commandes et factures par restaurant, recherche par date ou numéro. Le gérant voit les 5 restaurants. */
export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ q?: string; statut?: string; page?: string; r?: string; du?: string; au?: string }> }) {
  const user = await requireStaffPage('history');
  const scope = await restaurantScope(user);
  const restaurants = await prisma.restaurant.findMany({ where: scope ? { id: { in: scope } } : {}, orderBy: { sortOrder: 'asc' }, select: { id: true, slug: true, name: true, city: true, addressLine1: true } });
  const sp = await searchParams;
  const q = sp.q?.trim() ?? '';
  const page = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1);
  const status = sp.statut && sp.statut in STATUS_LABELS ? (sp.statut as OrderStatus) : undefined;
  const restaurant = restaurants.find(r => r.slug === sp.r);
  const from = sp.du && DAY.test(sp.du) ? sp.du : '';
  const to = sp.au && DAY.test(sp.au) ? sp.au : '';

  const num = Number.parseInt(q.replace(/^TF-?/i, ''), 10);
  const where: Prisma.OrderWhereInput = {
    AND: [
      scopeWhere(scope),
      restaurant ? { restaurantId: restaurant.id } : {},
      status ? { status } : { status: { not: 'PENDING_PAYMENT' } },
      from ? { createdAt: { gte: parisDayRange(from).from } } : {},
      to ? { createdAt: { lt: parisDayRange(to).to } } : {},
      q ? {
        OR: [
          ...(Number.isFinite(num) ? [{ number: num }] : []),
          { customerName: { contains: q, mode: 'insensitive' } },
          { customerPhone: { contains: q.replace(/\s/g, '') } },
          { customerEmail: { contains: q, mode: 'insensitive' } },
          { invoiceNumber: { contains: q, mode: 'insensitive' } },
        ],
      } : {},
    ],
  };
  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, take: PAGE, skip: (page - 1) * PAGE, include: { restaurant: { select: { city: true, addressLine1: true } } } }),
    prisma.order.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const params = { ...(q ? { q } : {}), ...(status ? { statut: status } : {}), ...(restaurant ? { r: restaurant.slug } : {}), ...(from ? { du: from } : {}), ...(to ? { au: to } : {}) };
  const link = (p: number) => `/admin/historique?${new URLSearchParams({ ...params, page: String(p) })}`;

  return (
    <>
      <h1 className="admin-title">Historique des commandes</h1>
      <form className="filters">
        <input type="search" name="q" defaultValue={q} placeholder="N° de commande ou de facture, nom, téléphone" style={{ minWidth: 260 }} />
        {restaurants.length > 1 && (
          <select name="r" defaultValue={restaurant?.slug ?? ''} aria-label="Restaurant">
            <option value="">Tous les restaurants</option>
            {restaurants.map(r => <option key={r.id} value={r.slug}>{r.city}, {r.addressLine1}</option>)}
          </select>
        )}
        <label className="small">Du <input type="date" name="du" defaultValue={from} /></label>
        <label className="small">au <input type="date" name="au" defaultValue={to} /></label>
        <select name="statut" defaultValue={status ?? ''} aria-label="Statut">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn btn--dark btn--sm">Rechercher</button>
        <span className="small muted">{total} commande{total > 1 ? 's' : ''}</span>
      </form>
      <div className="table-wrap" tabIndex={0}>
        <table className="table">
          <thead><tr><th>N°</th><th>Date</th><th>Restaurant</th><th>Client</th><th>Mode</th><th>Statut</th><th>Paiement</th><th>Facture</th><th className="num">Total</th></tr></thead>
          <tbody>
            {!orders.length && <tr><td colSpan={9} className="muted">Aucune commande.</td></tr>}
            {orders.map(o => (
              <tr key={o.id}>
                <td><Link className="link" href={`/admin/commandes/${o.id}`}>{orderNumberLabel(o.number)}</Link></td>
                <td>{o.createdAt.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}</td>
                <td className="small">{o.restaurant ? `${o.restaurant.city}, ${o.restaurant.addressLine1}` : '-'}</td>
                <td>{o.customerName}<div className="small muted">{o.customerPhone}</div></td>
                <td>{MODE_LABELS[o.mode]}</td>
                <td><span className={`pill ${o.status === 'CANCELLED' ? 'pill--red' : o.status === 'COMPLETED' ? 'pill--green' : 'pill--yellow'}`}>{STATUS_LABELS[o.status]}</span></td>
                <td className="small">{paymentLabel(o)} · {o.paymentStatus === 'PAID' ? 'payée' : o.paymentStatus === 'UNPAID' ? 'à encaisser' : o.paymentStatus.toLowerCase().replace('_', ' ')}</td>
                <td className="small">{o.invoiceNumber ? <a className="link" href={`/api/invoices/${o.trackingToken}`} target="_blank" rel="noopener">{o.invoiceNumber}</a> : '-'}</td>
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
