import type { SlidePlacement, SlideTone } from './slide-types';

export interface ExampleSlide {
  placement: SlidePlacement;
  tone: SlideTone;
  kicker: string;
  title: string;
  highlight: string;
  text: string;
  ctaLabel: string;
  ctaHref: string;
  badge: string;
  sortOrder: number;
}

/* Visuels de départ, pour que l'accueil ait déjà un rythme avant les photos du client */
export const EXAMPLE_SLIDES: ExampleSlide[] = [
  {
    placement: 'CAROUSEL', tone: 'RED', kicker: 'Signature', sortOrder: 0, badge: 'XXL',
    title: 'Le tacos qui calme une faim de loup', highlight: 'faim de loup',
    text: 'Frites, sauce fromagère et boisson incluses. De la taille S au XXL.',
    ctaLabel: 'Composer', ctaHref: '/carte?cat=tacos',
  },
  {
    placement: 'CAROUSEL', tone: 'YELLOW', kicker: 'Offre pizza', sortOrder: 1, badge: '2x',
    title: '1 achetée = 1 offerte', highlight: '= 1 offerte',
    text: 'Sur les tailles Senior et Mega, sur place et à emporter.',
    ctaLabel: 'Voir les pizzas', ctaHref: '/carte?cat=pizzas',
  },
  {
    placement: 'CAROUSEL', tone: 'DARK', kicker: 'Sans appli', sortOrder: 2, badge: '0 €',
    title: 'Les prix de la carte, rien de plus', highlight: 'rien de plus',
    text: 'Zéro commission. Votre commande arrive directement en cuisine.',
    ctaLabel: 'Commander', ctaHref: '/carte',
  },
  {
    placement: 'BANNER', tone: 'YELLOW', kicker: 'Cette semaine', sortOrder: 0, badge: '2x',
    title: '1 pizza achetée = 1 offerte', highlight: '= 1 offerte',
    text: 'Senior et Mega, sur place et à emporter.',
    ctaLabel: 'Voir les pizzas', ctaHref: '/carte?cat=pizzas',
  },
  {
    placement: 'BANNER', tone: 'DARK', kicker: 'Direct cuisine', sortOrder: 1, badge: '0 €',
    title: 'Les prix de la carte, rien de plus', highlight: 'rien de plus',
    text: 'Pas de commission, pas de frais cachés.',
    ctaLabel: 'Commander', ctaHref: '/carte',
  },
  {
    placement: 'PANEL', tone: 'CREAM', kicker: 'Viande', sortOrder: 0, badge: '',
    title: 'Halal certifiée', highlight: '',
    text: 'Achahada, sur toutes nos viandes.',
    ctaLabel: 'La carte', ctaHref: '/carte',
  },
  {
    placement: 'PANEL', tone: 'RED', kicker: 'Cuisine', sortOrder: 1, badge: '20',
    title: 'Prêt en 20 min', highlight: '20 min',
    text: 'Préparé à Stains, à emporter ou livré.',
    ctaLabel: 'Commander', ctaHref: '/carte',
  },
  {
    placement: 'PANEL', tone: 'DARK', kicker: 'Quartier', sortOrder: 2, badge: '',
    title: 'Livraison autour de Stains', highlight: 'Stains',
    text: 'Saint-Denis, Pierrefitte, La Courneuve et plus.',
    ctaLabel: 'Voir les zones', ctaHref: '/infos',
  },
];
