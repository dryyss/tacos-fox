import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth, auth0Enabled } from '@/auth';
import { Icon } from '@/components/Icons';
import { Auth0Button, authErrorMessage } from './Auth0Button';
import { LoginForm } from './AuthForms';

export const metadata: Metadata = { title: 'Connexion', robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ retour?: string; erreur?: string; error?: string }> }) {
  const { retour, erreur, error } = await searchParams;
  const message = authErrorMessage(erreur ?? error);
  if ((await auth())?.user) redirect(retour?.startsWith('/') ? retour : '/compte');
  return (
    <div className="page auth-box">
      <h1 className="page-title">Connexion</h1>
      <p className="page-sub">Retrouvez vos commandes, vos adresses et recommandez en un clic.</p>
      {message && <p className="alert alert--error" style={{ marginTop: 0, marginBottom: 14 }}><Icon name="close" />{message}</p>}
      {auth0Enabled && <Auth0Button retour={retour} />}
      <LoginForm retour={retour} />
    </div>
  );
}
