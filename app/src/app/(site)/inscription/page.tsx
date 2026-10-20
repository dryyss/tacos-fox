import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AuthCard } from '../connexion/AuthCard';

export const metadata: Metadata = { title: 'Créer un compte', robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ retour?: string; erreur?: string; error?: string }> }) {
  const { retour, erreur, error } = await searchParams;
  if ((await auth())?.user) redirect('/compte');
  return <AuthCard mode="signup" retour={retour} error={erreur ?? error} />;
}
