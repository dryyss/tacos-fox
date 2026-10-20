'use client';

import { createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Auth0Provider, type AppState } from '@auth0/auth0-react';
import { AUTH0_CLIENT_ID, AUTH0_DOMAIN } from '@/lib/auth0';

const OriginContext = createContext<string>('https://tacos-fox.vercel.app');

export function useAuth0Origin() {
  return useContext(OriginContext);
}

/* Fourni côté client uniquement. L'origine vient du serveur : aucun accès à window au rendu. */
export function Auth0ClientProvider({ origin, children }: { origin: string; children: React.ReactNode }) {
  const router = useRouter();

  const onRedirectCallback = (appState?: AppState) => {
    const returnTo = appState?.returnTo;
    const target = typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/connexion';
    router.replace(target);
  };

  return (
    <OriginContext.Provider value={origin}>
      <Auth0Provider
        domain={AUTH0_DOMAIN}
        clientId={AUTH0_CLIENT_ID}
        authorizationParams={{ redirect_uri: origin }}
        onRedirectCallback={onRedirectCallback}
      >
        {children}
      </Auth0Provider>
    </OriginContext.Provider>
  );
}
