'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireStaff } from '@/lib/admin';
import { onboardingLink, refreshAccount, shareAccount, unlinkAccount } from '@/lib/connect';

/* Ouvre (ou reprend) l'ouverture du compte Stripe de la société, avec le gérant */
export async function startOnboarding(form: FormData) {
  await requireStaff('payments');
  const url = await onboardingLink(String(form.get('restaurantId')));
  redirect(url);
}

export async function refresh(form: FormData) {
  await requireStaff('payments');
  await refreshAccount(String(form.get('restaurantId')));
  revalidatePath('/admin/paiements');
}

export async function share(form: FormData) {
  await requireStaff('payments');
  const from = String(form.get('fromId') ?? '');
  if (from) await shareAccount(String(form.get('restaurantId')), from);
  revalidatePath('/admin/paiements');
}

export async function unlink(form: FormData) {
  await requireStaff('payments');
  await unlinkAccount(String(form.get('restaurantId')));
  revalidatePath('/admin/paiements');
}
