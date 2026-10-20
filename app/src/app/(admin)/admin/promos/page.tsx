import { prisma } from '@/lib/prisma';
import { dateToParisLocal } from '@/lib/hours';
import { PromosEditor } from './PromosEditor';

export const metadata = { title: 'Promotions' };

export default async function PromosPage() {
  const promos = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
  const iso = (d: Date | null) => (d ? dateToParisLocal(d) : null);
  return (
    <>
      <h1 className="admin-title">Codes promo</h1>
      <p className="admin-sub">Le client saisit le code dans son panier. La remise est recalculée par le serveur et plafonnée au montant des articles.</p>
      <PromosEditor promos={promos.map(p => ({ id: p.id, code: p.code, description: p.description, type: p.type, value: p.value, minSubtotal: p.minSubtotal, startsAt: iso(p.startsAt), endsAt: iso(p.endsAt), maxUses: p.maxUses, uses: p.uses, isActive: p.isActive }))} />
    </>
  );
}
