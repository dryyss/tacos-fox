import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Auth0 from 'next-auth/providers/auth0';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';

declare module 'next-auth' {
  interface Session {
    user: { id: string; role: Role } & DefaultSession['user'];
  }
  interface User {
    role?: Role;
  }
}

/* Auth0 (Google, Apple, Microsoft, e-mail) actif seulement si ses variables sont définies */
export const auth0Enabled = !!(process.env.AUTH_AUTH0_ID && process.env.AUTH_AUTH0_SECRET && process.env.AUTH_AUTH0_ISSUER);

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: '/connexion' },
  providers: [
    ...(auth0Enabled ? [Auth0({ authorization: { params: { prompt: 'login' } } })] : []),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    /* Connexion Auth0 : rattache ou crée le compte du site à partir de l'e-mail.
       Un compte existant n'est rattaché que si Auth0 garantit l'e-mail (sinon prise de compte possible). */
    async signIn({ account, profile }) {
      if (account?.provider !== 'auth0') return true;
      const email = typeof profile?.email === 'string' ? profile.email.trim().toLowerCase() : '';
      if (!email) return '/connexion?erreur=email';
      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (existing && profile?.email_verified !== true) return '/connexion?erreur=verification';
      return true;
    },
    async jwt({ token, user, trigger, account, profile }) {
      if (account?.provider === 'auth0') {
        const email = String(profile?.email ?? '').trim().toLowerCase();
        const verified = profile?.email_verified === true;
        const name = typeof profile?.given_name === 'string' ? profile.given_name : typeof profile?.name === 'string' && !profile.name.includes('@') ? profile.name : null;
        const dbUser = await prisma.user.upsert({
          where: { email },
          create: { email, name, emailVerified: verified ? new Date() : null },
          update: verified ? { emailVerified: new Date() } : {},
          select: { id: true, name: true, role: true },
        });
        token.sub = dbUser.id;
        token.name = dbUser.name ?? name;
        token.role = dbUser.role;
      } else if (user) {
        token.sub = user.id;
        token.role = user.role;
      } else if (trigger === 'update' && token.sub) {
        const fresh = await prisma.user.findUnique({ where: { id: token.sub }, select: { name: true, role: true } });
        if (fresh) { token.name = fresh.name; token.role = fresh.role; }
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
