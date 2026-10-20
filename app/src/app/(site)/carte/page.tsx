import type { Metadata } from 'next';
import { MenuBrowser } from '@/components/menu/MenuBrowser';
import { QueryMode } from '@/components/menu/QueryMode';
import { getCatalog } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'La carte',
  description: 'Tacos à composer, burgers, pizzas (1 achetée = 1 offerte), sandwichs, bowls, Crousty Fox et desserts. Commande en ligne à Stains.',
};
export const dynamic = 'force-dynamic';

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ cat?: string; mode?: string; table?: string }> }) {
  const [{ cat, mode, table }, catalog] = await Promise.all([searchParams, getCatalog()]);
  return <><QueryMode mode={mode} table={table} /><MenuBrowser catalog={catalog} initialCat={cat} /></>;
}
