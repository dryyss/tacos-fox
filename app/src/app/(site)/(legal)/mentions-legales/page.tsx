import type { Metadata } from 'next';
import { getSettings } from '@/lib/catalog';
import { appUrl } from '@/lib/url';
import { orTodo } from '../todo';

export const metadata: Metadata = { title: 'Mentions légales' };
export const dynamic = 'force-dynamic';

export default async function LegalNoticePage() {
  const s = await getSettings();
  return (
    <article className="page legal">
      <h1>Mentions légales</h1>
      <h2>Éditeur du site</h2>
      <p>
        {orTodo(s.legalName, 'raison sociale')}, exploitant le restaurant {s.name}<br />
        {orTodo(s.addressLine1, 'adresse')}, {s.postalCode} {s.city}<br />
        SIRET : {orTodo(s.siret, 'SIRET')}{s.vatNumber && <><br />TVA intracommunautaire : {s.vatNumber}</>}<br />
        Téléphone : {orTodo(s.phone, 'téléphone')}{s.email && <><br />E-mail : {s.email}</>}
      </p>
      <p>Directeur de la publication : le gérant de {orTodo(s.legalName, 'raison sociale')}.</p>
      <h2>Hébergement</h2>
      <p>Clever Cloud SAS, 3 rue de l&apos;Allier, 44000 Nantes, France. Données hébergées en Europe.</p>
      <h2>Conception et réalisation</h2>
      <p>MAGAR Développement, Garges-lès-Gonesse (95). SIRET 908 058 092 00028.</p>
      <h2>Propriété intellectuelle</h2>
      <p>Les contenus du site {appUrl().replace(/^https?:\/\//, '')} (textes, photos, logo) appartiennent à {s.name}. Toute reproduction sans autorisation est interdite.</p>
      <h2>Données personnelles</h2>
      <p>Voir notre <a className="link" href="/confidentialite">politique de confidentialité</a>.</p>
    </article>
  );
}
