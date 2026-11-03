import { requireStaffPage } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { refreshAccount } from '@/lib/connect';
import { stripeEnabled, stripeTestMode } from '@/lib/stripe';
import { refresh, share, startOnboarding, unlink } from './actions';

export const metadata = { title: 'Paiements' };

/* R5 : chaque restaurant encaisse sur le compte Stripe de sa société (Stripe Connect, comptes Standard) */
export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ retour?: string }> }) {
  await requireStaffPage('payments');
  const { retour } = await searchParams;
  if (retour && stripeEnabled()) await refreshAccount(retour).catch(e => console.error('Statut Stripe :', e));
  const restaurants = await prisma.restaurant.findMany({ orderBy: { sortOrder: 'asc' } });

  return (
    <>
      <h1 className="admin-title">Paiements</h1>
      <p className="admin-sub">
        Réservé à MAGAR Développement. Chaque société ouvre son propre compte Stripe, en sa présence (pièce d&apos;identité du dirigeant, Kbis, RIB, téléphone, environ 30 minutes).
        Les paiements de ses clients y arrivent directement, frais Stripe à sa charge, sans commission. Une société qui exploite plusieurs restaurants peut n&apos;avoir qu&apos;un compte.
      </p>
      {!stripeEnabled() && <p className="pill">Clé Stripe absente : paiement simulé en développement.</p>}
      {stripeTestMode() && <p className="admin-sub"><b>Mode test.</b> Tant qu&apos;un restaurant n&apos;a pas de compte actif, ses paiements d&apos;essai passent par le compte de test de la plateforme. En production, sa commande en ligne reste fermée jusqu&apos;à l&apos;activation de son compte.</p>}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Restaurant</th><th>Société</th><th>Compte Stripe</th><th>État</th><th>Actions</th></tr></thead>
          <tbody>
            {restaurants.map(r => (
              <tr key={r.id}>
                <td><b>{r.name} {r.city}</b><br /><small>{r.addressLine1}</small></td>
                <td>{r.legalName || <i>à renseigner</i>}{r.siren && <><br /><small>SIREN {r.siren}</small></>}</td>
                <td><code>{r.stripeAccountId ?? '-'}</code></td>
                <td>{r.stripeChargesEnabled ? <span className="pill pill--green">Actif</span> : r.stripeAccountId ? <span className="pill">Ouverture en cours</span> : <span className="pill">Aucun compte</span>}</td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {stripeEnabled() && !r.stripeChargesEnabled && (
                      <form action={startOnboarding}><input type="hidden" name="restaurantId" value={r.id} /><button className="btn btn--primary btn--sm">{r.stripeAccountId ? 'Continuer l\'ouverture' : 'Ouvrir le compte'}</button></form>
                    )}
                    {stripeEnabled() && r.stripeAccountId && (
                      <form action={refresh}><input type="hidden" name="restaurantId" value={r.id} /><button className="btn btn--light btn--sm">Actualiser</button></form>
                    )}
                    {!r.stripeAccountId && restaurants.some(o => o.id !== r.id && o.stripeAccountId) && (
                      <form action={share} style={{ display: 'flex', gap: 6 }}>
                        <input type="hidden" name="restaurantId" value={r.id} />
                        <select name="fromId" aria-label="Même compte que" defaultValue="">
                          <option value="" disabled>Même société que…</option>
                          {restaurants.filter(o => o.id !== r.id && o.stripeAccountId).map(o => <option key={o.id} value={o.id}>{o.name} {o.city} ({o.legalName || o.addressLine1})</option>)}
                        </select>
                        <button className="btn btn--light btn--sm">Partager</button>
                      </form>
                    )}
                    {r.stripeAccountId && (
                      <form action={unlink}><input type="hidden" name="restaurantId" value={r.id} /><button className="btn btn--light btn--sm">Délier</button></form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="admin-title" style={{ fontSize: '1.2rem', marginTop: 28 }}>Mise en place (une fois)</h2>
      <ol className="admin-sub">
        <li>Compte plateforme : compte Stripe de Tacos Fox, avec Connect activé. Ses clés vont dans <code>STRIPE_SECRET_KEY</code>.</li>
        <li>Webhook du compte plateforme vers <code>/api/stripe/webhook</code> : secret dans <code>STRIPE_WEBHOOK_SECRET</code>.</li>
        <li>Webhook « comptes connectés » vers la même adresse (événements checkout.session.*, charge.refunded, account.updated) : secret dans <code>STRIPE_CONNECT_WEBHOOK_SECRET</code>.</li>
      </ol>
    </>
  );
}
