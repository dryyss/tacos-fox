import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Auth0Panel } from '@/components/auth/Auth0Panel';
import { LoginForm } from './AuthForms';

export const metadata: Metadata = { title: 'Connexion', robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ retour?: string }> }) {
  const { retour } = await searchParams;
  if ((await auth())?.user) redirect(retour?.startsWith('/') ? retour : '/compte');
  return (
    <div className="page auth-box">
      <h1 className="page-title">Connexion</h1>
      <p className="page-sub">Retrouvez vos commandes, vos adresses et recommandez en un clic.</p>
      <Auth0Panel />
      <LoginForm retour={retour} />
    </div>
  );
}
