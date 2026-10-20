import { prisma } from '@/lib/prisma';
import { dateToParisLocal } from '@/lib/hours';
import { VitrineEditor, type SlideRow } from './VitrineEditor';

export const metadata = { title: 'Vitrine' };

export default async function VitrinePage() {
  const slides = await prisma.promoSlide.findMany({ orderBy: [{ placement: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] });
  const rows: SlideRow[] = slides.map(s => ({
    id: s.id,
    placement: s.placement,
    tone: s.tone,
    kicker: s.kicker,
    title: s.title,
    highlight: s.highlight,
    text: s.text,
    ctaLabel: s.ctaLabel,
    ctaHref: s.ctaHref,
    imageUrl: s.imageUrl,
    badge: s.badge,
    isActive: s.isActive,
    startsAt: s.startsAt ? dateToParisLocal(s.startsAt) : null,
    endsAt: s.endsAt ? dateToParisLocal(s.endsAt) : null,
  }));
  return (
    <>
      <h1 className="admin-title">Vitrine</h1>
      <p className="admin-sub">Carrousel, bandeau et panneaux de l’accueil. Vous publiez, ordonnez et programmez les offres. Le site se met à jour tout de suite.</p>
      <VitrineEditor slides={rows} />
    </>
  );
}
