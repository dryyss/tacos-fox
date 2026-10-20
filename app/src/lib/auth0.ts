/* Auth0 SPA : le domaine et l'identifiant client sont publics.
   Les origines autorisées doivent être recopiées dans le tableau de bord Auth0
   (Callback URL, Logout URL, Web Origins). */

export const AUTH0_DOMAIN = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dev-yswlyfc44okgxe10.us.auth0.com';
export const AUTH0_CLIENT_ID = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || 't9FyFHXc7OgYX1yGpkJcQLDVOqrQL5hU';

export const AUTH0_ORIGINS = ['http://localhost:3000', 'https://tacos-fox.vercel.app'] as const;

export function auth0RedirectOrigin(headerList: { get(name: string): string | null }): string {
  const host = (headerList.get('x-forwarded-host') ?? headerList.get('host') ?? 'localhost:3000').split(',')[0].trim();
  const proto = (headerList.get('x-forwarded-proto') ?? (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')).split(',')[0].trim();
  const candidate = `${proto}://${host}`.replace(/\/$/, '');
  return (AUTH0_ORIGINS as readonly string[]).includes(candidate) ? candidate : AUTH0_ORIGINS[1];
}
