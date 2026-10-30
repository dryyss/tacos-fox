import type { Metadata } from 'next';
import Link from 'next/link';
import { logout } from '../connexion/actions';

export const metadata: Metadata = { title: 'Accès réservé', robots: { index: false } };

/* Connecté, mais sans rôle d'équipe : pas d'espace client en formule Essentiel */
export default function AccessReservedPage() {
  return (
    <div className="page auth-box">
      <div className="auth-card">
        <div className="auth-card__head">
          <h1 className="page-title">Accès réservé</h1>
          <p className="page-sub">Cet espace est réservé à l&apos;équipe Tacos Fox. Si vous travaillez dans un restaurant, demandez au gérant de vous donner un accès.</p>
        </div>
        <Link className="btn btn--primary btn--block" href="/carte">Voir la carte</Link>
        <form action={logout} style={{ marginTop: 10 }}><button className="btn btn--ghost btn--block" type="submit">Se déconnecter</button></form>
      </div>
    </div>
  );
}
