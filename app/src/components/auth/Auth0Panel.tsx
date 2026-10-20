'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useAuth0Origin } from './Auth0ClientProvider';

export function Auth0Panel() {
  const origin = useAuth0Origin();
  const {
    isLoading,
    isAuthenticated,
    error,
    user,
    loginWithRedirect: login,
    logout: auth0Logout,
  } = useAuth0();

  const signup = () => login({ appState: { returnTo: '/connexion' }, authorizationParams: { screen_hint: 'signup' } });
  const logout = () => auth0Logout({ logoutParams: { returnTo: origin } });

  if (isLoading) return <p className="small muted">Connexion Auth0…</p>;

  if (isAuthenticated) {
    return (
      <section className="panel" style={{ marginBottom: 16 }}>
        <p>Connecté en tant que {user?.email}</p>
        <h2 className="page-title" style={{ fontSize: '1.6rem', margin: '8px 0' }}>Profil</h2>
        <pre style={{ overflow: 'auto', fontSize: '.8rem', background: 'var(--grey)', padding: 12, borderRadius: 8 }}>{JSON.stringify(user, null, 2)}</pre>
        <button className="btn btn--dark btn--block" type="button" onClick={logout}>Se déconnecter</button>
      </section>
    );
  }

  return (
    <section className="panel" style={{ marginBottom: 16 }}>
      {error && <p className="alert alert--error" style={{ marginTop: 0 }}>{error.message}</p>}
      <button className="btn btn--primary btn--block" type="button" onClick={signup}>Créer un compte</button>
      <button className="btn btn--light btn--block" type="button" style={{ marginTop: 8 }} onClick={() => login({ appState: { returnTo: '/connexion' } })}>Se connecter avec Auth0</button>
    </section>
  );
}
