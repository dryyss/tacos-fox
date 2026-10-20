'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Commandes', exact: true },
  { href: '/admin/historique', label: 'Historique' },
  { href: '/admin/carte', label: 'Carte' },
  { href: '/admin/promos', label: 'Promos' },
  { href: '/admin/vitrine', label: 'Vitrine' },
  { href: '/admin/livraison', label: 'Livraison', adminOnly: true },
  { href: '/admin/reglages', label: 'Horaires et réglages', adminOnly: true },
  { href: '/admin/compta', label: 'Comptabilité', adminOnly: true },
  { href: '/admin/qrcode', label: 'QR code' },
];

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  return (
    <nav className="admin-nav no-print" aria-label="Gestion">
      {LINKS.filter(l => isAdmin || !l.adminOnly).map(l => {
        const active = l.exact ? path === l.href : path.startsWith(l.href);
        return <Link key={l.href} href={l.href} className={active ? 'is-active' : ''}>{l.label}</Link>;
      })}
    </nav>
  );
}
