import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Checkout } from '@/components/checkout/Checkout';
import { getCheckoutContext } from '@/lib/checkout-context';

export const metadata: Metadata = { title: 'Retrait', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function PickupPage() {
  const ctx = await getCheckoutContext();
  return <Suspense><Checkout step="commande" ctx={ctx} /></Suspense>;
}
