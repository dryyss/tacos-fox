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
  imageUrl?: string;
}

/* Visuels de départ, pour que l'accueil ait déjà un rythme avant les photos du client */
export const EXAMPLE_SLIDES: ExampleSlide[] = [
  {
    placement: 'CAROUSEL', tone: 'RED', kicker: 'Tacos', sortOrder: 0, badge: 'XXL',
    title: 'Tacos de S à XXL', highlight: 'S à XXL',
    text: 'Frites, sauce fromagère et boisson incluses. Jusqu’à 4 viandes.',
    ctaLabel: 'Composer', ctaHref: '/carte?cat=tacos', imageUrl: '/menu/photos/tacos-a-composer.png',
  },
  {
    placement: 'CAROUSEL', tone: 'YELLOW', kicker: 'Pizzas', sortOrder: 1, badge: '2x',
    title: '1 achetée = 1 offerte', highlight: '= 1 offerte',
    text: 'Sur les tailles Senior et Mega.',
    ctaLabel: 'Voir les pizzas', ctaHref: '/carte?cat=pizzas', imageUrl: '/menu/photos/pizzas-pizza-fox.png',
  },
  {
    placement: 'CAROUSEL', tone: 'DARK', kicker: 'Burgers', sortOrder: 2, badge: '',
    title: 'Seul ou en menu', highlight: 'en menu',
    text: 'Le menu comprend frites et boisson.',
    ctaLabel: 'Voir les burgers', ctaHref: '/carte?cat=burgers', imageUrl: '/menu/photos/burgers-le-magnificos.png',
  },
  {
    placement: 'BANNER', tone: 'YELLOW', kicker: 'Offre pizza', sortOrder: 0, badge: '2x',
    title: '1 pizza achetée = 1 offerte', highlight: '= 1 offerte',
    text: 'Senior et Mega, à emporter.',
    ctaLabel: 'Voir les pizzas', ctaHref: '/carte?cat=pizzas',
  },
  {
    placement: 'BANNER', tone: 'DARK', kicker: 'En ligne', sortOrder: 1, badge: '',
    title: 'Commandez, payez, récupérez', highlight: 'récupérez',
    text: 'Paiement par carte, retrait à l’heure choisie.',
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
    text: 'Préparé dans votre restaurant, à emporter.',
    ctaLabel: 'Commander', ctaHref: '/carte',
  },
  {
    placement: 'PANEL', tone: 'DARK', kicker: 'Quartier', sortOrder: 2, badge: '',
    title: 'Livraison autour de Stains', highlight: 'Stains',
    text: 'Saint-Denis, Pierrefitte, La Courneuve et plus.',
    ctaLabel: 'Voir les zones', ctaHref: '/infos',
  },
];
