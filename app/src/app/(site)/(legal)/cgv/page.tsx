import type { Metadata } from 'next';
import { getSettings, getZones } from '@/lib/catalog';
import { formatPrice } from '@/lib/money';
import { publicFeatures } from '@/lib/features';
import { availableModes } from '@/lib/restaurants';
import { MODE_LABELS } from '@/lib/format';
import { orTodo } from '../todo';
import { Companies } from '../Companies';

export const metadata: Metadata = { title: 'Conditions générales de vente' };
export const dynamic = 'force-dynamic';

/* Les CGV ne décrivent que ce que le site propose réellement (formule et options achetées) */
export default async function TermsPage() {
  const [s, zones, modes] = await Promise.all([getSettings(), getZones(), availableModes()]);
  const f = publicFeatures(s.enabledOptions);
  let n = 0;
  const h = (title: string) => <h2>{++n}. {title}</h2>;
  const modeList = modes.map(m => MODE_LABELS[m].toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' ou $1');

  return (
    <article className="page legal">
      <h1>Conditions générales de vente</h1>
      <p>Les présentes conditions s&apos;appliquent aux commandes passées sur ce site auprès des restaurants Tacos Fox. Le vendeur est la société qui exploite le restaurant choisi lors de la commande ; ses coordonnées figurent sur la confirmation et la facture. Les vendeurs sont :</p>
      <Companies />

      {h('Commande')}
      <p>Le client choisit son restaurant, compose sa commande sur le site, choisit le mode ({modeList}) et un créneau de retrait, puis valide. La commande est confirmée par l&apos;affichage d&apos;un numéro et par e-mail. Le restaurant peut refuser ou annuler une commande en cas de rupture ou d&apos;anomalie ; le client est alors prévenu et remboursé intégralement.</p>

      {h('Prix')}
      <p>Les prix sont indiqués en euros toutes taxes comprises. Le prix facturé est celui affiché au moment de la validation, recalculé par le site. Aucun frais de service n&apos;est ajouté. Les offres (« 1 pizza achetée = 1 offerte »{f.promoCodes ? ', codes promo' : ''}) s&apos;appliquent selon les conditions affichées et ne sont pas cumulables sauf mention contraire.</p>

      {h('Paiement')}
      <p>Le paiement s&apos;effectue en ligne par carte bancaire via notre prestataire sécurisé Stripe (3-D Secure). Le montant est encaissé par le restaurant qui prépare la commande. Aucune donnée bancaire n&apos;est conservée par le restaurant ni par le site.</p>

      {f.delivery && zones.length > 0 && (
        <>
          {h('Livraison')}
          <p>La livraison est assurée dans les communes suivantes : {zones.map(z => z.city).join(', ')}.</p>
          <table>
            <thead><tr><th>Commune</th><th>Frais</th><th>Offerte dès</th><th>Minimum</th></tr></thead>
            <tbody>{zones.map(z => <tr key={z.id}><td>{z.city}</td><td>{formatPrice(z.fee)}</td><td>{z.freeFrom != null ? formatPrice(z.freeFrom) : '-'}</td><td>{z.minimum ? formatPrice(z.minimum) : '-'}</td></tr>)}</tbody>
          </table>
          <p>Les délais indiqués sont estimatifs. Le client doit être joignable au numéro fourni.</p>
        </>
      )}

      {h('Retrait')}
      <p>La commande est à retirer au comptoir du restaurant choisi, au créneau indiqué. Les délais de préparation sont estimatifs ; le client est invité à présenter son numéro de commande.</p>

      {h('Droit de rétractation')}
      <p>Conformément à l&apos;article L221-28 du Code de la consommation, le droit de rétractation ne s&apos;applique pas aux denrées alimentaires susceptibles de se détériorer rapidement ni aux prestations de restauration fournies à une date déterminée.</p>

      {h('Réclamations')}
      <p>Pour toute réclamation (produit manquant, erreur, qualité), contactez le restaurant concerné, de préférence le jour même{s.phone ? ` (${s.phone})` : ''}{s.email ? ` ou écrivez à ${s.email}` : ''}. Un remboursement total ou partiel peut être accordé.</p>

      {h('Allergènes')}
      <p>La liste des allergènes est disponible sur la <a className="link" href="/allergenes">page Allergènes</a> et sur demande au restaurant. Nos produits sont préparés dans une cuisine qui manipule l&apos;ensemble des allergènes.</p>

      {h('Médiation et droit applicable')}
      <p>En cas de litige, le client peut recourir gratuitement à un médiateur de la consommation : {orTodo('', 'médiateur de la consommation')}. Les présentes conditions sont soumises au droit français.</p>
    </article>
  );
}
