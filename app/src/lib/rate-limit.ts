import 'server-only';

/* Limite de requêtes par adresse IP, en mémoire (fenêtre fixe).
   Sur Vercel chaque instance a sa propre mémoire : c'est un frein contre les robots et les essais
   en rafale, pas un quota exact. Suffisant pour le trafic de 5 restaurants. */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
let lastSweep = 0;

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'local').trim();
}

/* true = requête acceptée ; false = trop de requêtes, répondre 429 */
export function allow(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  if (now - lastSweep > 60_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    lastSweep = now;
  }
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

export const LIMITS = {
  order: { limit: 10, windowMs: 10 * 60_000 },   // création de commande
  quote: { limit: 120, windowMs: 60_000 },       // recalcul du panier
  track: { limit: 120, windowMs: 60_000 },       // suivi (rafraîchi toutes les quelques secondes)
  invoice: { limit: 30, windowMs: 60_000 },
  abandon: { limit: 20, windowMs: 60_000 },
} as const;

export function limited(req: Request, name: keyof typeof LIMITS): Response | null {
  const { limit, windowMs } = LIMITS[name];
  if (allow(`${name}:${clientIp(req)}`, limit, windowMs)) return null;
  return Response.json({ error: 'Trop de demandes. Réessayez dans un instant.' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(windowMs / 1000)) } });
}
