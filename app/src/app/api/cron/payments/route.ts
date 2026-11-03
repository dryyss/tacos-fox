import { NextResponse } from 'next/server';
import { checkPendingPayments } from '@/lib/payment-check';

/* Vérification planifiée des paiements en attente (filet de sécurité du webhook Stripe).
   À appeler toutes les 5 minutes par un service de tâches planifiées (cron-job.org, Vercel Cron en offre Pro)
   avec l'en-tête « Authorization: Bearer <CRON_SECRET> ». */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Accès refusé' }, { status: 401 });
  const checked = await checkPendingPayments(0);
  return NextResponse.json({ checked }, { headers: { 'Cache-Control': 'no-store' } });
}
