'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Icon } from '@/components/Icons';
import { login, register, type FormState } from './actions';

export function LoginForm({ retour }: { retour?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className="panel" noValidate>
      <input type="hidden" name="retour" value={retour ?? '/compte'} />
      <div className="field"><label htmlFor="l-email">E-mail</label><input id="l-email" name="email" type="email" autoComplete="email" required defaultValue={state.fields?.email} /></div>
      <div className="field"><label htmlFor="l-password">Mot de passe</label><input id="l-password" name="password" type="password" autoComplete="current-password" required /></div>
      {state.error && <p className="alert alert--error" style={{ marginTop: 0, marginBottom: 12 }}><Icon name="close" />{state.error}</p>}
      <button className="btn btn--primary btn--block" disabled={pending}>{pending ? 'Connexion...' : 'Se connecter'}</button>
      <p className="small muted" style={{ marginTop: 14 }}>Pas encore de compte ? <Link className="link" href={`/inscription${retour ? `?retour=${encodeURIComponent(retour)}` : ''}`}>Créer un compte</Link></p>
    </form>
  );
}

export function RegisterForm({ retour }: { retour?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(register, {});
  return (
    <form action={action} className="panel" noValidate>
      <input type="hidden" name="retour" value={retour ?? '/compte'} />
      <div className="field"><label htmlFor="r-name">Prénom</label><input id="r-name" name="name" autoComplete="given-name" required defaultValue={state.fields?.name} /></div>
      <div className="field"><label htmlFor="r-email">E-mail</label><input id="r-email" name="email" type="email" autoComplete="email" required defaultValue={state.fields?.email} /></div>
      <div className="field"><label htmlFor="r-phone">Téléphone (optionnel)</label><input id="r-phone" name="phone" type="tel" autoComplete="tel" placeholder="06 00 00 00 00" defaultValue={state.fields?.phone} /></div>
      <div className="field"><label htmlFor="r-password">Mot de passe</label><input id="r-password" name="password" type="password" autoComplete="new-password" minLength={8} required /><span className="small muted">8 caractères minimum</span></div>
      <label className="opt" style={{ marginBottom: 12, cursor: 'pointer' }}>
        <input type="checkbox" name="marketing" style={{ width: 20, height: 20, accentColor: 'var(--red)' }} />
        <span className="opt__label">Recevoir les offres et nouveautés<small>2 fois par mois maximum, désinscription en un clic</small></span>
      </label>
      {state.error && <p className="alert alert--error" style={{ marginTop: 0, marginBottom: 12 }}><Icon name="close" />{state.error}</p>}
      <button className="btn btn--primary btn--block" disabled={pending}>{pending ? 'Création...' : 'Créer mon compte'}</button>
      <p className="small muted" style={{ marginTop: 14 }}>Déjà inscrit ? <Link className="link" href={`/connexion${retour ? `?retour=${encodeURIComponent(retour)}` : ''}`}>Se connecter</Link>. En créant un compte, vous acceptez notre <Link className="link" href="/confidentialite">politique de confidentialité</Link>.</p>
    </form>
  );
}
