'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/Icons';
import { useCart } from '@/components/cart/CartProvider';
import { formatPrice } from '@/lib/money';

const NAV = [
  { href: '/', label: 'Accueil', match: (p: string) => p === '/' },
  { href: '/carte', label: 'La carte', match: (p: string) => p.startsWith('/carte') },
  { href: '/restaurants', label: 'Nos restaurants', match: (p: string) => p.startsWith('/restaurants') },
];
const CHECKOUT = ['/panier', '/commande', '/paiement'];
const ACCOUNT = { href: '/compte', match: (p: string) => p.startsWith('/compte') || p.startsWith('/connexion') || p.startsWith('/inscription') || p.startsWith('/suivi') };

/* accountEnabled : espace client (option O7). Sans lui, seule l'équipe connectée voit un lien, vers la gestion. */
export function Header({ name, tagline, userName, accountEnabled, isStaff }: { name: string; tagline: string; userName?: string | null; accountEnabled: boolean; isStaff: boolean }) {
  const path = usePathname();
  const { count, subtotal, ready } = useCart();
  // userName : null = déconnecté, '' = connecté sans prénom
  const split = name.replace(/\s/g, '').toUpperCase();
  return (
    <header className="header">
      <Link className="brand" href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="brand__logo" src="/logo.png" alt="" width={52} height={52} />
        <span className="brand__text">
          <span className="brand__name">{split.replace(/FOX$/, '')}<span>FOX</span></span>
          <span className="brand__sub">{tagline}</span>
        </span>
        <span className="sr-only">, accueil</span>
      </Link>
      <nav className="nav" aria-label="Navigation principale">
        {NAV.map(n => <Link key={n.href} href={n.href} className={n.match(path) ? 'is-active' : ''}>{n.label}</Link>)}
      </nav>
      <div className="header__actions">
        {accountEnabled ? (
          <Link className={`account-link hide-mobile ${ACCOUNT.match(path) ? 'is-active' : ''}`} href={userName != null ? '/compte' : '/connexion'}>
            <Icon name="user" />{userName == null ? 'Connexion' : userName || 'Mon compte'}
          </Link>
        ) : isStaff && (
          <Link className="account-link hide-mobile" href="/admin"><Icon name="user" />Gestion</Link>
        )}
        <Link className="btn btn--primary btn--sm hide-mobile" href="/carte">Commander</Link>
        <Link className="cart-btn" href="/panier">
          <Icon name="bag" />
          <span className="sr-only">Panier{ready && count > 0 ? `, ${count} article${count > 1 ? "s" : ""}` : ", vide"} </span>
          {ready && count > 0 && <span className="cart-btn__count">{count}</span>}
          <span className="cart-btn__total hide-mobile">{formatPrice(ready ? subtotal : 0)}</span>
        </Link>
      </div>
    </header>
  );
}

export function TabBar({ accountEnabled }: { accountEnabled: boolean }) {
  const path = usePathname();
  const { count, ready } = useCart();
  const is = (m: (p: string) => boolean) => (m(path) ? 'is-active' : '');
  return (
    <nav className="tabbar" aria-label="Navigation mobile" style={accountEnabled ? undefined : { gridTemplateColumns: 'repeat(4, 1fr)' }}>
      <Link href="/" className={is(NAV[0].match)}><Icon name="home" /><span>Accueil</span></Link>
      <Link href="/carte" className={is(NAV[1].match)}><Icon name="menu" /><span>Carte</span></Link>
      <Link href="/panier" className={`tabbar__cart ${CHECKOUT.includes(path) ? 'is-active' : ''}`}>
        <span className="tabbar__cartwrap"><Icon name="bag" />{ready && count > 0 && <span className="tabbar__badge">{count}</span>}</span>
        <span>Panier</span>
      </Link>
      {accountEnabled && <Link href="/compte" className={is(ACCOUNT.match)}><Icon name="user" /><span>Compte</span></Link>}
      <Link href="/restaurants" className={is(NAV[2].match)}><Icon name="pin" /><span>Restos</span></Link>
    </nav>
  );
}

/* Barre panier flottante sur mobile, page carte uniquement */
export function CartBar() {
  const path = usePathname();
  const { count, subtotal, ready } = useCart();
  if (!ready || count === 0 || !path.startsWith('/carte')) return null;
  return (
    <Link className="cart-bar" href="/panier">
      <span className="cart-bar__count">{count}</span>
      <span className="cart-bar__label">Voir mon panier</span>
      <span className="cart-bar__total">{formatPrice(subtotal)}</span>
    </Link>
  );
}
