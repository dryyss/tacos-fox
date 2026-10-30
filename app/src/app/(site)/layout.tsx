import Link from 'next/link';
import { Icon } from '@/components/Icons';
import { CartProvider } from '@/components/cart/CartProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { CartBar, Header, TabBar } from '@/components/site/Chrome';
import { Footer } from '@/components/site/Footer';
import { FavoritesProvider } from '@/components/menu/Favorites';
import { getSettings } from '@/lib/catalog';
import { prisma } from '@/lib/prisma';
import { auth, isStaff } from '@/auth';
import { publicFeatures } from '@/lib/features';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, session] = await Promise.all([getSettings(), auth()]);
  const features = publicFeatures(settings.enabledOptions);
  const favorites = features.customerAccount && session?.user?.id ? (await prisma.favorite.findMany({ where: { userId: session.user.id }, select: { productId: true } })).map(f => f.productId) : [];
  return (
    <ToastProvider>
      <CartProvider>
        <FavoritesProvider enabled={features.customerAccount} loggedIn={!!session?.user} initial={favorites}>
        <Link className="skip" href="#app">Aller au contenu</Link>
        <div className="trust-strip" role="note">
          <span className="trust-strip__item"><Icon name="halal" /> {settings.halalLabel}</span>
          <span className="trust-strip__sep" aria-hidden="true" />
          <span className="trust-strip__item"><Icon name="direct" /> Commande directe, sans appli de livraison</span>
        </div>
        <Header name={settings.name} tagline={settings.tagline} userName={session?.user ? (session.user.name?.split(' ')[0] ?? '') : null} accountEnabled={features.customerAccount} isStaff={isStaff(session?.user?.role)} />
        <main id="app" className="app" tabIndex={-1}>{children}</main>
        <Footer settings={settings} accountEnabled={features.customerAccount} />
        <CartBar />
        <TabBar accountEnabled={features.customerAccount} />
        </FavoritesProvider>
      </CartProvider>
    </ToastProvider>
  );
}
