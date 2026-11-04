import path from 'node:path';
import type { NextConfig } from 'next';

const dev = process.env.NODE_ENV !== 'production';
const auth0 = (process.env.AUTH_AUTH0_ISSUER ?? '').replace(/\/$/, '');

/* En-têtes de sécurité, sur toutes les pages.
   CSP : scripts et styles du site seulement (« unsafe-inline » requis par Next sans nonce),
   plan Google Maps des pages restaurant, redirections vers Auth0 (équipe) et Stripe (paiement). */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
  'frame-src https://www.google.com https://maps.google.com',
  `form-action 'self' https://checkout.stripe.com${auth0 ? ` ${auth0}` : ''}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(dev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(process.cwd()),
  outputFileTracingIncludes: {
    '/api/**': ['./src/lib/invoice-logo.png'],
  },
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'pg'],
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Espace équipe et suivi de commande : jamais en cache partagé
      { source: '/admin/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/suivi/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
};

export default nextConfig;
