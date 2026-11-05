/* Options des sandwichs et burgers, d'après la feuille « Options » du relevé de la borne
   (pics/Carte_Tacos_Fox.xlsx). Prix en euros. Le gérant les ajuste ensuite dans la gestion. */

export type PresetChoice = { label: string; price?: number; isAvailable?: boolean };
export type PresetGroup = { key: string; label: string; hint?: string; min: number; max: number; allowRepeat?: boolean; sizeCodes?: string[]; choices: PresetChoice[] };

/* Burgers et sandwichs vendus seuls ou en menu. Le relevé donne le prix menu ; seul = menu − 2,50 € (décision du 03/11/2026, à confirmer par le client). */
export const MENU_SUPPLEMENT = 2.5;
export const isMenuFormula = (formula: string | null | undefined) => /frites/i.test(formula ?? '');
export const SEUL_MENU_FORMULA = 'Seul ou menu';
export function formulaSizes(menuPrice: number) {
  return [
    { code: 'seul', label: 'Seul', hint: 'Sans frites ni boisson', price: Math.round((menuPrice - MENU_SUPPLEMENT) * 100) / 100 },
    { code: 'menu', label: 'Menu', hint: 'Frites + boisson', price: menuPrice },
  ];
}

const SAUCES = ['Algérienne', 'Andalouse', 'Barbecue', 'Biggy', 'Cheezy', 'Chili thaï', 'Curry', 'Fish', 'Harissa', 'Ketchup', 'Mayonnaise', 'Poivre', 'Samouraï', 'Sauce blanche', 'Yopie'];

const EXTRA_MEATS: PresetChoice[] = [
  { label: 'Chorizo', price: 1.8 }, { label: 'Cordon bleu', price: 1.8 }, { label: 'Dinde', price: 1.8 },
  { label: 'Escalope', price: 1.8 }, { label: 'Escalope curry', price: 1.8 }, { label: 'Escalope tandoori', price: 1.8 },
  { label: 'Kebab', price: 1.8 }, { label: 'Lardon', price: 1.8 }, { label: 'Merguez', price: 1.8 },
  { label: 'Nuggets', price: 1.8 }, { label: 'Saumon', price: 2.5 }, { label: 'Tenders', price: 1.5 },
  { label: 'Thon', price: 1.8 }, { label: 'Viande hachée', price: 1.8 },
];

const EXTRA_CHEESES: PresetChoice[] = [
  { label: 'Bleu', price: 0.6 }, { label: 'Boursin', price: 0.6 }, { label: 'Cheddar', price: 0.7 },
  { label: 'Chèvre', price: 0.7 }, { label: 'Emmental', price: 0.6 }, { label: 'Kiri', price: 0.6 },
  { label: 'Mozzarella', price: 0.7 },
  // Vu sur l'écran mural, prix absent de la borne : masqué tant que le restaurant ne l'a pas fixé
  { label: 'Raclette', price: 0.7, isAvailable: false },
];

const DRINKS = ['Coca-Cola', 'Coca-Cola Zéro', 'Fanta', 'Sprite', 'Oasis Tropical', 'Ice Tea', 'Eau'];
const MEAT_CHOICES = ['Chicken jaune', 'Chicken rouge', 'Cordon bleu', 'Escalope', 'Kebab', 'Merguez', 'Nuggets', 'Tenders', 'Viande hachée'];

/* Groupes à proposer pour un sandwich ou un burger.
   Burgers : pas de supplément viande. Menus : plus de frites en supplément. Sauces : 3 max, jamais obligatoires. */
export function sandwichGroups(p: { description: string; formula: string | null; category?: string }): PresetGroup[] {
  const isMenu = isMenuFormula(p.formula) || p.formula === SEUL_MENU_FORMULA;
  const sandwich = p.category === 'sandwichs';
  const groups: PresetGroup[] = [];
  if (sandwich || /crudit/i.test(p.description)) {
    groups.push({ key: 'crudites', label: 'Vos crudités', hint: 'Au choix, laissez vide pour sans', min: 0, max: 3, choices: [{ label: 'Salade' }, { label: 'Tomate' }, { label: 'Oignon' }] });
  }
  const meats = /2 viandes au choix/i.test(p.description) ? 2 : /viande au choix/i.test(p.description) ? 1 : 0;
  if (meats) {
    groups.push({ key: 'meat', label: meats > 1 ? 'Vos viandes' : 'Votre viande', hint: 'Au choix', min: meats, max: meats, allowRepeat: true, choices: MEAT_CHOICES.map(label => ({ label })) });
  }
  groups.push({ key: 'sauces', label: 'Vos sauces', hint: '3 maximum, au choix', min: 0, max: 3, choices: SAUCES.map(label => ({ label })) });
  if (p.category !== 'burgers') groups.push({ key: 'extra-meat', label: 'Supplément viande', hint: 'Optionnel', min: 0, max: 3, choices: EXTRA_MEATS });
  groups.push({ key: 'cheeses', label: 'Supplément fromage', hint: 'Optionnel', min: 0, max: 3, choices: EXTRA_CHEESES });
  if (isMenu) {
    groups.push(
      { key: 'side', label: 'Votre accompagnement', hint: 'Inclus dans le menu', min: 1, max: 1, sizeCodes: ['menu'], choices: [{ label: 'Frites' }] },
      { key: 'drink', label: 'Votre boisson', hint: 'Incluse dans le menu', min: 1, max: 1, sizeCodes: ['menu'], choices: DRINKS.map(label => ({ label })) },
    );
  }
  return groups;
}

export const SANDWICH_CATEGORIES = ['sandwichs', 'burgers'];
