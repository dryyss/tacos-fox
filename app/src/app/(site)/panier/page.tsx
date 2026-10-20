import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Checkout } from '@/components/checkout/Checkout';
import { getCheckoutContext } from '@/lib/checkout-context';

export const metadata: Metadata = { title: 'Mon panier', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function CartPage() {
  const ctx = await getCheckoutContext();
  return <Suspense><Checkout step="panier" ctx={ctx} /></Suspense>;
}
