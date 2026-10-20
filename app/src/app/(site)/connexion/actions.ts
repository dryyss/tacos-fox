'use server';

import { redirect } from 'next/navigation';
import { signIn, signOut } from '@/auth';
import { appUrl } from '@/lib/url';

/* N'accepte que les chemins internes, pour éviter toute redirection vers un autre site */
const safeReturn = (v: FormDataEntryValue | null) => {
  const s = typeof v === 'string' ? v : '';
  return s.startsWith('/') && !s.startsWith('//') ? s : '/compte';
};

/* Toute l'authentification passe par Auth0 (e-mail, Google, Apple, Microsoft) */
export async function loginWithAuth0(form: FormData) {
  await signIn('auth0', { redirectTo: safeReturn(form.get('retour')) });
}

export async function signupWithAuth0(form: FormData) {
  await signIn('auth0', { redirectTo: safeReturn(form.get('retour')) }, { screen_hint: 'signup' });
}

/* Ferme la session du site puis celle d'Auth0, sinon le prochain clic reconnecterait sans rien demander */
export async function logout() {
  await signOut({ redirect: false });
  const issuer = process.env.AUTH_AUTH0_ISSUER?.replace(/\/$/, '');
  const clientId = process.env.AUTH_AUTH0_ID;
  if (!issuer || !clientId) redirect('/');
  redirect(`${issuer}/v2/logout?client_id=${encodeURIComponent(clientId)}&returnTo=${encodeURIComponent(appUrl())}`);
}
