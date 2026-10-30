'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { AdminFeature } from '@/lib/features';

/* Chaque lien n'apparaît que si la fonctionnalité est incluse ou achetée en option */
const LINKS: { href: string; label: string; feature: AdminFeature; exact?: boolean }[] = [
  { href: '/admin', label: 'Commandes', feature: 'orders', exact: true },
  { href: '/admin/historique', label: 'Historique', feature: 'history' },
  { href: '/admin/qrcode', label: 'QR codes', feature: 'qrcodes' },
  { href: '/admin/carte', label: 'Carte', feature: 'menu' },
  { href: '/admin/vitrine', label: 'Vitrine', feature: 'menu' },
  { href: '/admin/reglages', label: 'Horaires et réglages', feature: 'settings' },
  { href: '/admin/promos', label: 'Promos', feature: 'promos' },
  { href: '/admin/livraison', label: 'Livraison', feature: 'delivery' },
  { href: '/admin/compta', label: 'Comptabilité', feature: 'accounting' },
  { href: '/admin/options', label: 'Options', feature: 'options' },
];

export function AdminNav({ features }: { features: AdminFeature[] }) {
  const path = usePathname();
  return (
    <nav className="admin-nav no-print" aria-label="Gestion">
      {LINKS.filter(l => features.includes(l.feature)).map(l => {
        const active = l.exact ? path === l.href : path.startsWith(l.href);
        return <Link key={l.href} href={l.href} className={active ? 'is-active' : ''}>{l.label}</Link>;
      })}
    </nav>
  );
}
