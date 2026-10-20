import { loginWithAuth0 } from './actions';

const ERRORS: Record<string, string> = {
  verification: 'Un compte existe déjà avec cet e-mail. Validez d\'abord votre e-mail auprès du service de connexion, ou connectez-vous avec votre mot de passe.',
  email: 'Le service de connexion n\'a pas transmis d\'adresse e-mail. Essayez une autre méthode.',
  AccessDenied: 'Connexion refusée.',
  OAuthCallbackError: 'La connexion a été interrompue. Réessayez.',
  Configuration: 'La connexion rapide est momentanément indisponible.',
};

export function authErrorMessage(code?: string) {
  return code ? ERRORS[code] ?? 'La connexion n\'a pas abouti. Réessayez.' : null;
}

/* Bouton « connexion rapide » : formulaire serveur, fonctionne sans JavaScript */
export function Auth0Button({ retour, label = 'Connexion rapide' }: { retour?: string; label?: string }) {
  return (
    <form action={loginWithAuth0} className="panel" style={{ marginTop: 0, marginBottom: 14 }}>
      <input type="hidden" name="retour" value={retour ?? '/compte'} />
      <button className="btn btn--dark btn--block" type="submit">{label}</button>
      <p className="small muted" style={{ marginTop: 10, textAlign: 'center' }}>Avec Google, Apple ou Microsoft. Ou avec votre e-mail ci-dessous.</p>
    </form>
  );
}
