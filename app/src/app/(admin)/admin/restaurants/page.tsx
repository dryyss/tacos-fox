import Link from 'next/link';
import { requireStaffPage } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export const metadata = { title: 'Restaurants' };

export default async function RestaurantsAdminPage() {
  await requireStaffPage('settings');
  const restaurants = await prisma.restaurant.findMany({ orderBy: { sortOrder: 'asc' }, include: { _count: { select: { overrides: true } } } });
  return (
    <>
      <h1 className="admin-title">Restaurants</h1>
      <p className="admin-sub">Coordonnées, horaires, délai de préparation, société qui encaisse, et carte propre à chaque restaurant (ruptures, carte spécifique du 5e). Sans l&apos;option O1, ces changements sont faits par MAGAR Développement sur simple message.</p>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Restaurant</th><th>Société</th><th>Téléphone</th><th>Délai</th><th>Commande en ligne</th><th>Paiement</th><th>Ajustements de carte</th></tr></thead>
          <tbody>
            {restaurants.map(r => (
              <tr key={r.id}>
                <td><Link className="link" href={`/admin/restaurants/${r.id}`}><b>{r.name} {r.city}</b></Link><br /><small>{r.addressLine1}</small></td>
                <td>{r.legalName || <i>à renseigner</i>}</td>
                <td>{r.phone || <i>à renseigner</i>}</td>
                <td>{r.prepMinutes} min</td>
                <td>{r.isActive && r.orderingEnabled ? <span className="pill pill--green">Ouverte</span> : <span className="pill pill--red">Fermée</span>}</td>
                <td>{r.stripeChargesEnabled ? <span className="pill pill--green">Compte actif</span> : <span className="pill">À ouvrir</span>}</td>
                <td>{r._count.overrides}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
