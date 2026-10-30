import type { Metadata } from 'next';
import { getSettings } from '@/lib/catalog';
import { publicFeatures } from '@/lib/features';
import { orTodo } from '../todo';

export const metadata: Metadata = { title: 'Politique de confidentialité' };
export const dynamic = 'force-dynamic';

export default async function PrivacyPage() {
  const s = await getSettings();
  const f = publicFeatures(s.enabledOptions);
  return (
    <article className="page legal">
      <h1>Politique de confidentialité</h1>
      <p>Responsable du traitement : {orTodo(s.legalName, 'raison sociale')} ({s.name}), {orTodo(s.addressLine1, 'adresse')}, {s.postalCode} {s.city}.</p>

      <h2>Données collectées et finalités</h2>
      <table>
        <thead><tr><th>Données</th><th>Pourquoi</th><th>Base légale</th><th>Durée</th></tr></thead>
        <tbody>
          <tr><td>Prénom, téléphone, e-mail{f.delivery ? ', adresse de livraison' : ''}, restaurant choisi, contenu de la commande</td><td>Préparer{f.delivery ? ', livrer' : ''} et suivre la commande, envoyer la confirmation et la facture</td><td>Exécution du contrat</td><td>3 ans après la dernière commande</td></tr>
          <tr><td>Factures et données comptables</td><td>Obligations comptables et fiscales</td><td>Obligation légale</td><td>10 ans</td></tr>
          {f.customerAccount && <tr><td>Compte client (e-mail, adresses, favoris)</td><td>Historique, recommande rapide</td><td>Exécution du contrat</td><td>Jusqu&apos;à suppression du compte, ou 3 ans d&apos;inactivité</td></tr>}
          {f.customerAccount && <tr><td>Consentement aux offres</td><td>Envoi des offres et nouveautés</td><td>Consentement</td><td>Jusqu&apos;au retrait du consentement</td></tr>}
          <tr><td>Comptes de l&apos;équipe (e-mail, restaurant)</td><td>Accès à l&apos;écran cuisine et à la gestion</td><td>Intérêt légitime</td><td>Jusqu&apos;au départ de la personne</td></tr>
        </tbody>
      </table>

      <h2>Destinataires</h2>
      <p>Les données sont accessibles uniquement à l&apos;équipe du restaurant et à ses prestataires techniques, tous situés dans l&apos;Union européenne ou encadrés par des garanties appropriées : Vercel (hébergement, région Europe), Neon (base de données, Francfort), Stripe (paiement), Resend (e-mails de commande), Auth0 (connexion de l&apos;équipe). Aucune donnée n&apos;est vendue.</p>

      <h2>Paiement</h2>
      <p>Les données bancaires sont saisies directement chez Stripe, certifié PCI-DSS. Le restaurant n&apos;y a jamais accès.</p>

      <h2>Cookies</h2>
      <p>Le site n&apos;utilise que des cookies strictement nécessaires (connexion de l&apos;équipe Tacos Fox) et le stockage local de votre navigateur pour conserver votre panier. Aucun cookie publicitaire ni de mesure d&apos;audience n&apos;est déposé : aucun consentement n&apos;est donc requis.</p>

      <h2>Vos droits</h2>
      <p>Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de limitation, d&apos;opposition et de portabilité. Écrivez à {orTodo(s.email, 'e-mail de contact')} ou au restaurant. Vous pouvez aussi saisir la CNIL (www.cnil.fr).</p>
    </article>
  );
}
