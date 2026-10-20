import { requireStaffPage } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { ZonesEditor } from './ZonesEditor';

export const metadata = { title: 'Livraison' };

export default async function DeliveryPage() {
  await requireStaffPage(true);
  const zones = await prisma.deliveryZone.findMany({ orderBy: { sortOrder: 'asc' } });
  return (
    <>
      <h1 className="admin-title">Zones de livraison</h1>
      <p className="admin-sub">Une ligne par commune desservie. Le client choisit sa ville au moment de commander : frais, gratuité et minimum s&apos;appliquent automatiquement.</p>
      <ZonesEditor zones={zones.map(z => ({ id: z.id, city: z.city, postalCode: z.postalCode, fee: z.fee, freeFrom: z.freeFrom, minimum: z.minimum, isActive: z.isActive }))} />
    </>
  );
}
