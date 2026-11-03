'use server';

import { revalidatePath } from 'next/cache';
import type { OrderStatus } from '@prisma/client';
import { requireOrderAccess } from '@/lib/admin';
import { cancelOrder, markPaidOnsite, markPrinted, OrderActionError, setOrderStatus } from '@/lib/order-admin';
import { refundOrder, RefundError } from '@/lib/refunds';

export interface AdminResult { ok: boolean; error?: string }

async function guard(orderId: string, fn: () => Promise<unknown>): Promise<AdminResult> {
  await requireOrderAccess(orderId);
  try {
    await fn();
    revalidatePath('/admin', 'layout');
    return { ok: true };
  } catch (e) {
    if (e instanceof OrderActionError || e instanceof RefundError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: 'Action impossible, réessayez.' };
  }
}

export const changeStatus = async (id: string, status: OrderStatus) => guard(id, () => setOrderStatus(id, status));
export const cancel = async (id: string, reason: string) => guard(id, () => cancelOrder(id, reason.trim() || 'Annulée par le restaurant'));
export const collectOnsite = async (id: string) => guard(id, () => markPaidOnsite(id));
export const printed = async (id: string) => guard(id, () => markPrinted(id));
export const refund = async (id: string, cents: number, reason: string) => guard(id, () => refundOrder(id, cents, reason.trim() || 'Geste commercial'));
