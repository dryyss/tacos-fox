import type { Metadata } from 'next';
import Link from 'next/link';
import { ToastProvider } from '@/components/ui/Toast';
import { AdminNav } from '@/components/admin/AdminNav';
import { requireStaffPage } from '@/lib/admin';
import { logout } from '@/app/(site)/connexion/actions';

export const metadata: Metadata = { title: { default: 'Gestion', template: '%s · Gestion Tacos Fox' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaffPage();
  return (
    <ToastProvider>
      <div className="admin">
        <header className="admin-top no-print">
          <Link href="/admin" className="brand__name">TACOS<span style={{ color: 'var(--red)' }}>FOX</span> <small style={{ fontFamily: 'var(--text)', fontSize: '.75rem', letterSpacing: '.1em', opacity: .7 }}>GESTION</small></Link>
          <div className="admin-top__right">
            <span className="hide-mobile">{user.email}</span>
            <Link className="btn btn--light btn--sm" href="/" target="_blank">Voir le site</Link>
            <form action={logout}><button className="btn btn--dark btn--sm" style={{ border: '1px solid rgba(255,255,255,.3)' }}>Quitter</button></form>
          </div>
        </header>
        <AdminNav isAdmin={user.role === 'ADMIN'} />
        <main className="admin-main">{children}</main>
      </div>
    </ToastProvider>
  );
}
