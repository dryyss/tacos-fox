import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getPublicFeatures } from '@/lib/public-features';
import { AuthCard } from './AuthCard';

export const metadata: Metadata = { title: 'Connexion', robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ retour?: string; erreur?: string; error?: string }> }) {
  const { retour, erreur, error } = await searchParams;
  const { customerAccount } = await getPublicFeatures();
  const fallback = customerAccount ? '/compte' : '/admin';
  if ((await auth())?.user) redirect(retour?.startsWith('/') && !retour.startsWith('//') ? retour : fallback);
  return <AuthCard mode="login" retour={retour ?? fallback} error={erreur ?? error} staffOnly={!customerAccount} />;
}
