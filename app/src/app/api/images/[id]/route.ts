import { prisma } from '@/lib/prisma';

/* Photos produits stockées en base, mises en cache longtemps (une nouvelle photo = un nouvel id) */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const image = await prisma.image.findUnique({ where: { id } });
  if (!image) return new Response('Introuvable', { status: 404 });
  return new Response(new Uint8Array(image.data), {
    headers: { 'Content-Type': image.mime, 'Content-Length': String(image.size), 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
}
