import NextAuth, { type DefaultSession } from 'next-auth';
import Auth0 from 'next-auth/providers/auth0';
import type { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ROLES_CLAIM, roleFromClaim } from '@/lib/roles';

declare module 'next-auth' {
  interface Session {
    user: { id: string; role: Role } & DefaultSession['user'];
  }
  interface User {
    role?: Role;
  }
}

/* Toute l'authentification passe par Auth0 ; les rôles viennent d'Auth0 (voir lib/roles.ts) */

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: '/connexion', error: '/connexion' },
  providers: [Auth0],
  callbacks: {
    /* Une identité Auth0 déjà liée passe toujours. Rattacher une NOUVELLE identité à un compte existant
       exige un e-mail vérifié par Auth0, sinon n'importe qui pourrait prendre le compte d'un autre. */
    async signIn({ account, profile }) {
      if (account?.provider !== 'auth0') return false;
      const email = typeof profile?.email === 'string' ? profile.email.trim().toLowerCase() : '';
      if (!email) return '/connexion?erreur=email';
      const linked = await prisma.account.findUnique({ where: { provider_providerAccountId: { provider: 'auth0', providerAccountId: account.providerAccountId } }, select: { userId: true } });
      if (linked) return true;
      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (existing && profile?.email_verified !== true) return '/connexion?erreur=verification';
      return true;
    },
    async jwt({ token, account, profile, trigger }) {
      if (account?.provider === 'auth0' && profile) {
        const email = String(profile.email ?? '').trim().toLowerCase();
        const verified = profile.email_verified === true;
        const role = roleFromClaim(profile[ROLES_CLAIM]);
        const name = typeof profile.given_name === 'string' ? profile.given_name : typeof profile.name === 'string' && !profile.name.includes('@') ? profile.name : null;
        const key = { provider: 'auth0', providerAccountId: account.providerAccountId };
        const linked = await prisma.account.findUnique({ where: { provider_providerAccountId: key }, select: { userId: true } });
        // Auth0 fait foi pour le rôle : recopié à chaque connexion, retrait de rôle compris
        const data = { role, ...(verified ? { emailVerified: new Date() } : {}) };
        const select = { id: true, name: true, role: true } as const;
        const dbUser = linked
          ? await prisma.user.update({ where: { id: linked.userId }, data, select })
          : await prisma.user.upsert({ where: { email }, create: { email, name, ...data }, update: data, select });
        if (!linked) await prisma.account.create({ data: { ...key, userId: dbUser.id, type: 'oidc' } });
        token.sub = dbUser.id;
        token.name = dbUser.name ?? name;
        token.role = dbUser.role;
      } else if (trigger === 'update' && token.sub) {
        const fresh = await prisma.user.findUnique({ where: { id: token.sub }, select: { name: true } });
        if (fresh) token.name = fresh.name;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = (token.role as Role) ?? 'CUSTOMER';
      return session;
    },
  },
});

export const isStaff = (role?: Role) => role === 'STAFF' || role === 'ADMIN';
