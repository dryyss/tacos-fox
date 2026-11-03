import { redirect } from 'next/navigation';
import { getCurrentRestaurant } from '@/lib/restaurants';

/* Ancienne page « Infos pratiques » (un seul restaurant) : renvoie vers la page du restaurant choisi, ou la liste */
export default async function InfosPage() {
  const current = await getCurrentRestaurant();
  redirect(current ? `/restaurants/${current.slug}` : '/restaurants');
}
