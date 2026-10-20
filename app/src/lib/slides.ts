import 'server-only';
import { prisma } from '@/lib/prisma';
import type { SlidePlacement, SlideView } from '@/lib/slide-types';

export interface PublicSlides {
  carousel: SlideView[];
  banners: SlideView[];
  panels: SlideView[];
}

/* Slides actifs dont la période couvre maintenant, groupés pour l'accueil */
export async function getPublicSlides(now = new Date()): Promise<PublicSlides> {
  const rows = await prisma.promoSlide.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  const view = (s: (typeof rows)[number]): SlideView => ({
    id: s.id, placement: s.placement, tone: s.tone, kicker: s.kicker, title: s.title, highlight: s.highlight,
    text: s.text, ctaLabel: s.ctaLabel, ctaHref: s.ctaHref, imageUrl: s.imageUrl, badge: s.badge,
  });
  const pick = (placement: SlidePlacement) => rows.filter(s => s.placement === placement).map(view);
  return { carousel: pick('CAROUSEL'), banners: pick('BANNER'), panels: pick('PANEL') };
}
