'use server';

import { revalidatePath } from 'next/cache';
import { requireStaff } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { OPTION_LABELS, type OptionCode } from '@/lib/options';

/* Active ou coupe une option du devis (MAGAR uniquement) */
export async function setOption(code: OptionCode, enabled: boolean): Promise<{ ok: boolean; error?: string }> {
  await requireStaff('options');
  if (!(code in OPTION_LABELS)) return { ok: false, error: 'Option inconnue.' };
  const settings = await prisma.settings.findUniqueOrThrow({ where: { id: 'main' }, select: { enabledOptions: true } });
  const next = new Set(settings.enabledOptions);
  if (enabled) next.add(code); else next.delete(code);
  await prisma.settings.update({ where: { id: 'main' }, data: { enabledOptions: [...next].sort() } });
  revalidatePath('/', 'layout');
  return { ok: true };
}
