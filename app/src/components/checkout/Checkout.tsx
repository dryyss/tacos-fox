'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon, type IconName } from '@/components/Icons';
import { Qty } from '@/components/ui/Sheet';
import { Photo } from '@/components/menu/ProductCard';
import { useToast } from '@/components/ui/Toast';
import { useCart, type CheckoutInfo } from '@/components/cart/CartProvider';
import type { CheckoutContext } from '@/lib/checkout-context';
import type { Mode } from '@/lib/pricing';
import { formatPrice } from '@/lib/money';
import { MODE_LABELS } from '@/lib/format';
import { useQuote, type QuoteResult } from './useQuote';

type Step = 'panier' | 'commande' | 'paiement';
const MODE_ICONS: Record<Mode, IconName> = { SURPLACE: 'store', EMPORTER: 'takeaway', LIVRAISON: 'scooter' };
const PENDING_KEY = 'tfx_pending_order';

function Stepper({ current }: { current: number }) {
  return (
    <ol className="stepper">
      {['Panier', 'Retrait', 'Paiement'].map((l, i) => <li key={l} className={i + 1 < current ? 'is-done' : i + 1 === current ? 'is-current' : ''}>{i + 1}. {l}</li>)}
    </ol>
  );
}

function TotalsPanel({ quote, mode, count }: { quote: QuoteResult | null; mode: Mode; count: number }) {
  if (!quote) return <div className="totals"><div><span>Calcul en cours...</span><span /></div></div>;
  const t = quote.totals;
  return (
    <div className="totals">
      <div><span>Sous-total ({count} article{count > 1 ? 's' : ''})</span><span>{formatPrice(t.subtotal)}</span></div>
      {t.discount > 0 && <div className="is-free"><span>Remise {quote.promo?.code}</span><span>-{formatPrice(t.discount)}</span></div>}
      {mode === 'LIVRAISON'
        ? <div className={t.deliveryFee ? '' : 'is-free'}><span>Livraison</span><span>{t.deliveryFee ? formatPrice(t.deliveryFee) : 'Offerte'}</span></div>
        : <div><span>Frais de service</span><span className="is-free">0,00 €</span></div>}
      <div className="total"><span>Total TTC</span><span className="price price--red">{formatPrice(t.total)}</span></div>
    </div>
  );
}

function modeNote(mode: Mode, ctx: CheckoutContext) {
  if (mode === 'SURPLACE') return 'Commandez depuis votre table ou avant d\'arriver, on vous appelle quand c\'est prêt.';
  if (mode === 'EMPORTER') return `Prêt en ${ctx.windows.EMPORTER?.lead ?? 20} minutes environ. Passez directement au comptoir, votre commande vous attend.`;
  return `Livraison en ${ctx.windows.LIVRAISON?.lead ?? 35} minutes environ. Zones : ${ctx.zones.map(z => z.city).join(', ')}.`;
}

export function Checkout({ step, ctx }: { step: Step; ctx: CheckoutContext }) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const cart = useCart();
  const { ready, items, mode, checkout, updateCheckout, setMode } = cart;
  const [promoInput, setPromoInput] = useState(checkout.promoCode);
  const { quote, loading, lineError } = useQuote(checkout.promoCode);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const count = items.reduce((a, i) => a + i.input.qty, 0);
  const effectiveMode: Mode = ctx.modes.includes(mode) ? mode : ctx.modes[0];
  const win = ctx.windows[effectiveMode];
  const zone = ctx.zones.find(z => z.id === checkout.zoneId);

  // Mode désactivé par le restaurant : on bascule sur le premier disponible
  useEffect(() => { if (ready && effectiveMode && effectiveMode !== mode) setMode(effectiveMode); }, [ready, effectiveMode, mode, setMode]);
  useEffect(() => { if (ready && checkout.promoCode !== promoInput && !promoInput) setPromoInput(checkout.promoCode); /* restauration */ }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Préremplissage depuis le compte connecté
  useEffect(() => {
    if (!ready || !ctx.user) return;
    const u = ctx.user;
    const patch: Partial<CheckoutInfo> = {};
    if (!checkout.name && u.name) patch.name = u.name.split(' ')[0];
    if (!checkout.email) patch.email = u.email;
    if (!checkout.phone && u.phone) patch.phone = u.phone;
    const def = u.addresses.find(a => a.isDefault) ?? u.addresses[0];
    if (!checkout.addressId && def) patch.addressId = def.id;
    if (Object.keys(patch).length) updateCheckout(patch);
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Adresse enregistrée choisie : on en déduit la zone
  const savedAddresses = (ctx.user?.addresses ?? []).filter(a => ctx.zones.some(z => z.postalCode === a.postalCode));
  const savedAddress = savedAddresses.find(a => a.id === checkout.addressId);
  useEffect(() => {
    if (!savedAddress) return;
    const z = ctx.zones.find(z => z.postalCode === savedAddress.postalCode && z.city === savedAddress.city) ?? ctx.zones.find(z => z.postalCode === savedAddress.postalCode);
    if (z && z.id !== checkout.zoneId) updateCheckout({ zoneId: z.id });
  }, [savedAddress, ctx.zones, checkout.zoneId, updateCheckout]);

  // Créneau « dès que possible » impossible si fermé
  useEffect(() => {
    if (!ready || !win) return;
    if (checkout.slot === 'asap' && !win.status.open && win.slots[0]) updateCheckout({ slot: win.slots[0] });
    if (checkout.slot !== 'asap' && !win.slots.includes(checkout.slot)) updateCheckout({ slot: win.status.open ? 'asap' : win.slots[0] ?? 'asap' });
  }, [ready, win, checkout.slot, updateCheckout]);

  // Retour de Stripe après annulation : on libère la commande en attente
  const cancelled = params.get('annule');
  useEffect(() => {
    if (!cancelled) return;
    fetch(`/api/orders/${encodeURIComponent(cancelled)}/abandon`, { method: 'POST' }).catch(() => {});
    setServerError('Paiement annulé. Votre panier est intact, vous pouvez réessayer.');
  }, [cancelled]);

  if (!ready) return <div className="page checkout"><div className="checkout__head"><Stepper current={1} /><h1 className="page-title">Mon panier</h1></div></div>;

  if (!items.length) {
    return (
      <div className="page checkout">
        <div className="checkout__head"><Stepper current={1} /><h1 className="page-title">Mon panier</h1></div>
        <div className="empty" style={{ gridColumn: '1/-1' }}>
          <p className="display">Votre panier est vide</p>
          <p>Il est encore temps de ne pas cuisiner ce soir.</p>
          <Link className="btn btn--primary btn--xl" href="/carte" style={{ marginTop: 18 }}>Voir la carte</Link>
        </div>
      </div>
    );
  }

  const blocking = quote?.errors ?? [];
  const zoneMissing = effectiveMode === 'LIVRAISON' && !zone;
  const minMissing = quote?.totals.minimumMissing ?? 0;
  const canContinue = !!quote && !loading && !blocking.length && ctx.orderingEnabled;
  const total = quote?.totals.total ?? cart.subtotal;

  const modePanel = (
    <div className="panel">
      <div className="panel__title"><Icon name="store" /> Comment récupérer la commande ?</div>
      <div className="segmented" style={{ gridTemplateColumns: `repeat(${ctx.modes.length},1fr)` }}>
        {ctx.modes.map(m => <button key={m} type="button" className={effectiveMode === m ? 'is-selected' : ''} onClick={() => setMode(m)}><Icon name={MODE_ICONS[m]} />{MODE_LABELS[m]}</button>)}
      </div>
      <p className="mode-note"><Icon name="check" /><span>{modeNote(effectiveMode, ctx)}</span></p>
      {effectiveMode === 'LIVRAISON' && (
        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="f-zone">Ville de livraison</label>
          <select id="f-zone" value={checkout.zoneId} onChange={e => updateCheckout({ zoneId: e.target.value, addressId: 'new' })}>
            <option value="">Choisir une ville</option>
            {ctx.zones.map(z => <option key={z.id} value={z.id}>{z.city} ({z.postalCode})</option>)}
          </select>
          {zone && <span className="small muted">Livraison {formatPrice(zone.fee)}{zone.freeFrom != null ? `, offerte dès ${formatPrice(zone.freeFrom)}` : ''}{zone.minimum ? `. Minimum ${formatPrice(zone.minimum)}` : ''}.</span>}
        </div>
      )}
    </div>
  );

  const promoBox = (
    <form className="promo-field" onSubmit={e => { e.preventDefault(); updateCheckout({ promoCode: promoInput.trim().toUpperCase() }); }}>
      <input aria-label="Code promo" placeholder="Code promo" value={promoInput} onChange={e => setPromoInput(e.target.value)} />
      {checkout.promoCode
        ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setPromoInput(''); updateCheckout({ promoCode: '' }); }}>Retirer</button>
        : <button type="submit" className="btn btn--dark btn--sm" disabled={!promoInput.trim()}>Appliquer</button>}
    </form>
  );
  const promoState = quote?.promo && (quote.promo.valid
    ? <p className="alert alert--ok"><Icon name="check" />Code {quote.promo.code} appliqué</p>
    : <p className="alert alert--error"><Icon name="close" />{quote.promo.message}</p>);

  const miniSummary = (
    <div className="summary-mini">
      {items.map(i => <div key={i.key}><span>{i.input.qty} x {i.name}</span><b>{formatPrice(i.unitPrice * i.input.qty)}</b></div>)}
    </div>
  );

  /* ---------- Étape 1 : panier ---------- */
  if (step === 'panier') {
    return (
      <div className="page checkout">
        <div className="checkout__head"><Stepper current={1} /><h1 className="page-title">Mon panier</h1><p className="page-sub">{count} article{count > 1 ? 's' : ''}, modifiable jusqu&apos;au paiement.</p></div>
        <div className="checkout__main">
          {serverError && <p className="alert alert--info" style={{ marginTop: 0, marginBottom: 12 }}><Icon name="clock" />{serverError}</p>}
          <div className="cart-list">
            {items.map((i, idx) => {
              const err = lineError(idx);
              return (
                <div key={i.key} className={`cart-item ${err ? 'is-invalid' : ''}`}>
                  <Photo src={i.image} alt={i.name} label="" />
                  <div>
                    <div className="cart-item__name"><span>{i.name}</span><span className="price">{formatPrice(i.unitPrice * i.input.qty)}</span></div>
                    <div className="cart-item__details">{i.details.join(' · ')}{i.tbc && <> · <em>prix à confirmer</em></>}</div>
                    {err && <p className="alert alert--error"><Icon name="close" />{err} Retirez cet article pour continuer.</p>}
                    <div className="cart-item__row">
                      <Qty small value={i.input.qty} onChange={v => cart.setQty(i.key, v)} />
                      <button className="cart-item__remove" onClick={() => { cart.remove(i.key); toast('Article retiré'); }}><Icon name="trash" /> Retirer</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Link href="/carte" className="btn btn--ghost btn--block" style={{ marginTop: 12 }}><Icon name="plus" /> Ajouter des articles</Link>
          {modePanel}
        </div>
        <aside className="checkout__aside">
          <div className="panel">
            <div className="panel__title">Récapitulatif</div>
            <TotalsPanel quote={quote} mode={effectiveMode} count={count} />
            {promoBox}{promoState}
            {minMissing > 0 && <p className="mode-note" style={{ color: 'var(--red)' }}><Icon name="clock" /><span>Minimum de commande en livraison : {formatPrice(zone!.minimum)}. Ajoutez {formatPrice(minMissing)} pour continuer.</span></p>}
            {!ctx.orderingEnabled && <p className="alert alert--error"><Icon name="clock" />Les commandes en ligne sont suspendues pour le moment.</p>}
          </div>
          <div className="cta-sticky">
            <button className="btn btn--primary btn--xl btn--block" disabled={!canContinue && !zoneMissing} onClick={() => {
              if (zoneMissing) { toast('Choisissez votre ville de livraison'); document.getElementById('f-zone')?.focus(); return; }
              router.push('/commande');
            }}>Continuer <span className="price">{formatPrice(total)}</span></button>
          </div>
        </aside>
      </div>
    );
  }

  /* ---------- Étape 2 : retrait (créneau, adresse, coordonnées) ---------- */
  if (step === 'commande') {
    const invalid = (k: string) => (errors[k] ? 'is-invalid' : '');
    const validate = () => {
      const phone = checkout.phone.replace(/[\s.\-]/g, '');
      const e: Record<string, boolean> = {
        name: !checkout.name.trim(),
        phone: !/^(\+33|0)[1-9](\d{2}){4}$/.test(phone),
        email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkout.email.trim()),
        line1: effectiveMode === 'LIVRAISON' && !savedAddress && checkout.line1.trim().length < 3,
        zone: zoneMissing,
      };
      setErrors(e);
      const bad = Object.entries(e).find(([, v]) => v);
      if (bad) { toast('Vérifiez les champs en rouge'); document.querySelector<HTMLElement>('.field.is-invalid input, .field.is-invalid select')?.focus(); return false; }
      if (!win?.status.open && checkout.slot === 'asap') { toast('Le restaurant est fermé, choisissez un créneau'); return false; }
      return true;
    };
    const field = (k: keyof CheckoutInfo) => ({ value: checkout[k] as string, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { updateCheckout({ [k]: e.target.value }); if (errors[k]) setErrors(x => ({ ...x, [k]: false })); } });

    return (
      <div className="page checkout">
        <div className="checkout__head">
          <Stepper current={2} />
          <Link className="back-link" href="/panier"><Icon name="back" /> Retour au panier</Link>
          <h1 className="page-title">{MODE_LABELS[effectiveMode]}</h1>
          <p className="page-sub">{effectiveMode === 'LIVRAISON' ? 'Quand et où voulez-vous être livré ?' : 'Quand souhaitez-vous récupérer votre commande ?'}</p>
        </div>
        <form className="checkout__main" noValidate onSubmit={e => { e.preventDefault(); if (validate()) router.push('/paiement'); }}>
          <div className="panel">
            <div className="panel__title"><Icon name="clock" /> Créneau</div>
            <div className="slots">
              <button type="button" className={`slot ${checkout.slot === 'asap' ? 'is-selected' : ''}`} disabled={!win?.status.open} onClick={() => updateCheckout({ slot: 'asap' })}>
                Dès que possible<small>env. {win?.lead ?? 20} min</small>
              </button>
              {win?.slots.map(s => (
                <button key={s} type="button" className={`slot ${checkout.slot === s ? 'is-selected' : ''}`} onClick={() => updateCheckout({ slot: s })}>
                  {s.replace(':', 'h')}<small>{effectiveMode === 'LIVRAISON' ? 'livré vers' : 'prêt à'}</small>
                </button>
              ))}
            </div>
            {win && !win.status.open && <p className="mode-note"><Icon name="clock" /><span>{win.status.label}. {win.slots.length ? 'Vous pouvez précommander pour plus tard.' : 'Les commandes rouvrent à l\'ouverture.'}</span></p>}
          </div>

          {effectiveMode === 'LIVRAISON' && (
            <div className="panel">
              <div className="panel__title"><Icon name="pin" /> Adresse de livraison</div>
              {savedAddresses.length > 0 && (
                <div className="saved-addr">
                  {savedAddresses.map(a => (
                    <button key={a.id} type="button" className={`opt ${checkout.addressId === a.id ? 'is-selected' : ''}`} onClick={() => updateCheckout({ addressId: a.id })}>
                      <span className="opt__box opt__box--round"><Icon name="check" /></span>
                      <span className="opt__label">{a.label}<small>{a.line1}{a.extra ? ', ' + a.extra : ''}, {a.postalCode} {a.city}</small></span>
                    </button>
                  ))}
                  <button type="button" className={`opt ${!savedAddress ? 'is-selected' : ''}`} onClick={() => updateCheckout({ addressId: 'new' })}>
                    <span className="opt__box opt__box--round"><Icon name="check" /></span><span className="opt__label">Une autre adresse</span>
                  </button>
                </div>
              )}
              {!savedAddress && (
                <>
                  <div className={`field ${invalid('line1')}`}><label htmlFor="f-address">Adresse</label><input id="f-address" autoComplete="street-address" placeholder="N° et rue" className={invalid('line1')} {...field('line1')} /><span className="field__err">Indiquez votre adresse</span></div>
                  <div className="field-row">
                    <div className="field"><label htmlFor="f-extra">Complément</label><input id="f-extra" placeholder="Bât., étage, code" {...field('extra')} /></div>
                    <div className={`field ${invalid('zone')}`}><label htmlFor="f-city">Ville</label>
                      <select id="f-city" value={checkout.zoneId} onChange={e => updateCheckout({ zoneId: e.target.value })}>
                        <option value="">Choisir</option>
                        {ctx.zones.map(z => <option key={z.id} value={z.id}>{z.city}</option>)}
                      </select>
                      <span className="field__err">Choisissez une ville</span>
                    </div>
                  </div>
                </>
              )}
              <p className="mode-note"><Icon name="scooter" /><span>Zones livrées : {ctx.zones.map(z => z.city).join(', ')}.</span></p>
            </div>
          )}

          <div className="panel">
            <div className="panel__title"><Icon name="user" /> Vos coordonnées</div>
            <div className={`field ${invalid('name')}`}><label htmlFor="f-name">Prénom</label><input id="f-name" autoComplete="given-name" placeholder="Pour vous appeler quand c'est prêt" className={invalid('name')} {...field('name')} /><span className="field__err">Indiquez votre prénom</span></div>
            <div className="field-row">
              <div className={`field ${invalid('phone')}`}><label htmlFor="f-phone">Téléphone</label><input id="f-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="06 00 00 00 00" className={invalid('phone')} {...field('phone')} /><span className="field__err">Numéro à 10 chiffres</span></div>
              <div className={`field ${invalid('email')}`}><label htmlFor="f-email">E-mail</label><input id="f-email" type="email" inputMode="email" autoComplete="email" placeholder="Pour le reçu" className={invalid('email')} {...field('email')} /><span className="field__err">E-mail invalide</span></div>
            </div>
            <div className="field"><label htmlFor="f-note">Un mot pour la cuisine (optionnel)</label><textarea id="f-note" maxLength={500} placeholder="Sans oignons, sauce à part, bien gratiné..." {...field('note')} /></div>
            {!ctx.user && <p className="small muted"><Link className="link" href="/connexion?retour=/commande">Connectez-vous</Link> pour retrouver vos adresses et l&apos;historique de vos commandes.</p>}
          </div>
          <button type="submit" hidden />
        </form>
        <aside className="checkout__aside">
          <div className="panel"><div className="panel__title">Récapitulatif</div>{miniSummary}<div style={{ height: 12 }} /><TotalsPanel quote={quote} mode={effectiveMode} count={count} /></div>
          {blocking.length > 0 && <p className="alert alert--error"><Icon name="close" />{blocking[0]}</p>}
          <div className="cta-sticky">
            <button className="btn btn--primary btn--xl btn--block" disabled={!canContinue && !zoneMissing} onClick={() => { if (validate()) router.push('/paiement'); }}>
              Vers le paiement <span className="price">{formatPrice(total)}</span>
            </button>
          </div>
        </aside>
      </div>
    );
  }

  /* ---------- Étape 3 : paiement ---------- */
  const canOnsite = ctx.payments.onsite && effectiveMode !== 'LIVRAISON';
  const payment: CheckoutInfo['payment'] = checkout.payment === 'ONSITE' && canOnsite ? 'ONSITE' : ctx.payments.card ? 'CARD' : canOnsite ? 'ONSITE' : 'CARD';
  const noPayment = !ctx.payments.card && !canOnsite;
  const slotLabel = checkout.slot === 'asap' ? 'Dès que possible' : checkout.slot.replace(':', 'h');
  const addressLabel = savedAddress ? `${savedAddress.line1}${savedAddress.extra ? ', ' + savedAddress.extra : ''}, ${savedAddress.postalCode} ${savedAddress.city}` : `${checkout.line1}${checkout.extra ? ', ' + checkout.extra : ''}, ${zone?.postalCode ?? ''} ${zone?.city ?? ''}`;

  const placeOrder = async () => {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          lines: items.map(i => i.input),
          mode: effectiveMode,
          zoneId: effectiveMode === 'LIVRAISON' ? checkout.zoneId : null,
          promoCode: checkout.promoCode || null,
          slot: checkout.slot,
          customer: { name: checkout.name, phone: checkout.phone, email: checkout.email },
          address: effectiveMode === 'LIVRAISON' ? (savedAddress ? { line1: savedAddress.line1, extra: savedAddress.extra } : { line1: checkout.line1, extra: checkout.extra }) : null,
          note: checkout.note,
          payment,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setServerError(data.error ?? 'Commande impossible.'); setSubmitting(false); return; }
      try { localStorage.setItem(PENDING_KEY, data.trackingToken); } catch { /* ignoré */ }
      globalThis.location.assign(data.redirectUrl);
    } catch {
      setServerError('Connexion impossible. Vérifiez votre réseau et réessayez.');
      setSubmitting(false);
    }
  };

  return (
    <div className="page checkout">
      <div className="checkout__head">
        <Stepper current={3} />
        <Link className="back-link" href="/commande"><Icon name="back" /> Retour</Link>
        <h1 className="page-title">Paiement</h1>
        <p className="page-sub">Dernière étape. Votre commande part en cuisine dès validation.</p>
      </div>
      <div className="checkout__main">
        <div className="panel">
          <div className="panel__title"><Icon name="card" /> Moyen de paiement</div>
          <div className="pay-methods">
            {ctx.payments.card && (
              <button type="button" className={`opt ${payment === 'CARD' ? 'is-selected' : ''}`} onClick={() => updateCheckout({ payment: 'CARD' })}>
                <span className="opt__box opt__box--round"><Icon name="check" /></span>
                <span className="opt__label">Carte bancaire<small>Visa, Mastercard, CB, Apple Pay, Google Pay. Paiement sécurisé 3-D Secure.</small></span>
              </button>
            )}
            {canOnsite && (
              <button type="button" className={`opt ${payment === 'ONSITE' ? 'is-selected' : ''}`} onClick={() => updateCheckout({ payment: 'ONSITE' })}>
                <span className="opt__box opt__box--round"><Icon name="check" /></span>
                <span className="opt__label">Payer au restaurant<small>Carte, espèces ou ticket resto au comptoir.</small></span>
              </button>
            )}
          </div>
          {payment === 'CARD' && !noPayment && <p className="secure"><Icon name="lock" /> Vous serez redirigé vers la page de paiement sécurisée Stripe. Aucune donnée bancaire n&apos;est stockée par le restaurant.</p>}
          {payment === 'CARD' && ctx.payments.simulated && <p className="alert alert--info"><Icon name="card" />Mode développement : sans clé Stripe, le paiement carte est simulé.</p>}
          {noPayment && <p className="alert alert--error"><Icon name="close" />Aucun moyen de paiement disponible pour ce mode. Appelez le restaurant.</p>}
        </div>
        <p className="small muted" style={{ marginTop: 14 }}>En validant, vous acceptez nos <Link className="link" href="/cgv" target="_blank">conditions générales de vente</Link>. Vos données servent uniquement à traiter votre commande (<Link className="link" href="/confidentialite" target="_blank">confidentialité</Link>).</p>
      </div>
      <aside className="checkout__aside">
        <div className="panel">
          <div className="panel__title">Votre commande</div>
          <div className="summary-mini">
            <div><span>Mode</span><b>{MODE_LABELS[effectiveMode]}</b></div>
            <div><span>Créneau</span><b>{slotLabel}</b></div>
            {effectiveMode === 'LIVRAISON' && <div><span>Adresse</span><b style={{ textAlign: 'right' }}>{addressLabel}</b></div>}
            <div><span>Contact</span><b>{checkout.name} · {checkout.phone}</b></div>
          </div>
          <div style={{ height: 10, borderBottom: '1px dashed var(--grey-2)', marginBottom: 10 }} />
          {miniSummary}
          <div style={{ height: 12 }} />
          <TotalsPanel quote={quote} mode={effectiveMode} count={count} />
        </div>
        {(serverError || blocking[0]) && <p className="alert alert--error"><Icon name="close" />{serverError ?? blocking[0]}</p>}
        <div className="cta-sticky">
          <button className="btn btn--primary btn--xl btn--block" disabled={!canContinue || submitting || noPayment || !checkout.name || !checkout.email} onClick={placeOrder}>
            {submitting ? <><span className="spinner" /> Validation...</> : <>{payment === 'CARD' ? 'Payer' : 'Commander'} <span className="price">{formatPrice(total)}</span></>}
          </button>
        </div>
      </aside>
    </div>
  );
}

export { PENDING_KEY };
