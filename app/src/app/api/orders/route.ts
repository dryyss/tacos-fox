import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkoutSchema, CheckoutError, createOrder } from '@/lib/orders';

export async function POST(req: Request) {
  const parsed = checkoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: issue?.message ?? 'Commande invalide', field: issue?.path.join('.') }, { status: 400 });
  }
  const session = await auth();
  try {
    return NextResponse.json(await createOrder(parsed.data, session?.user?.id ?? null));
  } catch (e) {
    if (e instanceof CheckoutError) return NextResponse.json({ error: e.message }, { status: 409 });
    console.error('Création de commande :', e);
    return NextResponse.json({ error: 'Une erreur est survenue, réessayez dans un instant.' }, { status: 500 });
  }
}
