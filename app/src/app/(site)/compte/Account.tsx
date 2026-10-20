'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Icon } from '@/components/Icons';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { useCart } from '@/components/cart/CartProvider';
import { ProductCard } from '@/components/menu/ProductCard';
import { useProductOpener } from '@/components/menu/MenuBrowser';
import type { CartLineInput, CatalogProduct } from '@/lib/catalog-types';
import type { Mode } from '@/lib/pricing';
import { formatPrice } from '@/lib/money';
import { MODE_LABELS, orderNumberLabel, STATUS_LABELS } from '@/lib/format';
import { logout } from '../connexion/actions';
import { addAddress, removeAddress, setDefaultAddress, updateProfile, type ActionResult } from './actions';

interface OrderView {
  id: string; number: number; token: string; mode: Mode; status: keyof typeof STATUS_LABELS; total: number; createdAt: string; hasInvoice: boolean;
  items: { name: string; qty: number; unitPrice: number; details: string[]; config: object }[];
}
interface AddressView { id: string; label: string; line1: string; extra: string; postalCode: string; city: string; isDefault: boolean }

type Tab = 'orders' | 'favorites' | 'addresses' | 'profile';

export function Account({ user, orders, addresses, zones, favorites, pizzas }: {
  user: { name: string; email: string; phone: string; marketingOptIn: boolean; createdAt: string; isStaff: boolean };
  orders: OrderView[]; addresses: AddressView[]; zones: { id: string; city: string }[]; favorites: CatalogProduct[]; pizzas: CatalogProduct[];
}) {
  const router = useRouter();
  const toast = useToast();
  const cart = useCart();
  const [tab, setTab] = useState<Tab>('orders');
  const [pending, start] = useTransition();
  const [addrSheet, setAddrSheet] = useState(false);
  const { openProduct, quickAdd, sheet } = useProductOpener(pizzas);

  const run = (fn: () => Promise<ActionResult>, ok?: string) => start(async () => {
    const r = await fn();
    if (!r.ok) return toast(r.error ?? 'Action impossible');
    if (ok) toast(ok);
    router.refresh();
  });

  const reorder = (o: OrderView) => {
    o.items.forEach(i => cart.add({ input: i.config as CartLineInput, name: i.name, unitPrice: i.unitPrice, details: i.details }));
    cart.setMode(o.mode);
    toast('Commande ajoutée au panier', 'bag');
    router.push('/panier');
  };

  const since = new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const first = user.name || user.email;

  return (
    <div className="page">
      <div className="account-head"><div className="account-head__inner">
        <div className="avatar">{first[0]?.toUpperCase()}</div>
        <div><h1>Salut {user.name || ''}</h1><p>{orders.length} commande{orders.length > 1 ? 's' : ''} · membre depuis {since}</p></div>
      </div></div>
      <div className="tabs" role="tablist">
        {([['orders', 'Mes commandes'], ['favorites', 'Favoris'], ['addresses', 'Adresses'], ['profile', 'Mes infos']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <div className="section account-body" style={{ paddingTop: 16 }}>
        {tab === 'orders' && (
          <div className="list">
            {!orders.length && <div className="empty">Aucune commande pour le moment. <Link className="link" href="/carte">Voir la carte</Link></div>}
            {orders.map(o => {
              const live = !['COMPLETED', 'CANCELLED'].includes(o.status);
              return (
                <div key={o.id} className="order-card">
                  <div className="order-card__head">
                    <div>
                      <div className="order-card__num">{orderNumberLabel(o.number)}</div>
                      <div className="order-card__date">{new Date(o.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' })} · {MODE_LABELS[o.mode]}</div>
                    </div>
                    <span className={`status-pill ${live ? 'is-live' : o.status === 'COMPLETED' ? 'is-done' : ''}`}>{live ? 'En cours' : STATUS_LABELS[o.status]}</span>
                  </div>
                  <div className="order-card__items">{o.items.map(i => `${i.qty} x ${i.name}`).join(', ')}</div>
                  <div className="order-card__foot">
                    <span className="price">{formatPrice(o.total)}</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {o.hasInvoice && <a className="btn btn--ghost btn--sm" href={`/api/invoices/${o.token}`}>Facture</a>}
                      <Link className="btn btn--ghost btn--sm" href={`/suivi/${o.token}`}>{live ? 'Suivre' : 'Détail'}</Link>
                      <button className="btn btn--primary btn--sm" onClick={() => reorder(o)}><Icon name="redo" /> Recommander</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'favorites' && (
          favorites.length
            ? <div className="grid">{favorites.map(p => <ProductCard key={p.id} product={p} onOpen={p => openProduct(p)} onQuickAdd={quickAdd} />)}</div>
            : <div className="empty">Aucun favori. Touchez le cœur sur la fiche d&apos;un plat pour le retrouver ici.</div>
        )}

        {tab === 'addresses' && (
          <div className="list">
            {!addresses.length && <div className="empty">Aucune adresse enregistrée.</div>}
            {addresses.map(a => (
              <div key={a.id} className={`addr-card ${a.isDefault ? 'is-default' : ''}`}>
                <Icon name="pin" />
                <div>
                  <div className="addr-card__label">{a.label} {a.isDefault && <span className="badge badge--outline">Par défaut</span>}</div>
                  <div className="addr-card__text">{a.line1}{a.extra ? ', ' + a.extra : ''}<br />{a.postalCode} {a.city}</div>
                </div>
                <div className="addr-card__actions">
                  {!a.isDefault && <button disabled={pending} onClick={() => run(() => setDefaultAddress(a.id))} aria-label="Définir par défaut" title="Définir par défaut"><Icon name="check" /></button>}
                  <button disabled={pending} onClick={() => run(() => removeAddress(a.id), 'Adresse supprimée')} aria-label="Supprimer" title="Supprimer"><Icon name="trash" /></button>
                </div>
              </div>
            ))}
            <button className="btn btn--ghost btn--block" onClick={() => setAddrSheet(true)}><Icon name="plus" /> Ajouter une adresse</button>
          </div>
        )}

        {tab === 'profile' && <Profile user={user} pending={pending} onSave={data => run(() => updateProfile(data), 'Informations enregistrées')} />}
      </div>

      {addrSheet && <AddressSheet zones={zones} onClose={() => setAddrSheet(false)} onSave={data => start(async () => {
        const r = await addAddress(data);
        if (!r.ok) return toast(r.error ?? 'Adresse invalide');
        setAddrSheet(false); toast('Adresse enregistrée'); router.refresh();
      })} pending={pending} />}
      {sheet}
    </div>
  );
}

function Profile({ user, pending, onSave }: { user: { name: string; email: string; phone: string; marketingOptIn: boolean; isStaff: boolean }; pending: boolean; onSave: (d: { name: string; phone: string; marketingOptIn: boolean }) => void }) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [optIn, setOptIn] = useState(user.marketingOptIn);
  return (
    <div className="panel" style={{ margin: 0 }}>
      <div className="field"><label htmlFor="p-name">Prénom</label><input id="p-name" value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="field"><label htmlFor="p-phone">Téléphone</label><input id="p-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} /></div>
      <div className="field"><label htmlFor="p-email">E-mail</label><input id="p-email" value={user.email} disabled /></div>
      <button type="button" className={`opt ${optIn ? 'is-selected' : ''}`} style={{ marginBottom: 12, width: '100%' }} onClick={() => setOptIn(v => !v)}>
        <span className="opt__box"><Icon name="check" /></span>
        <span className="opt__label">Recevoir les offres par e-mail<small>Promos pizza, nouveautés, 2 fois par mois maximum</small></span>
      </button>
      <div className="actions-row" style={{ margin: 0 }}>
        <button className="btn btn--dark" type="button" disabled={pending} onClick={() => onSave({ name, phone, marketingOptIn: optIn })}>Enregistrer</button>
        <form action={logout}><button className="btn btn--ghost btn--block" type="submit">Se déconnecter</button></form>
      </div>
      {user.isStaff && <Link className="btn btn--yellow btn--block" style={{ marginTop: 12 }} href="/admin">Espace de gestion</Link>}
    </div>
  );
}

function AddressSheet({ zones, onClose, onSave, pending }: { zones: { id: string; city: string }[]; onClose: () => void; onSave: (d: { label: string; line1: string; extra: string; zoneId: string }) => void; pending: boolean }) {
  const [d, setD] = useState({ label: '', line1: '', extra: '', zoneId: zones[0]?.id ?? '' });
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setD(x => ({ ...x, [k]: e.target.value }));
  return (
    <Sheet title="Nouvelle adresse" sub="Enregistrée pour vos prochaines livraisons" onClose={onClose}
      foot={<><span /><button className="btn btn--primary" disabled={pending} onClick={() => onSave(d)}>Enregistrer l&apos;adresse</button></>}>
      <div className="step">
        <div className="field"><label htmlFor="a-label">Nom</label><input id="a-label" placeholder="Maison, Travail, Chez Mamie..." value={d.label} onChange={set('label')} /></div>
        <div className="field"><label htmlFor="a-line1">Adresse</label><input id="a-line1" placeholder="N° et rue" value={d.line1} onChange={set('line1')} /></div>
        <div className="field-row">
          <div className="field"><label htmlFor="a-extra">Complément</label><input id="a-extra" placeholder="Bât., étage, code" value={d.extra} onChange={set('extra')} /></div>
          <div className="field"><label htmlFor="a-city">Ville</label><select id="a-city" value={d.zoneId} onChange={set('zoneId')}>{zones.map(z => <option key={z.id} value={z.id}>{z.city}</option>)}</select></div>
        </div>
      </div>
    </Sheet>
  );
}
