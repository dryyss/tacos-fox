import 'server-only';
import { redirect } from 'next/navigation';
import { auth, isStaff } from '@/auth';

/* Pages du back-office : redirige vers la connexion si le rôle ne suffit pas */
export async function requireStaffPage(adminOnly = false) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || !isStaff(role) || (adminOnly && role !== 'ADMIN')) redirect('/connexion?retour=/admin');
  return session.user;
}

/* Server actions et routes API : lève une erreur au lieu de rediriger */
export async function requireStaff(adminOnly = false) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || !isStaff(role) || (adminOnly && role !== 'ADMIN')) throw new Error('Accès refusé');
  return session.user;
}

/* « 10,50 » ou « 10.5 » -> 1050 ; null si invalide */
export function parseEuros(v: FormDataEntryValue | string | null | undefined): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(/\s|€/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}
