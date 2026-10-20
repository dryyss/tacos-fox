import { describe, expect, it } from 'vitest';
import { computeTotals, priceLine, PricingError } from './pricing';
import type { CatalogGroup, CatalogProduct } from './catalog-types';

const choice = (id: string, price = 0, isAvailable = true) => ({ id, label: id, price, isAvailable });
const group = (key: string, o: Partial<CatalogGroup>): CatalogGroup => ({
  id: key, key, label: key, hint: null, min: 0, max: 1, maxFromSize: false, allowRepeat: false, choices: [], ...o,
});
const product = (o: Partial<CatalogProduct>): CatalogProduct => ({
  id: 'p', slug: 'p', categorySlug: 'c', kind: 'STANDARD', name: 'Produit', description: '', formula: null, range: null,
  price: 500, priceFrom: false, badges: [], allergens: [], imageUrl: null, tbc: false, isAvailable: true, isFeatured: false,
  sizes: [], groups: [], ...o,
});

const tacos = product({
  id: 'tacos', kind: 'TACOS', name: 'Tacos à composer', price: 810,
  sizes: [
    { code: 'M', label: 'M', hint: null, price: 910, includedQty: 1, bogo: false },
    { code: 'XL', label: 'XL', hint: null, price: 1330, includedQty: 3, bogo: false },
  ],
  groups: [
    group('meats', { min: 1, max: 4, maxFromSize: true, allowRepeat: true, choices: [choice('Kebab'), choice('Escalope')] }),
    group('sauces', { max: 2, choices: [choice('Algérienne'), choice('Samouraï'), choice('Biggy')] }),
    group('cheeses', { max: 3, choices: [choice('Cheddar', 70), choice('Kiri', 60)] }),
    group('drink', { min: 1, choices: [choice('Coca-Cola'), choice('Fanta', 0, false)] }),
  ],
});

describe('priceLine', () => {
  it('additionne taille et suppléments, multiplie par la quantité', () => {
    const l = priceLine(tacos, { productId: 'tacos', qty: 2, sizeCode: 'XL', selections: { meats: ['Kebab', 'Kebab', 'Escalope'], cheeses: ['Cheddar', 'Kiri'], drink: ['Coca-Cola'] } });
    expect(l.unitPrice).toBe(1330 + 70 + 60);
    expect(l.lineTotal).toBe(2 * 1460);
    expect(l.name).toBe('Tacos XL');
    expect(l.details).toEqual(['Kebab x2, Escalope', 'Sans sauce', 'Suppl. Cheddar, Kiri', 'Coca-Cola']);
  });

  it('limite les viandes selon la taille', () => {
    expect(() => priceLine(tacos, { productId: 'tacos', qty: 1, sizeCode: 'M', selections: { meats: ['Kebab', 'Escalope'], drink: ['Coca-Cola'] } }))
      .toThrow(PricingError);
  });

  it('refuse un choix minimum manquant, un doublon, un choix en rupture ou inconnu', () => {
    const base = { productId: 'tacos', qty: 1, sizeCode: 'M' };
    expect(() => priceLine(tacos, { ...base, selections: { meats: ['Kebab'] } })).toThrow(/boisson|drink/);
    expect(() => priceLine(tacos, { ...base, selections: { meats: ['Kebab'], sauces: ['Biggy', 'Biggy'], drink: ['Coca-Cola'] } })).toThrow(/double/);
    expect(() => priceLine(tacos, { ...base, selections: { meats: ['Kebab'], drink: ['Fanta'] } })).toThrow(/rupture/);
    expect(() => priceLine(tacos, { ...base, selections: { meats: ['Poulet'], drink: ['Coca-Cola'] } })).toThrow(/n'existe plus/);
    expect(() => priceLine(tacos, { ...base, selections: { meats: ['Kebab'], drink: ['Coca-Cola'], hack: ['x'] } })).toThrow(/inconnue/);
  });

  it('refuse une taille absente, une quantité hors bornes et un produit en rupture', () => {
    expect(() => priceLine(tacos, { productId: 'tacos', qty: 1, sizeCode: 'XXXL' })).toThrow(/taille/);
    expect(() => priceLine(product({}), { productId: 'p', qty: 0 })).toThrow(/Quantité/);
    expect(() => priceLine(product({}), { productId: 'p', qty: 21 })).toThrow(/Quantité/);
    expect(() => priceLine(product({ isAvailable: false }), { productId: 'p', qty: 1 })).toThrow(/rupture/);
    expect(() => priceLine(undefined, { productId: 'x', qty: 1 })).toThrow(/plus disponible/);
  });

  it('gère la pizza offerte sur les tailles éligibles', () => {
    const sizes = [
      { code: 'junior', label: 'Junior', hint: null, price: 720, includedQty: 1, bogo: false },
      { code: 'mega', label: 'Mega', hint: null, price: 1260, includedQty: 1, bogo: true },
    ];
    const regina = product({ id: 'regina', kind: 'PIZZA', name: 'Regina', sizes });
    const texane = product({ id: 'texane', kind: 'PIZZA', name: 'La Texane Fox', sizes });
    const burger = product({ id: 'burger', name: 'Burger' });
    const catalog = [regina, texane, burger];

    const mega = priceLine(regina, { productId: 'regina', qty: 1, sizeCode: 'mega', freePizzaId: 'texane' }, catalog);
    expect(mega.unitPrice).toBe(1260);
    expect(mega.details).toEqual(['Mega', 'Pizza offerte : La Texane Fox']);

    const junior = priceLine(regina, { productId: 'regina', qty: 1, sizeCode: 'junior', freePizzaId: 'texane' }, catalog);
    expect(junior.details).toEqual(['Junior']);

    expect(() => priceLine(regina, { productId: 'regina', qty: 1, sizeCode: 'mega', freePizzaId: 'burger' }, catalog)).toThrow(/offerte/);
  });

  it('sandwich : suppléments payants, crudités vides signalées, accompagnement et boisson', () => {
    const sandwich = product({
      id: 'grec', name: 'Grec', price: 970, formula: 'Menu : frites + boisson',
      groups: [
        group('crudites', { max: 3, choices: [choice('Salade'), choice('Tomate'), choice('Oignon')] }),
        group('sauces', { max: 2, choices: [choice('Blanche'), choice('Samouraï')] }),
        group('extra-meat', { max: 3, choices: [choice('Kebab', 180), choice('Saumon', 250)] }),
        group('cheeses', { max: 3, choices: [choice('Cheddar', 70)] }),
        group('side', { min: 1, choices: [choice('Frites'), choice('Potatoes', 100)] }),
        group('extras', { max: 2, choices: [choice('Frites supplémentaires', 150)] }),
        group('drink', { min: 1, choices: [choice('Coca-Cola')] }),
      ],
    });
    const l = priceLine(sandwich, { productId: 'grec', qty: 1, selections: { sauces: ['Blanche'], 'extra-meat': ['Kebab'], cheeses: ['Cheddar'], side: ['Potatoes'], drink: ['Coca-Cola'] } });
    expect(l.unitPrice).toBe(970 + 180 + 70 + 100);
    expect(l.details).toEqual(['Sans crudités', 'Blanche', 'Suppl. viande Kebab', 'Suppl. Cheddar', 'Potatoes', 'Coca-Cola']);
    expect(() => priceLine(sandwich, { productId: 'grec', qty: 1, selections: { drink: ['Coca-Cola'] } })).toThrow(/accompagnement|side/i);
  });

  it('affiche la formule pour un produit simple', () => {
    expect(priceLine(product({ formula: 'Menu : frites + boisson' }), { productId: 'p', qty: 1 }).details).toEqual(['Menu : frites + boisson']);
  });
});

describe('computeTotals', () => {
  const zone = { fee: 250, freeFrom: 2500, minimum: 1500 };

  it('ajoute les frais de livraison sous le seuil et signale le minimum manquant', () => {
    expect(computeTotals([{ lineTotal: 1200 }], 'LIVRAISON', zone)).toEqual({ subtotal: 1200, deliveryFee: 250, discount: 0, total: 1450, minimumMissing: 300 });
  });

  it('offre la livraison au-delà du seuil', () => {
    expect(computeTotals([{ lineTotal: 2500 }], 'LIVRAISON', zone).deliveryFee).toBe(0);
  });

  it('ignore la zone hors livraison', () => {
    expect(computeTotals([{ lineTotal: 1200 }], 'EMPORTER', zone)).toMatchObject({ deliveryFee: 0, minimumMissing: 0, total: 1200 });
  });

  it('applique les remises en pourcentage et en montant, plafonnées au sous-total', () => {
    expect(computeTotals([{ lineTotal: 2000 }], 'EMPORTER', null, { code: 'A', type: 'PERCENT', value: 10, minSubtotal: 0 }).total).toBe(1800);
    expect(computeTotals([{ lineTotal: 300 }], 'EMPORTER', null, { code: 'B', type: 'FIXED', value: 500, minSubtotal: 0 }).total).toBe(0);
    expect(computeTotals([{ lineTotal: 1000 }], 'EMPORTER', null, { code: 'C', type: 'FIXED', value: 500, minSubtotal: 1500 }).discount).toBe(0);
  });
});
