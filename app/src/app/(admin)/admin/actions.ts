'use server';

import { revalidatePath } from 'next/cache';
import type { OrderStatus } from '@prisma/client';
import { requireStaff } from '@/lib/admin';
import { cancelOrder, markPaidOnsite, markPrinted, OrderActionError, setOrderStatus } from '@/lib/order-admin';
import { refundOrder, RefundError } from '@/lib/refunds';

export interface AdminResult { ok: boolean; error?: string }

async function guard(fn: () => Promise<unknown>): Promise<AdminResult> {
  await requireStaff();
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

export const changeStatus = async (id: string, status: OrderStatus) => guard(() => setOrderStatus(id, status));
export const cancel = async (id: string, reason: string) => guard(() => cancelOrder(id, reason.trim() || 'Annulée par le restaurant'));
export const collectOnsite = async (id: string) => guard(() => markPaidOnsite(id));
export const printed = async (id: string) => guard(() => markPrinted(id));
export const refund = async (id: string, cents: number, reason: string) => guard(() => refundOrder(id, cents, reason.trim() || 'Geste commercial'));
