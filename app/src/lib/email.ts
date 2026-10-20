import 'server-only';
import { Resend } from 'resend';
import { prisma } from './prisma';
import { getSettings } from './catalog';
import { formatPrice } from './money';
import { appUrl } from './url';

const MODE_LABELS = { SURPLACE: 'Sur place', EMPORTER: 'À emporter', LIVRAISON: 'Livraison' } as const;

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

async function send(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.info(`[e-mail non envoyé, RESEND_API_KEY absent] à ${to} : ${subject}`);
    return;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({ from: process.env.EMAIL_FROM || 'Tacos Fox <onboarding@resend.dev>', to, subject, html });
    if (error) console.error('Resend :', error);
  } catch (e) {
    // Un e-mail en échec ne doit jamais bloquer une commande
    console.error('Envoi e-mail impossible :', e);
  }
}

function layout(title: string, body: string) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#F4F4F2;font-family:Arial,Helvetica,sans-serif;color:#1E1E1E">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#141414;color:#fff;padding:18px 20px;border-radius:14px 14px 0 0;font-size:22px;font-weight:bold;letter-spacing:2px">TACOS<span style="color:#D7261E">FOX</span></div>
    <div style="background:#fff;padding:22px 20px;border-radius:0 0 14px 14px">
      <h1 style="font-size:22px;margin:0 0 12px">${title}</h1>${body}
    </div>
  </div></body></html>`;
}

export async function notifyOrderConfirmed(orderId: string) {
  const [order, settings] = await Promise.all([
    prisma.order.findUnique({ where: { id: orderId }, include: { items: true } }),
    getSettings(),
  ]);
  if (!order) return;
  const num = `TF-${String(order.number).padStart(4, '0')}`;
  const rows = order.items.map(i => `<tr><td style="padding:6px 0">${i.qty} x ${esc(i.name)}<br><small style="color:#5A5A5A">${esc(i.details.join(' · '))}</small></td><td style="text-align:right;white-space:nowrap">${formatPrice(i.unitPrice * i.qty)}</td></tr>`).join('');
  const when = order.asap ? 'Dès que possible' : order.scheduledFor!.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
  const body = `
    <p>Merci ${esc(order.customerName)}, votre commande <b>${num}</b> est bien reçue.</p>
    <p><b>${MODE_LABELS[order.mode]}</b> · ${when}${order.mode === 'LIVRAISON' ? `<br>${esc(order.addressLine1 ?? '')}, ${esc(order.postalCode ?? '')} ${esc(order.city ?? '')}` : ''}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
      ${order.discount ? `<tr><td>Remise ${esc(order.promoCode ?? '')}</td><td style="text-align:right">-${formatPrice(order.discount)}</td></tr>` : ''}
      ${order.mode === 'LIVRAISON' ? `<tr><td>Livraison</td><td style="text-align:right">${order.deliveryFee ? formatPrice(order.deliveryFee) : 'Offerte'}</td></tr>` : ''}
      <tr><td style="padding-top:10px;border-top:2px dashed #E8E8E5"><b>Total ${order.paymentMethod === 'CARD' ? 'payé' : 'à régler sur place'}</b></td><td style="padding-top:10px;border-top:2px dashed #E8E8E5;text-align:right"><b>${formatPrice(order.total)}</b></td></tr>
    </table>
    <p style="margin-top:20px"><a href="${appUrl()}/suivi/${order.trackingToken}" style="background:#D7261E;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Suivre ma commande</a></p>
    <p style="color:#5A5A5A;font-size:13px;margin-top:20px">Un souci ? Appelez-nous au ${esc(settings.phone)}.</p>`;
  await send(order.customerEmail, `Commande ${num} confirmée`, layout('Commande confirmée', body));
}

export async function notifyOrderStatus(orderId: string, message: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  const num = `TF-${String(order.number).padStart(4, '0')}`;
  await send(order.customerEmail, `Commande ${num} : ${message}`, layout(message, `<p>Commande <b>${num}</b>.</p><p><a href="${appUrl()}/suivi/${order.trackingToken}">Voir le suivi</a></p>`));
}
