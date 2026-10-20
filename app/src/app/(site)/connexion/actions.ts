'use server';

import { AuthError } from 'next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { signIn, signOut } from '@/auth';
import { prisma } from '@/lib/prisma';

export interface FormState { error?: string; fields?: Record<string, string> }

/* N'accepte que les chemins internes, pour éviter toute redirection vers un autre site */
const safeReturn = (v: FormDataEntryValue | null) => {
  const s = typeof v === 'string' ? v : '';
  return s.startsWith('/') && !s.startsWith('//') ? s : '/compte';
};

export async function login(_: FormState, form: FormData): Promise<FormState> {
  try {
    await signIn('credentials', { email: form.get('email'), password: form.get('password'), redirectTo: safeReturn(form.get('retour')) });
    return {};
  } catch (e) {
    if (e instanceof AuthError) return { error: 'E-mail ou mot de passe incorrect.', fields: { email: String(form.get('email') ?? '') } };
    throw e; // la redirection de succès passe par une exception
  }
}

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Indiquez votre prénom').max(80),
  email: z.string().trim().toLowerCase().email('E-mail invalide').max(160),
  phone: z.string().transform(s => s.replace(/[\s.\-]/g, '')).pipe(z.string().regex(/^((\+33|0)[1-9](\d{2}){4})?$/, 'Numéro de téléphone invalide')),
  password: z.string().min(8, 'Mot de passe : 8 caractères minimum').max(200),
  marketing: z.literal('on').optional(),
});

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const raw = Object.fromEntries(form);
  const fields = { name: String(raw.name ?? ''), email: String(raw.email ?? ''), phone: String(raw.phone ?? '') };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const { name, email, phone, password, marketing } = parsed.data;

  if (await prisma.user.findUnique({ where: { email } })) return { error: 'Un compte existe déjà avec cet e-mail. Connectez-vous.', fields };
  // Les commandes passées en invité ne sont pas rattachées : l'e-mail n'est pas encore vérifié
  await prisma.user.create({ data: { name, email, phone: phone || null, marketingOptIn: marketing === 'on', passwordHash: await bcrypt.hash(password, 12) } });

  await signIn('credentials', { email, password, redirectTo: safeReturn(form.get('retour')) });
  return {};
}

export async function logout() {
  await signOut({ redirectTo: '/' });
}
