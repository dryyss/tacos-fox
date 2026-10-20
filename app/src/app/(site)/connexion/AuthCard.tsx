import { Icon } from '@/components/Icons';
import { loginWithAuth0, signupWithAuth0 } from './actions';

const ERRORS: Record<string, string> = {
  verification: 'Un compte existe déjà avec cet e-mail. Validez d\'abord votre adresse avec le lien reçu par e-mail, puis reconnectez-vous.',
  email: 'Le service de connexion n\'a pas transmis d\'adresse e-mail. Essayez une autre méthode.',
  AccessDenied: 'Connexion refusée.',
  OAuthCallbackError: 'La connexion a été interrompue. Réessayez.',
  Configuration: 'La connexion est momentanément indisponible. Réessayez dans un instant.',
};

/* Carte de connexion / inscription : tout passe par Auth0 (e-mail, Google, Apple, Microsoft) */
export function AuthCard({ mode, retour, error }: { mode: 'login' | 'signup'; retour?: string; error?: string }) {
  const message = error ? ERRORS[error] ?? 'La connexion n\'a pas abouti. Réessayez.' : null;
  const primary = mode === 'login' ? { action: loginWithAuth0, label: 'Se connecter' } : { action: signupWithAuth0, label: 'Créer mon compte' };
  const secondary = mode === 'login' ? { action: signupWithAuth0, label: 'Créer un compte', hint: 'Première commande ?' } : { action: loginWithAuth0, label: 'Se connecter', hint: 'Déjà client ?' };

  return (
    <div className="page auth-box">
      <div className="auth-card">
        <div className="auth-card__head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={56} height={70} />
          <h1 className="page-title">{mode === 'login' ? 'Connexion' : 'Créer un compte'}</h1>
          <p className="page-sub">{mode === 'login' ? 'Retrouvez vos commandes, vos adresses et recommandez en un clic.' : 'Suivez vos commandes, enregistrez vos adresses et recommandez en un clic.'}</p>
        </div>

        {message && <p className="alert alert--error" style={{ marginTop: 0, marginBottom: 14 }}><Icon name="close" />{message}</p>}

        <form action={primary.action}>
          <input type="hidden" name="retour" value={retour ?? '/compte'} />
          <button className="btn btn--primary btn--xl btn--block" type="submit">{primary.label}</button>
        </form>
        <p className="auth-card__methods">E-mail, Google, Apple ou Microsoft</p>

        <div className="auth-card__sep"><span>{secondary.hint}</span></div>
        <form action={secondary.action}>
          <input type="hidden" name="retour" value={retour ?? '/compte'} />
          <button className="btn btn--ghost btn--block" type="submit">{secondary.label}</button>
        </form>

        <ul className="auth-card__perks">
          <li><Icon name="check" />Suivi de commande en direct</li>
          <li><Icon name="redo" />Recommander en un clic</li>
          <li><Icon name="lock" />Connexion sécurisée, aucun mot de passe stocké chez nous</li>
        </ul>
      </div>
      <p className="small muted" style={{ textAlign: 'center', marginTop: 14 }}>Pas besoin de compte pour commander : vous pouvez aussi commander en invité.</p>
    </div>
  );
}
