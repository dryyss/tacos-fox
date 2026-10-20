export const PLACEMENTS = ['CAROUSEL', 'BANNER', 'PANEL'] as const;
export const TONES = ['YELLOW', 'RED', 'DARK', 'CREAM'] as const;

export type SlidePlacement = (typeof PLACEMENTS)[number];
export type SlideTone = (typeof TONES)[number];

export const PLACEMENT_LABEL: Record<SlidePlacement, string> = {
  CAROUSEL: 'Carrousel',
  BANNER: 'Bandeau',
  PANEL: 'Panneau',
};

export const TONE_LABEL: Record<SlideTone, string> = {
  YELLOW: 'Jaune',
  RED: 'Rouge',
  DARK: 'Noir',
  CREAM: 'Crème',
};

/* Ce que le site public affiche, sans les dates ni le tri */
export interface SlideView {
  id: string;
  placement: SlidePlacement;
  tone: SlideTone;
  kicker: string;
  title: string;
  highlight: string;
  text: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string | null;
  badge: string;
}
