import type { Metadata } from 'next';
import { getSettings, getZones } from '@/lib/catalog';
import { formatPrice } from '@/lib/money';
import { orTodo } from '../todo';

export const metadata: Metadata = { title: 'Conditions générales de vente' };
export const dynamic = 'force-dynamic';

export default async function TermsPage() {
  const [s, zones] = await Promise.all([getSettings(), getZones()]);
  return (
    <article className="page legal">
      <h1>Conditions générales de vente</h1>
      <p>Les présentes conditions s&apos;appliquent aux commandes passées sur ce site auprès de {orTodo(s.legalName, 'raison sociale')} ({s.name}), {orTodo(s.addressLine1, 'adresse')}, {s.postalCode} {s.city}, SIRET {orTodo(s.siret, 'SIRET')}.</p>

      <h2>1. Commande</h2>
      <p>Le client compose sa commande sur le site, choisit le mode (sur place, à emporter ou livraison) et un créneau, puis valide. La commande est confirmée par l&apos;affichage d&apos;un numéro et par e-mail. Le restaurant peut refuser ou annuler une commande en cas de rupture, d&apos;adresse hors zone ou d&apos;anomalie ; le client est alors prévenu et remboursé intégralement.</p>

      <h2>2. Prix</h2>
      <p>Les prix sont indiqués en euros toutes taxes comprises. Le prix facturé est celui affiché au moment de la validation, recalculé par le site. Aucun frais de service n&apos;est ajouté. Les offres (« 1 pizza achetée = 1 offerte », codes promo) s&apos;appliquent selon les conditions affichées et ne sont pas cumulables sauf mention contraire.</p>

      <h2>3. Paiement</h2>
      <p>Le paiement s&apos;effectue en ligne par carte bancaire via notre prestataire sécurisé Stripe (3-D Secure), ou au restaurant pour les commandes sur place et à emporter lorsque cette option est proposée. Aucune donnée bancaire n&apos;est conservée par le restaurant.</p>

      <h2>4. Livraison</h2>
      <p>La livraison est assurée dans les communes suivantes : {zones.map(z => z.city).join(', ') || 'aucune pour le moment'}.</p>
      {zones.length > 0 && (
        <table>
          <thead><tr><th>Commune</th><th>Frais</th><th>Offerte dès</th><th>Minimum</th></tr></thead>
          <tbody>{zones.map(z => <tr key={z.id}><td>{z.city}</td><td>{formatPrice(z.fee)}</td><td>{z.freeFrom != null ? formatPrice(z.freeFrom) : '-'}</td><td>{z.minimum ? formatPrice(z.minimum) : '-'}</td></tr>)}</tbody>
        </table>
      )}
      <p>Les délais indiqués sont estimatifs. Le client doit être joignable au numéro fourni.</p>

      <h2>5. Droit de rétractation</h2>
      <p>Conformément à l&apos;article L221-28 du Code de la consommation, le droit de rétractation ne s&apos;applique pas aux denrées alimentaires susceptibles de se détériorer rapidement ni aux prestations de restauration fournies à une date déterminée.</p>

      <h2>6. Réclamations</h2>
      <p>Pour toute réclamation (produit manquant, erreur, qualité), contactez le restaurant au {orTodo(s.phone, 'téléphone')}{s.email ? ` ou à ${s.email}` : ''}, de préférence le jour même. Un remboursement total ou partiel peut être accordé.</p>

      <h2>7. Allergènes</h2>
      <p>La liste des allergènes est disponible sur la <a className="link" href="/allergenes">page Allergènes</a> et sur demande au restaurant. Nos produits sont préparés dans une cuisine qui manipule l&apos;ensemble des allergènes.</p>

      <h2>8. Médiation et droit applicable</h2>
      <p>En cas de litige, le client peut recourir gratuitement à un médiateur de la consommation : {orTodo('', 'médiateur de la consommation')}. Les présentes conditions sont soumises au droit français.</p>
    </article>
  );
}
