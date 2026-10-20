import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { RegisterForm } from '../connexion/AuthForms';

export const metadata: Metadata = { title: 'Créer un compte', robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ retour?: string }> }) {
  const { retour } = await searchParams;
  if ((await auth())?.user) redirect('/compte');
  return (
    <div className="page auth-box">
      <h1 className="page-title">Créer un compte</h1>
      <p className="page-sub">Suivez vos commandes, enregistrez vos adresses et recommandez en un clic.</p>
      <RegisterForm retour={retour} />
    </div>
  );
}
