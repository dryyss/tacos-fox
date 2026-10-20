/* Options des sandwichs et burgers, d'après la feuille « Options » du relevé de la borne
   (pics/Carte_Tacos_Fox.xlsx). Prix en euros. Le gérant les ajuste ensuite dans la gestion. */

export type PresetChoice = { label: string; price?: number; isAvailable?: boolean };
export type PresetGroup = { key: string; label: string; hint?: string; min: number; max: number; choices: PresetChoice[] };

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

/* Groupes à proposer pour un sandwich ou un burger selon sa description et sa formule */
export function sandwichGroups(p: { description: string; formula: string | null }): PresetGroup[] {
  const isMenu = /frites/i.test(p.formula ?? '');
  const groups: PresetGroup[] = [];
  if (/crudit/i.test(p.description)) {
    groups.push({ key: 'crudites', label: 'Vos crudités', hint: 'Laissez vide pour sans crudités', min: 0, max: 3, choices: [{ label: 'Salade' }, { label: 'Tomate' }, { label: 'Oignon' }] });
  }
  groups.push(
    { key: 'sauces', label: 'Vos sauces', hint: '2 maximum, incluses', min: 0, max: 2, choices: SAUCES.map(label => ({ label })) },
    { key: 'extra-meat', label: 'Supplément viande', hint: 'Optionnel', min: 0, max: 3, choices: EXTRA_MEATS },
    { key: 'cheeses', label: 'Supplément fromage', hint: 'Optionnel', min: 0, max: 3, choices: EXTRA_CHEESES },
  );
  if (isMenu) {
    groups.push(
      { key: 'side', label: 'Votre accompagnement', hint: 'Inclus dans le menu', min: 1, max: 1, choices: [{ label: 'Frites' }] },
      { key: 'extras', label: 'En plus', hint: 'Optionnel', min: 0, max: 2, choices: [{ label: 'Frites supplémentaires', price: 1.5 }] },
      { key: 'drink', label: 'Votre boisson', hint: 'Incluse dans le menu', min: 1, max: 1, choices: DRINKS.map(label => ({ label })) },
    );
  }
  return groups;
}

export const SANDWICH_CATEGORIES = ['sandwichs', 'burgers'];
