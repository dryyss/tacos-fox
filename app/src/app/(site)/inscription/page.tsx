import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth, auth0Enabled } from '@/auth';
import { Icon } from '@/components/Icons';
import { Auth0Button, authErrorMessage } from '../connexion/Auth0Button';
import { RegisterForm } from '../connexion/AuthForms';

export const metadata: Metadata = { title: 'Créer un compte', robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ retour?: string; erreur?: string; error?: string }> }) {
  const { retour, erreur, error } = await searchParams;
  const message = authErrorMessage(erreur ?? error);
  if ((await auth())?.user) redirect('/compte');
  return (
    <div className="page auth-box">
      <h1 className="page-title">Créer un compte</h1>
      <p className="page-sub">Suivez vos commandes, enregistrez vos adresses et recommandez en un clic.</p>
      {message && <p className="alert alert--error" style={{ marginTop: 0, marginBottom: 14 }}><Icon name="close" />{message}</p>}
      {auth0Enabled && <Auth0Button retour={retour} label="Inscription rapide" />}
      <RegisterForm retour={retour} />
    </div>
  );
}
