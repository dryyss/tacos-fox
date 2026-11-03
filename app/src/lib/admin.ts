import 'server-only';
import { redirect } from 'next/navigation';
import { auth, isStaff } from '@/auth';
import { getSettings } from './catalog';
import { canUse, type AdminFeature } from './features';
import { makeOptions } from './options';
import { prisma } from './prisma';
import type { Prisma, Role } from '@prisma/client';

async function access() {
  const [session, settings] = await Promise.all([auth(), getSettings()]);
  return { user: session?.user, options: makeOptions(settings.enabledOptions) };
}

/* Pages du back-office. Non connecté : connexion. Connecté sans être de l'équipe : page « accès réservé »
   (la connexion redirige les personnes connectées, y renvoyer bouclerait). Fonction non incluse : commandes. */
export async function requireStaffPage(feature: AdminFeature = 'orders') {
  const { user, options } = await access();
  if (!user) redirect('/connexion?retour=/admin');
  if (!isStaff(user.role)) redirect('/acces-reserve');
  if (!canUse(feature, user.role, options)) redirect('/admin');
  return { ...user, options };
}

/* Server actions et routes API : lève une erreur au lieu de rediriger */
export async function requireStaff(feature: AdminFeature = 'orders') {
  const { user, options } = await access();
  if (!user || !canUse(feature, user.role, options)) throw new Error('Accès refusé');
  return { ...user, options };
}

/* Liste des fonctionnalités accessibles, pour la navigation du back-office */
export async function allowedFeatures() {
  const { user, options } = await access();
  const all: AdminFeature[] = ['orders', 'history', 'qrcodes', 'menu', 'settings', 'stock', 'accounting', 'delivery', 'promos', 'payments', 'options'];
  return all.filter(f => canUse(f, user?.role, options));
}

/* R8 : restaurants dont la personne voit les commandes. Gérant et MAGAR : les 5 (null).
   Équipier : seulement les siens (rôles Auth0 « staff:<restaurant> »), aucun s'il n'en a pas. */
export async function restaurantScope(user: { role: Role; restaurants?: string[] }): Promise<string[] | null> {
  if (user.role === 'ADMIN' || user.role === 'SUPERADMIN') return null;
  const slugs = user.restaurants ?? [];
  if (!slugs.length) return [];
  return (await prisma.restaurant.findMany({ where: { slug: { in: slugs } }, select: { id: true } })).map(r => r.id);
}

export const scopeWhere = (scope: string[] | null): Prisma.OrderWhereInput => (scope ? { restaurantId: { in: scope } } : {});

/* Actions sur une commande : refusées hors du périmètre de la personne */
export async function requireOrderAccess(orderId: string) {
  const user = await requireStaff();
  const scope = await restaurantScope(user);
  if (scope) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { restaurantId: true } });
    if (!order?.restaurantId || !scope.includes(order.restaurantId)) throw new Error('Accès refusé');
  }
  return user;
}

/* « 10,50 » ou « 10.5 » -> 1050 ; null si invalide */
export function parseEuros(v: FormDataEntryValue | string | null | undefined): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(/\s|€/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}
