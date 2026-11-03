import 'server-only';
import type { Restaurant } from './catalog';
import type { ModeInfo } from '@/components/site/ModeLinks';
import { formatPrice } from './money';

/* Modes proposés : à emporter (formule Essentiel), livraison si l'option O5 est active */
export function modeInfos({ settings, zones }: Pick<Restaurant, 'settings' | 'zones'>): ModeInfo[] {
  const modes: ModeInfo[] = [];
  modes.push({ id: 'EMPORTER', label: 'À emporter', icon: 'takeaway', note: 'Choisissez votre créneau de retrait. Passez directement au comptoir, votre commande vous attend.' });
  if (settings.modeLivraison && zones.length) modes.push({ id: 'LIVRAISON', label: 'Livraison', icon: 'scooter', note: deliveryNote(zones) });
  return modes;
}

export function deliveryNote(zones: Restaurant['zones']): string {
  const fee = Math.min(...zones.map(z => z.fee));
  const free = zones.map(z => z.freeFrom).filter((v): v is number => v != null);
  const min = Math.min(...zones.map(z => z.minimum));
  return [
    `Livraison ${zones.every(z => z.fee === fee) ? '' : 'dès '}${formatPrice(fee)}`,
    free.length ? `, offerte dès ${formatPrice(Math.min(...free))}` : '',
    '.',
    min > 0 ? ` Minimum de commande ${formatPrice(min)}.` : '',
  ].join('');
}
