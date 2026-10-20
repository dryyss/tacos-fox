import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AuthCard } from './AuthCard';

export const metadata: Metadata = { title: 'Connexion', robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ retour?: string; erreur?: string; error?: string }> }) {
  const { retour, erreur, error } = await searchParams;
  if ((await auth())?.user) redirect(retour?.startsWith('/') && !retour.startsWith('//') ? retour : '/compte');
  return <AuthCard mode="login" retour={retour} error={erreur ?? error} />;
}
