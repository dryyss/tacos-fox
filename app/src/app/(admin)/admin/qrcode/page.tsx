import { requireStaffPage, restaurantScope } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { appUrl } from '@/lib/url';
import { QrSheet } from './QrSheet';

export const metadata = { title: 'QR codes' };

/* R7 : un QR code par restaurant, qui ouvre directement sa carte (tables, vitrine, flyers) */
export default async function QrPage() {
  const scope = await restaurantScope(await requireStaffPage('qrcodes'));
  const restaurants = await prisma.restaurant.findMany({ where: { isActive: true, ...(scope ? { id: { in: scope } } : {}) }, orderBy: { sortOrder: 'asc' } });
  return (
    <>
      <div className="admin-head no-print">
        <div>
          <h1 className="admin-title">QR codes</h1>
          <p className="admin-sub" style={{ margin: 0 }}>Un QR code par restaurant : il ouvre directement la carte de ce restaurant. À imprimer pour les tables, la vitrine et les flyers.</p>
        </div>
      </div>
      <QrSheet restaurants={restaurants.map(r => ({ slug: r.slug, title: `${r.name} ${r.city}`, street: r.addressLine1, url: `${appUrl()}/r/${r.slug}` }))} />
    </>
  );
}
