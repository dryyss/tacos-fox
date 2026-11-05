/* Copie du relevé de carte (site/js/data.js), utilisée uniquement par le seed. */
/* ============================================================
   TACOS FOX : données de la carte
   Source : relevé de la borne de commande (octobre 2026).
   Les lignes marquées tbc:true ont un prix à confirmer par le restaurant.
   ============================================================ */

const RESTAURANT = {
  name: 'TACOSFOX',
  tagline: 'Stains · Dugny · Le Blanc-Mesnil',
  slogan: 'La meilleure excuse pour ne pas cuisiner ce soir',
  halal: 'Viande halal certifiée Achahada',
  phone: '', // pas de coordonnées provisoires : chaque restaurant a les siennes (Gestion > Restaurants)
  phoneHref: '',
  address: { line1: '', city: '93240 Stains' },
  mapsQuery: '93240 Stains, France',
  hours: [
    { day: 'Lundi',    open: '11:00', close: '23:00' },
    { day: 'Mardi',    open: '11:00', close: '23:00' },
    { day: 'Mercredi', open: '11:00', close: '23:00' },
    { day: 'Jeudi',    open: '11:00', close: '23:00' },
    { day: 'Vendredi', open: '11:00', close: '00:00' },
    { day: 'Samedi',   open: '11:00', close: '00:00' },
    { day: 'Dimanche', open: '12:00', close: '23:00' },
  ],
  delivery: { fee: 2.5, freeFrom: 25, minimum: 15, zones: ['Stains', 'Pierrefitte-sur-Seine', 'Saint-Denis', 'La Courneuve', 'Garges-lès-Gonesse', 'Villetaneuse', 'Dugny'] },
  social: [
    { id: 'instagram', label: 'Instagram', href: 'https://instagram.com/' },
    { id: 'snapchat',  label: 'Snapchat',  href: 'https://snapchat.com/' },
    { id: 'tiktok',    label: 'TikTok',    href: 'https://tiktok.com/' },
    { id: 'facebook',  label: 'Facebook',  href: 'https://facebook.com/' },
  ],
};

const CATEGORIES = [
  { id: 'tacos',      label: 'Tacos' },
  { id: 'burgers',    label: 'Burgers' },
  { id: 'sandwichs',  label: 'Sandwichs' },
  { id: 'pizzas',     label: 'Pizzas' },
  { id: 'bowls',      label: 'Bowls' },
  { id: 'crousty',    label: 'Crousty Fox' },
  { id: 'assiettes',  label: 'Assiettes' },
  { id: 'paninis',    label: 'Paninis' },
  { id: 'pates',      label: 'Pâtes' },
  { id: 'salades',    label: 'Salades' },
  { id: 'milkshakes', label: 'Milkshakes' },
  { id: 'smoothies',  label: 'Smoothies' },
  { id: 'crepes',     label: 'Crêpes' },
  { id: 'desserts',   label: 'Desserts' },
  { id: 'enfant',     label: 'Menu enfant' },
  { id: 'boissons',   label: 'Boissons' },
];

/* Vignettes de categories (recadrees depuis les ecrans du restaurant). Les categories absentes affichent le renard. */
const CAT_IMAGES = {
  tacos: 'assets/cats/tacos.jpg', burgers: 'assets/cats/burgers.jpg', sandwichs: 'assets/cats/sandwichs.jpg',
  pizzas: 'assets/cats/pizzas.jpg', bowls: 'assets/cats/bowls.jpg', crousty: 'assets/cats/crousty.jpg',
  paninis: 'assets/cats/paninis.jpg', pates: 'assets/cats/pates.jpg', salades: 'assets/cats/salades.jpg',
  milkshakes: 'assets/cats/milkshakes.jpg', smoothies: 'assets/cats/smoothies.jpg',
};
const MEATS = ['Chicken jaune', 'Chicken rouge', 'Cordon bleu', 'Escalope', 'Kebab', 'Merguez', 'Nuggets', 'Tenders', 'Viande hachée'];

const SAUCES = ['Algérienne', 'Andalouse', 'Barbecue', 'Biggy', 'Cheezy', 'Chili thaï', 'Curry', 'Fish', 'Harissa', 'Ketchup', 'Mayonnaise', 'Poivre', 'Samouraï', 'Sauce blanche', 'Yopie'];

const CHEESES = [
  { label: 'Bleu', price: 0.6 }, { label: 'Boursin', price: 0.6 }, { label: 'Cheddar', price: 0.7 },
  { label: 'Chèvre', price: 0.7 }, { label: 'Emmental', price: 0.6 }, { label: 'Kiri', price: 0.6 },
  { label: 'Mozzarella', price: 0.7 }, { label: 'Raclette', price: 0.7, tbc: true },
];

const GRATINS = [
  { label: 'Chorizo + mozza', price: 2.5 },
  { label: 'Lardon + emmental', price: 2.5 },
  { label: 'Mozza + lardon + chorizo + œuf', price: 2.5 },
];

const EXTRA_MEATS = [
  { label: 'Viande hachée', price: 1.8 }, { label: 'Escalope', price: 1.8 }, { label: 'Kebab', price: 1.8 },
  { label: 'Cordon bleu', price: 1.8 }, { label: 'Merguez', price: 1.8 }, { label: 'Nuggets', price: 1.8 },
  { label: 'Tenders', price: 1.5 }, { label: 'Chorizo', price: 1.8 }, { label: 'Lardon', price: 1.8 },
  { label: 'Escalope curry', price: 1.8 }, { label: 'Escalope tandoori', price: 1.8 }, { label: 'Saumon', price: 2.5 },
];

const DRINKS = ['Coca-Cola', 'Coca-Cola Zéro', 'Fanta', 'Sprite', 'Oasis Tropical', 'Ice Tea', 'Eau'];

/* Crêpe salée, d'après la caisse (04/11/2026). Viande 1,80 €, fromage 0,90 €, légume 0,80 €, boisson +1 €.
   Autant de suppléments que voulu, chacun une fois. La dernière rangée de boissons était coupée sur la photo. */
const CREPE_MEATS = ['Chorizo', 'Cordon bleu', 'Dinde', 'Escalope', 'Escalope curry', 'Escalope tandoori', 'Kebab', 'Lardon', 'Merguez', 'Nuggets', 'Saumon', 'Tenders', 'Thon', 'Viande hachée'];
const CREPE_CHEESES = ['Boursin', 'Cheddar', 'La vache qui rit', 'Mozzarella', 'Œuf', 'Raclette'];
const CREPE_VEG = ['Champignon', 'Oignon', 'Oignon frit', 'Olive', 'Pommes de terre', 'Poivron', 'Salade', 'Tomate'];
const CREPE_DRINKS = ['Coca-Cola Zéro 33 cl', 'Fanta citron 33 cl', 'Fanta orange 33 cl', 'Schweppes agrumes 33 cl', '7 Up 33 cl', '7 Up Cherry', '7 Up Mojito 33 cl', 'Coca-Cola 33 cl', 'Cristaline 50 cl', 'Cristaline citronade 50 cl', 'Cristaline fraise 50 cl', 'Cristaline pêche 50 cl', 'Fanta mangue fruit du dragon 33 cl', 'Fanta tropical 33 cl', 'Ice framboise 33 cl', 'Ice Tea pêche 33 cl'];
const CREPE_TOPPINGS = ['Caramel', 'Chocolat', 'Fraise'];
const CREPE_SUPPS = ['Amande', 'Bounty', 'Noix de coco', 'Kinder Bueno', 'Kinder Bueno White', 'Kinder Country', 'Kinder Maxi', 'Kit Kat', 'Mars', 'Milka', 'M&M\'s', 'Oreo', 'Schoko Bons', 'Snickers', 'Spéculoos', 'Chocolat blanc', 'White Kinder Bueno'];
const SWEET_EXTRAS = [
  { id: 'topping', label: 'Topping', hint: 'Autant que vous voulez', min: 0, max: CREPE_TOPPINGS.length, choices: CREPE_TOPPINGS.map(label => ({ label, price: 0.6 })) },
  { id: 'supp', label: 'Supplément', hint: 'Autant que vous voulez', min: 0, max: CREPE_SUPPS.length, choices: CREPE_SUPPS.map(label => ({ label, price: 1.2 })) },
  { id: 'chantilly', label: 'Chantilly', hint: 'Optionnel', min: 0, max: 1, choices: [{ label: 'Chantilly', price: 0.8 }] },
];
const DRINK_PLUS = { id: 'drink', label: 'Boisson', hint: '1 € en plus', type: 'single', min: 0, max: 1, choices: CREPE_DRINKS.map(label => ({ label, price: 1 })) };
const CRUDITES = { id: 'crudites', label: 'Crudités', hint: 'Au choix', type: 'multi', min: 0, max: 3, choices: ['Salade', 'Tomate', 'Oignon'].map(label => ({ label })) };
const SAUCE_CHOICE = { id: 'sauces', label: 'Vos sauces', hint: '3 maximum, au choix', type: 'multi', min: 0, max: 3, choices: SAUCES.map(label => ({ label })) };

const TACOS = {
  sizes: [
    { id: 'S',   label: 'S',   price: 8.1,  meats: 1, hint: '1 viande' },
    { id: 'M',   label: 'M',   price: 9.1,  meats: 1, hint: '1 viande, plus garni' },
    { id: 'L',   label: 'L',   price: 10.2, meats: 2, hint: '2 viandes' },
    { id: 'XL',  label: 'XL',  price: 13.3, meats: 3, hint: '3 viandes' },
    { id: 'XXL', label: 'XXL', price: 16.5, meats: 4, hint: '4 viandes' },
  ],
  included: 'Frites, sauce fromagère et boisson incluses',
  friesPrice: 1.5,
};

const PIZZA_SIZES = [
  { id: 'junior', label: 'Junior', price: 7.2, bogo: false, hint: '26 cm, 1 personne' },
  { id: 'senior', label: 'Senior', price: 10.2, bogo: true, hint: '31 cm, 2e offerte' },
  { id: 'mega',   label: 'Mega',   price: 12.6, bogo: true, hint: '40 cm, 2e offerte' },
];

const PIZZAS = [
  ['3 Jambons', 'Sauce tomate, mozza, jambon, lardon, chorizo'],
  ['4 Fromages', 'Sauce tomate, emmental, chèvre, mozzarella, bleu'],
  ['4 Saisons', 'Sauce tomate, mozza, jambon, champignon, poivron, olive, artichaut'],
  ['Algérienne', 'Sauce algérienne, mozza, escalope'],
  ['Américaine', 'Crème fraîche, mozza, lardon, oignon, chorizo, œuf'],
  ['Boursin', 'Mozza, boursin, escalope de poulet'],
  ['Buffalo', 'Sauce barbecue, viande hachée, oignon, poivron'],
  ['Calzone', 'Sauce tomate, mozza, jambon, œuf'],
  ['Campione', 'Sauce tomate, mozza, viande hachée, champignon'],
  ['Chicken', 'Sauce tomate, mozza, poulet, champignon, poivron'],
  ['Chicken Tikka', 'Mozza, chicken tikka, pomme de terre'],
  ['Fermière', 'Crème fraîche, jambon de poulet, pomme de terre'],
  ['Fruits de mer', 'Sauce tomate, mozza, cocktail de fruits de mer, calamars, moules, crevette'],
  ['Hawaïenne', 'Crème fraîche, mozza, jambon de poulet, ananas'],
  ['Jasmine', 'Crème fraîche, mozza, viande hachée, pomme de terre, chèvre, olive'],
  ['Kebab', 'Mozza, kebab'],
  ['Kirri', 'Crème fraîche, mozza, Kiri, jambon de poulet'],
  ["L'Orientale", 'Sauce tomate, mozza, merguez, olive, poivron, oignon, œuf', ['epice']],
  ['La Texane Fox', 'Sauce tomate, mozza, chicken, jambon, viande hachée, oignon', ['best']],
  ['Margherita', 'Sauce tomate, mozza'],
  ['Mexicaine', 'Sauce tomate, mozza, poivron, viande hachée, merguez, olive, œuf', ['epice']],
  ['Miami', 'Sauce tomate, viande hachée, chorizo, poivron, œuf'],
  ['Miel', 'Sauce au miel, mozza, chèvre'],
  ['Milano', 'Crème fraîche, mozza, jambon, oignon, pomme de terre'],
  ['Mixte', 'Sauce tomate, mozza, viande hachée, jambon, oignon, double fromage'],
  ['Napolitaine', 'Sauce tomate, mozza, anchois'],
  ['Neptune', 'Sauce tomate, mozza, thon, oignon, olive'],
  ['Paysanne', 'Crème fraîche, jambon de poulet, jambon, pomme de terre, œuf'],
  ['Pizza Fox', 'Crème fraîche, mozza, jambon de poulet, champignon, tomate fraîche, olive', ['best']],
  ['Raclette Fox', 'Crème fraîche, jambon de dinde, fromage raclette, pomme de terre, mozza', ['best']],
  ['Regina', 'Sauce tomate, mozza, jambon, champignon'],
  ['Shaineze Pimenlo', 'Sauce chili, mozza, piment, bœuf, chorizo, oignon', ['epice']],
  ['Spéciale Shaineze', 'Sauce tomate, mozza, viande hachée, jambon de poulet, œuf'],
  ['Tartiflette', 'Crème fraîche, mozza, lardon, reblochon, pomme de terre'],
  ['Végétarienne', 'Sauce tomate, mozza, champignon, poivron, olive, oignon'],
  ['Venezia', 'Crème fraîche, mozza, saumon fumé', ['nouveau']],
];

function slug(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function P(cat, name, desc, price, extra) {
  return Object.assign({ id: cat + '-' + slug(name), cat, name, desc, price, badges: [] }, extra || {});
}

const MENU_LABEL = 'Menu : frites + boisson';
const DRINK_LABEL = 'Boisson incluse';

const PRODUCTS = [
  /* Burgers (tous servis en menu frites + boisson) */
  P('burgers', 'Petit Fox', 'Steak, fromage, crudités au choix', 5.8, { formula: MENU_LABEL }),
  P('burgers', 'Petit Double', '2 steaks, 2 fromages, crudités au choix', 6.8, { formula: MENU_LABEL }),
  P('burgers', 'Fish Burger', 'Poisson pané, fromage, salade, sauce fish', 6.5, { formula: MENU_LABEL }),
  P('burgers', 'Country Fox', 'Galette de pomme de terre, steak, fromage, crudités au choix', 7.0, { formula: MENU_LABEL }),
  P('burgers', 'Grand Fox', '2 steaks, 2 fromages, crudités au choix', 7.1, { formula: MENU_LABEL, badges: ['best'] }),
  P('burgers', 'Boursin Fox', '2 steaks, boursin, 2 fromages, jambon de dinde, crudités au choix', 7.7, { formula: MENU_LABEL }),
  P('burgers', 'Smash Burger', 'Steak smashé, cheddar fondu, mozzarella en plus', 7.8, { formula: MENU_LABEL }),
  P('burgers', 'Chicken Pané', 'Escalope panée, crudités au choix', 7.8, { formula: MENU_LABEL }),
  P('burgers', 'King Fox', '2 steaks, escalope, fromage, crudités au choix', 7.8, { formula: MENU_LABEL }),
  P('burgers', 'Maxi Fox', '2 steaks, 2 fromages, jambon de dinde, œuf, crudités au choix', 7.9, { formula: MENU_LABEL }),
  P('burgers', 'Tenders Fox', 'Escalope panée, fromage, crudités au choix', 8.3, { formula: MENU_LABEL }),
  P('burgers', 'Géant Fox', '4 steaks, 4 fromages, crudités au choix', 9.0, { formula: MENU_LABEL }),
  P('burgers', 'Le Magnificos', '3 steaks, 3 fromages, galette de pomme de terre, crudités au choix', 9.3, { formula: MENU_LABEL }),
  P('burgers', 'Big Smash Burger', '2 steaks smashés, 2 cheddar, sauce Biggy', 9.8, { formula: MENU_LABEL, badges: ['best'] }),
  P('burgers', 'Crispy Fox', 'Tenders, fromage, crudités au choix', 9.8, { formula: MENU_LABEL }),
  P('burgers', 'Duo', 'Un Petit Fox et un Grand Fox, crudités au choix', 9.8, { formula: MENU_LABEL, badges: ['best'] }),
  P('burgers', 'Smash Burger Chèvre Miel', '2 steaks smashés, 2 fromages, chèvre, miel', 10.5, { formula: MENU_LABEL, badges: ['nouveau'] }),
  P('burgers', 'Le 180', 'Steak 180 g, fromage, œuf, jambon, crudités au choix', 10.6, { formula: MENU_LABEL }),
  P('burgers', 'Le 360', '2 steaks 180 g, fromage, œuf, jambon, crudités au choix', 11.8, { formula: MENU_LABEL, badges: ['best'] }),
  P('burgers', 'Double Duo', '4 steaks, 4 fromages, galette de pomme de terre, crudités au choix', 11.8, { formula: MENU_LABEL }),

  /* Sandwichs (menu frites + boisson) */
  P('sandwichs', 'Steak', '2 steaks, fromage, crudités au choix', 8.8, { formula: MENU_LABEL, range: 'Les essentiels' }),
  P('sandwichs', 'Merguez', 'Merguez, fromage, crudités au choix', 8.9, { formula: MENU_LABEL, range: 'Les essentiels', badges: ['epice'] }),
  P('sandwichs', 'Escalope', 'Escalope de poulet, fromage, crudités au choix', 9.5, { formula: MENU_LABEL, range: 'Les essentiels' }),
  P('sandwichs', 'Chicken jaune', 'Chicken curry, fromage, crudités au choix', 9.8, { formula: MENU_LABEL, range: 'Les essentiels' }),
  P('sandwichs', 'Chicken rouge', 'Chicken tandoori, fromage, crudités au choix', 9.8, { formula: MENU_LABEL, range: 'Les essentiels', badges: ['epice'] }),
  P('sandwichs', 'Grec', 'Kebab, crudités au choix', 9.7, { formula: MENU_LABEL }),
  P('sandwichs', 'Mixte', '2 viandes au choix, fromage, crudités au choix', 10.3, { formula: MENU_LABEL, badges: ['best'] }),
  P('sandwichs', 'Spécial', 'Chicken rouge, poivron, olive, oignon frit, cheddar, crudités au choix', 9.9, { formula: MENU_LABEL, badges: ['epice'] }),
  P('sandwichs', 'Spécial Fox', '2 viandes au choix, chèvre, fromage, miel, crudités au choix', 11.5, { formula: MENU_LABEL, badges: ['best'] }),
  P('sandwichs', 'Tentation', '2 steaks, œuf, 2 cheddars, crudités au choix', 9.3, { formula: MENU_LABEL, range: 'Les premiums' }),
  P('sandwichs', 'Mexicain', '2 steaks, poivrons, œuf, 2 fromages, crudités au choix', 9.5, { formula: MENU_LABEL, range: 'Les premiums' }),
  P('sandwichs', 'Magistral', 'Galette de pomme de terre, escalope, fromage, crudités au choix', 9.9, { formula: MENU_LABEL, range: 'Les premiums' }),
  P('sandwichs', 'Radical', 'Chicken rouge, cordon bleu, crudités au choix', 10.0, { formula: MENU_LABEL, range: 'Les premiums', badges: ['epice'] }),
  P('sandwichs', 'Royal Fox', 'Escalope, cordon bleu, fromage', 10.0, { formula: MENU_LABEL, range: 'Les premiums' }),
  P('sandwichs', 'X Trem', '2 steaks, œuf, jambon de dinde, 2 fromages, crudités au choix', 10.1, { formula: MENU_LABEL, range: 'Les premiums' }),
  P('sandwichs', 'Magic', '2 steaks, cordon bleu, 2 fromages, crudités au choix', 10.2, { formula: MENU_LABEL, range: 'Les premiums' }),
  P('sandwichs', 'Triple X', '3 steaks, œuf, 3 fromages, crudités au choix', 10.2, { formula: MENU_LABEL, range: 'Les premiums' }),
  P('sandwichs', 'Savoyard', 'Chicken blanc, lardon, cheddar, crudités au choix', 10.2, { formula: MENU_LABEL, range: 'Les premiums' }),
  P('sandwichs', 'Fabuleux', 'Viande au choix, chorizo, emmental, cheddar, jambon de dinde, poulet, crudités au choix', 10.4, { formula: MENU_LABEL, range: 'Les premiums' }),
  P('sandwichs', 'Charcutier', 'Chicken au choix, chorizo, emmental, crudités au choix', 10.5, { formula: MENU_LABEL, range: 'Les premiums' }),
  P('sandwichs', 'Quattro', '4 steaks, 4 fromages, crudités au choix', 10.8, { formula: MENU_LABEL, range: 'Les premiums' }),
  P('sandwichs', 'Mortel', 'Viande au choix, œuf, boursin, jambon de dinde, fromage, crudités au choix', 11.6, { formula: MENU_LABEL, range: 'Les premiums' }),
  P('sandwichs', 'Seven', '3 steaks, 3 fromages, chicken, escalope, crudités au choix', 11.9, { formula: MENU_LABEL, range: 'Les premiums' }),
  P('sandwichs', 'Suprême', '2 steaks, escalope, galette de pomme de terre, 2 fromages, crudités au choix', 10.9, { formula: MENU_LABEL }),
  P('sandwichs', 'Buffalo', '2 steaks, œuf, jambon de dinde, escalope, 2 fromages, crudités au choix', 11.2, { formula: MENU_LABEL }),
  P('sandwichs', 'Blindé', '2 steaks, grec, cordon bleu, escalope, 2 fromages, crudités au choix', 11.3, { formula: MENU_LABEL }),
  P('sandwichs', 'Monster Fox', '2 steaks, grec, cordon bleu, 2 fromages, oignon', 11.5, { formula: MENU_LABEL }),
  P('sandwichs', 'Five Fox', '5 steaks, 5 fromages, crudités au choix', 11.6, { formula: MENU_LABEL }),
  P('sandwichs', 'Escalope du Chef', 'Escalope, champignon, crème fraîche, œuf, fromage', 10.2, { formula: MENU_LABEL }),
  P('sandwichs', 'Tenders au four', 'Tenders, mozzarella, boursin, crudités au choix', 10.0, { formula: MENU_LABEL, badges: ['nouveau'] }),
  P('sandwichs', 'Spécial au four', 'Viande au choix, mozza gratinée, crudités au choix', 10.3, { formula: MENU_LABEL }),
  P('sandwichs', 'Croque monsieur', 'Jambon de dinde, fromage, pain de mie doré', 3, {
    formula: 'Seul ou menu',
    sizes: [
      { id: 'seul', label: 'Seul', hint: 'Sans frites ni boisson', price: 3 },
      { id: 'menu', label: 'Menu', hint: 'Frites + boisson', price: 4.5 },
    ],
  }),

  /* Bowls */
  P('bowls', 'Bowl 1 viande', 'Frites, cheddar, sauce fromage, emmental, mozzarella, 1 viande au choix, sauce au choix', 9.8, {
    formula: DRINK_LABEL, badges: ['best'],
    options: [
      { id: 'meat', label: 'Votre viande', type: 'multi', min: 1, max: 1, choices: MEATS.map(m => ({ label: m })) },
      { id: 'sauces', label: 'Vos sauces', hint: '3 maximum, au choix', type: 'multi', min: 0, max: 3, choices: SAUCES.map(s => ({ label: s })) },
      { id: 'drink', label: 'Votre boisson', type: 'single', min: 1, max: 1, choices: DRINKS.map(d => ({ label: d })) },
    ],
  }),
  P('bowls', 'Bowl 2 viandes', 'Frites, cheddar, sauce fromage, emmental, mozzarella, 2 viandes au choix, sauce au choix', 10.8, {
    formula: DRINK_LABEL,
    options: [
      { id: 'meat', label: 'Vos 2 viandes', type: 'multi', min: 1, max: 2, allowRepeat: true, choices: MEATS.map(m => ({ label: m })) },
      { id: 'sauces', label: 'Vos sauces', hint: '3 maximum, au choix', type: 'multi', min: 0, max: 3, choices: SAUCES.map(s => ({ label: s })) },
      { id: 'drink', label: 'Votre boisson', type: 'single', min: 1, max: 1, choices: DRINKS.map(d => ({ label: d })) },
    ],
  }),

  /* Crousty Fox : 10 € boisson comprise */
  P('crousty', 'Crousty Fox sauce fromage', 'Galette croustillante garnie, frites, viande au choix, sauce fromagère, boisson', 10, {
    formula: DRINK_LABEL, badges: ['best'],
    options: [
      { id: 'meat', label: 'Votre viande', type: 'multi', min: 1, max: 1, choices: MEATS.map(m => ({ label: m })) },
      { id: 'drink', label: 'Votre boisson', hint: 'Incluse', type: 'single', min: 1, max: 1, choices: DRINKS.map(d => ({ label: d })) },
    ],
  }),
  P('crousty', 'Crousty Fox spicy sucré', 'Galette croustillante, viande au choix, sauce spicy sucrée, boisson', 10, {
    formula: DRINK_LABEL, badges: ['nouveau', 'epice'],
    options: [
      { id: 'meat', label: 'Votre viande', type: 'multi', min: 1, max: 1, choices: MEATS.map(m => ({ label: m })) },
      { id: 'drink', label: 'Votre boisson', hint: 'Incluse', type: 'single', min: 1, max: 1, choices: DRINKS.map(d => ({ label: d })) },
    ],
  }),
  P('crousty', 'Crousty Fox sucré', 'Galette croustillante, viande au choix, sauce sucrée, boisson', 10, {
    formula: DRINK_LABEL,
    options: [
      { id: 'meat', label: 'Votre viande', type: 'multi', min: 1, max: 1, choices: MEATS.map(m => ({ label: m })) },
      { id: 'drink', label: 'Votre boisson', hint: 'Incluse', type: 'single', min: 1, max: 1, choices: DRINKS.map(d => ({ label: d })) },
    ],
  }),

  /* Assiettes : 12,90 €, crudités et sauces au choix, boisson +1 €. La mixte : 2 viandes. */
  P('assiettes', 'Assiette Kebab', 'Kebab, frites, crudités et sauce au choix', 12.9, { badges: ['best'], options: [CRUDITES, SAUCE_CHOICE, DRINK_PLUS] }),
  P('assiettes', 'Assiette Chicken', 'Chicken, frites, crudités et sauce au choix', 12.9, { options: [CRUDITES, SAUCE_CHOICE, DRINK_PLUS] }),
  P('assiettes', 'Assiette Chicken rouge', 'Chicken tandoori, frites, crudités et sauce au choix', 12.9, { badges: ['epice'], options: [CRUDITES, SAUCE_CHOICE, DRINK_PLUS] }),
  P('assiettes', 'Assiette Escalope', 'Escalope, frites, crudités et sauce au choix', 12.9, { options: [CRUDITES, SAUCE_CHOICE, DRINK_PLUS] }),
  P('assiettes', 'Assiette Mixte', '2 viandes au choix, frites, crudités et sauce au choix', 12.9, {
    options: [
      { id: 'meat', label: 'Vos 2 viandes', hint: 'Au choix', type: 'multi', min: 2, max: 2, allowRepeat: true, choices: MEATS.map(m => ({ label: m })) },
      CRUDITES, SAUCE_CHOICE, DRINK_PLUS,
    ],
  }),

  /* Paninis (prix à confirmer) */
  P('paninis', 'Panini seul', 'Pain panini grillé, viande au choix, fromage', 6.5, {
    formula: 'Seul', tbc: true,
    options: [{ id: 'meat', label: 'Votre garniture', type: 'multi', min: 1, max: 1, choices: ['Chicken jaune', 'Chicken rouge', 'Escalope', 'Jambon de dinde', 'Jambon de poulet', 'Kebab', 'Merguez', 'Poulet', 'Saumon', 'Steak', 'Thon', 'Viande hachée'].map(m => ({ label: m })) }],
  }),
  P('paninis', 'Panini menu', 'Panini au choix, frites et boisson', 8.5, {
    formula: MENU_LABEL, tbc: true,
    options: [
      { id: 'meat', label: 'Votre garniture', type: 'multi', min: 1, max: 1, choices: ['Chicken jaune', 'Chicken rouge', 'Escalope', 'Jambon de dinde', 'Jambon de poulet', 'Kebab', 'Merguez', 'Poulet', 'Saumon', 'Steak', 'Thon', 'Viande hachée'].map(m => ({ label: m })) },
      { id: 'drink', label: 'Votre boisson', type: 'single', min: 1, max: 1, choices: DRINKS.map(d => ({ label: d })) },
    ],
  }),

  /* Pâtes : 10,50 €, 11,50 € avec la boisson */
  P('pates', 'Penne', 'Penne, sauce au choix, viande au choix, fromage râpé', 10.5, {
    priceFrom: true,
    sizes: [
      { id: 'seul', label: 'Seul', hint: 'Sans boisson', price: 10.5 },
      { id: 'boisson', label: 'Avec boisson', hint: '11,50 €', price: 11.5 },
    ],
    options: [
      { id: 'sauce', label: 'Votre sauce', type: 'single', min: 1, max: 1, choices: [{ label: 'Tomate' }, { label: 'Crème' }, { label: 'Bolognaise' }] },
      { id: 'meat', label: 'Votre viande', type: 'multi', min: 1, max: 1, choices: MEATS.map(m => ({ label: m })) },
      { id: 'drink', label: 'Votre boisson', hint: 'Incluse', type: 'single', min: 1, max: 1, sizeCodes: ['boisson'], choices: CREPE_DRINKS.map(label => ({ label })) },
    ],
  }),
  P('pates', 'Tagliatelle', 'Tagliatelles, sauce au choix, viande au choix, fromage râpé', 10.5, {
    priceFrom: true,
    sizes: [
      { id: 'seul', label: 'Seul', hint: 'Sans boisson', price: 10.5 },
      { id: 'boisson', label: 'Avec boisson', hint: '11,50 €', price: 11.5 },
    ],
    options: [
      { id: 'sauce', label: 'Votre sauce', type: 'single', min: 1, max: 1, choices: [{ label: 'Tomate' }, { label: 'Crème' }, { label: 'Bolognaise' }] },
      { id: 'meat', label: 'Votre viande', type: 'multi', min: 1, max: 1, choices: MEATS.map(m => ({ label: m })) },
      { id: 'drink', label: 'Votre boisson', hint: 'Incluse', type: 'single', min: 1, max: 1, sizeCodes: ['boisson'], choices: CREPE_DRINKS.map(label => ({ label })) },
    ],
  }),

  /* Salades : boisson +1 € */
  P('salades', 'César', 'Salade, tomate, croûtons, escalope de poulet', 6.5, { badges: ['best'], options: [DRINK_PLUS] }),
  P('salades', 'Italienne', 'Salade, tomate, olive, anchois, maïs', 6.0, { options: [DRINK_PLUS] }),
  P('salades', 'Fox', 'Salade, thon, tomate, olive', 6.0, { options: [DRINK_PLUS] }),
  P('salades', 'Du Chef', 'Salade, tomate, champignon, jambon', 6.0, { options: [DRINK_PLUS] }),
  P('salades', 'Norvégienne', 'Salade, tomate, saumon, crème fraîche, champignons', 6.5, { tbc: true, options: [DRINK_PLUS] }),

  /* Milkshakes : supplément 1,20 €, topping 0,60 €, chantilly que l'on peut retirer */
  P('milkshakes', 'Milkshake à composer', 'Vanille ou autre parfum. Chantilly seulement si vous la prenez.', 4.2, {
    options: [
      { id: 'base', label: 'Base', hint: 'Sportive : lait ou jus de pomme', type: 'single', min: 1, max: 1, choices: [{ label: 'Lait' }, { label: 'Jus de pomme' }] },
      { id: 'flavor', label: 'Votre parfum', type: 'single', min: 1, max: 1, choices: ['Vanille', 'Fraise', 'Chocolat', 'Oreo', 'Kinder Bueno', 'Spéculoos', 'Caramel beurre salé', 'Pistache'].map(f => ({ label: f })) },
      { id: 'chantilly', label: 'Chantilly', hint: 'Gratuite. Ne la cochez pas si vous n\'en voulez pas', type: 'single', min: 0, max: 1, choices: [{ label: 'Chantilly' }] },
      { id: 'topping', label: 'Topping', hint: 'Autant que vous voulez', type: 'multi', min: 0, max: CREPE_TOPPINGS.length, choices: CREPE_TOPPINGS.map(label => ({ label, price: 0.6 })) },
      { id: 'supp', label: 'Supplément', hint: 'Autant que vous voulez', type: 'multi', min: 0, max: CREPE_SUPPS.length, choices: CREPE_SUPPS.map(label => ({ label, price: 1.2 })) },
    ],
  }),

  /* Smoothies */
  P('smoothies', 'Coconut Crush', 'Ananas, lait de coco', 4.2),
  P('smoothies', 'Green Reviver', 'Banane, chou kale, mangue, citronnelle', 4.2),
  P('smoothies', 'Pineapple Sunset', 'Ananas, mangue, papaye', 4.2, { badges: ['best'] }),
  P('smoothies', 'Raspberry Heaven', 'Pomme, framboise, mangue, myrtille', 4.2),
  P('smoothies', 'Strawberry Fantasy', 'Fraise, banane', 4.2),
  P('smoothies', 'Berry Cherry', 'Cerise, banane, fraise, cassis', 4.2),

  /* Crêpes. Base salée non confirmée (6,50 €). Sucrées : prix de la caisse. */
  P('crepes', 'Crêpe salée', 'À composer. Sauces incluses, suppléments au choix.', 6.5, {
    tbc: true,
    options: [
      { id: 'sauces', label: 'Vos sauces', hint: '3 maximum, au choix', type: 'multi', min: 0, max: 3, choices: SAUCES.map(label => ({ label })) },
      { id: 'extra-meat', label: 'Supplément viande', hint: 'Autant que vous voulez', type: 'multi', min: 0, max: CREPE_MEATS.length, choices: CREPE_MEATS.map(label => ({ label, price: 1.8 })) },
      { id: 'cheeses', label: 'Supplément fromage', hint: 'Autant que vous voulez', type: 'multi', min: 0, max: CREPE_CHEESES.length, choices: CREPE_CHEESES.map(label => ({ label, price: 0.9 })) },
      { id: 'veg', label: 'Supplément légume', hint: 'Autant que vous voulez', type: 'multi', min: 0, max: CREPE_VEG.length, choices: CREPE_VEG.map(label => ({ label, price: 0.8 })) },
      { id: 'drink', label: 'Boisson', hint: '1 € en plus', type: 'single', min: 0, max: 1, choices: CREPE_DRINKS.map(label => ({ label, price: 1 })) },
    ],
  }),
  P('crepes', 'Crêpe sucre', 'Crêpe au sucre', 2.5, { options: SWEET_EXTRAS }),
  P('crepes', 'Crêpe confiture', 'Crêpe à la confiture', 2.8, { options: SWEET_EXTRAS }),
  P('crepes', 'Crêpe Nutella', 'Crêpe au Nutella', 3.5, { options: SWEET_EXTRAS }),
  P('crepes', 'Crêpe Nutella banane', 'Crêpe Nutella et banane', 4.2, { options: SWEET_EXTRAS }),
  P('crepes', 'Crêpe Nutella banane coco', 'Crêpe Nutella, banane et noix de coco', 4.8, { options: SWEET_EXTRAS }),

  /* Desserts : seulement tiramisu et tarte au Daim. 4 pour le prix de 3, les deux comptent ensemble. Prix encore à confirmer. */
  P('desserts', 'Tiramisu', 'Classique au café ou spéculoos', 3.5, { tbc: true, formula: '3 achetés = 1 offert', options: [{ id: 'v', label: 'Version', type: 'single', min: 1, max: 1, choices: [{ label: 'Café' }, { label: 'Spéculoos' }, { label: 'Nutella' }] }] }),
  P('desserts', 'Tarte au Daim', 'Caramel et éclats de Daim', 3.5, { tbc: true, formula: '3 achetés = 1 offert' }),

  /* Menu enfant (prix à confirmer) */
  P('enfant', 'Menu Fox Kids', 'Nuggets ou petit burger, petites frites, boisson, surprise', 6.9, {
    tbc: true,
    options: [
      { id: 'main', label: 'Le plat', type: 'single', min: 1, max: 1, choices: [{ label: '4 nuggets' }, { label: 'Petit Fox burger' }, { label: 'Petit tacos' }] },
      { id: 'drink', label: 'La boisson', type: 'single', min: 1, max: 1, choices: [{ label: 'Capri-Sun' }, { label: 'Eau' }, { label: 'Jus de pomme' }] },
    ],
  }),

  /* Boissons (prix à confirmer) */
  P('boissons', 'Coca-Cola 33 cl', 'Canette', 1.8, { tbc: true }),
  P('boissons', 'Coca-Cola Zéro 33 cl', 'Canette', 1.8, { tbc: true }),
  P('boissons', 'Fanta 33 cl', 'Canette', 1.8, { tbc: true }),
  P('boissons', 'Sprite 33 cl', 'Canette', 1.8, { tbc: true }),
  P('boissons', 'Oasis Tropical 33 cl', 'Canette', 1.8, { tbc: true }),
  P('boissons', 'Ice Tea 33 cl', 'Canette', 1.8, { tbc: true }),
  P('boissons', 'Eau minérale 50 cl', 'Bouteille', 1.2, { tbc: true }),
  P('boissons', 'Coca-Cola 1,5 L', 'Bouteille à partager', 3.5, { tbc: true }),
];

function withMozza(desc) {
  return /mozza/i.test(desc) ? desc : `${desc}, mozza`;
}

/* Base au choix, garniture affichée et retirable, boisson en plus. */
function pizzaOptions(desc) {
  const parts = desc.split(',').map(s => s.trim()).filter(Boolean);
  const bases = [];
  const garnish = [];
  for (const part of parts) {
    const label = part.charAt(0).toUpperCase() + part.slice(1);
    if (/^(sauce |crème )/i.test(part)) bases.push(label);
    else garnish.push(label);
  }
  const choices = [{ label: 'Sauce tomate' }, { label: 'Crème fraîche' }];
  for (const label of bases) {
    if (!choices.some(c => c.label.toLowerCase() === label.toLowerCase())) choices.push({ label });
  }
  const options = [
    { id: 'base', label: 'Base', hint: 'Sauce tomate ou crème fraîche', type: 'single', min: 1, max: 1, choices },
  ];
  if (garnish.length) {
    options.push({ id: 'remove', label: 'Retirer un ingrédient', hint: 'Seulement si vous n\'en voulez pas', type: 'multi', min: 0, max: garnish.length, choices: garnish.map(label => ({ label })) });
  }
  options.push({
    id: 'drink', label: 'Boisson en plus', hint: 'Canette 1 €, grande 3 €. 2 Mega ou 4 Senior : la grande est offerte', type: 'single', min: 0, max: 1,
    choices: [...CREPE_DRINKS.map(label => ({ label, price: 1 })), { label: 'Grande boisson', price: 3 }],
  });
  return options;
}

/* Pizzas générées à partir des recettes (prix selon le format) */
PIZZAS.forEach(([name, desc, badges]) => {
  const text = withMozza(desc);
  PRODUCTS.push(P('pizzas', name, text, PIZZA_SIZES[0].price, {
    priceFrom: true,
    sizes: PIZZA_SIZES,
    badges: badges || [],
    bogo: true,
    options: pizzaOptions(text),
  }));
});

const BEST_SELLERS = [
  { kind: 'tacos', title: 'Tacos à composer', sub: 'Dès 8,10 € · frites, sauce fromagère et boisson incluses', cat: 'tacos' },
  { kind: 'product', id: 'burgers-le-360', cat: 'burgers' },
  { kind: 'product', id: 'burgers-grand-fox', cat: 'burgers' },
  { kind: 'product', id: 'burgers-duo', cat: 'burgers' },
  { kind: 'product', id: 'bowls-bowl-1-viande', cat: 'bowls' },
  { kind: 'product', id: 'crousty-crousty-fox-sauce-fromage', cat: 'crousty' },
];

const BADGE_LABELS = { best: 'Best-seller', nouveau: 'Nouveau', epice: 'Épicé' };

/* Commandes passées de démonstration pour l'espace client */
const DEMO_ORDERS = [
  {
    id: 'TF-2037', date: '2026-10-08T19:42:00', mode: 'emporter', status: 'done', total: 21.0,
    items: [
      { key: 'demo-1', name: 'Tacos L', cat: 'tacos', qty: 1, unit: 10.2, details: ['Kebab, Chicken rouge', 'Algérienne, Samouraï', 'Coca-Cola'] },
      { key: 'demo-2', name: 'Big Smash Burger', cat: 'burgers', qty: 1, unit: 9.8, details: ['Menu : frites + boisson'] },
      { key: 'demo-3', name: 'Cookie', cat: 'desserts', qty: 1, unit: 1.0, details: [] },
    ],
  },
  {
    id: 'TF-2012', date: '2026-09-27T20:15:00', mode: 'livraison', status: 'done', total: 25.7,
    items: [
      { key: 'demo-4', name: 'Pizza Raclette Fox', cat: 'pizzas', qty: 1, unit: 12.6, details: ['Mega', 'Pizza offerte : La Texane Fox'] },
      { key: 'demo-5', name: 'Bowl 1 viande', cat: 'bowls', qty: 1, unit: 9.8, details: ['Escalope', 'Biggy', 'Fanta'] },
      { key: 'demo-6', name: 'Pineapple Sunset', cat: 'smoothies', qty: 1, unit: 4.2, details: [] },
    ],
  },
];

const DEMO_ADDRESSES = [
  { id: 'a1', label: 'Maison', line1: '12 rue Jean Jaurès', extra: 'Bât. B, 3e étage', city: '93240 Stains', isDefault: true },
  { id: 'a2', label: 'Travail', line1: '4 avenue Paul Vaillant-Couturier', extra: '', city: '93240 Stains', isDefault: false },
];

module.exports = { RESTAURANT, CATEGORIES, MEATS, SAUCES, CHEESES, GRATINS, DRINKS, TACOS, PIZZA_SIZES, PRODUCTS, BEST_SELLERS };
