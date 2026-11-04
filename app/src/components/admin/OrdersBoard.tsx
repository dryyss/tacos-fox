'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import type { BoardOrder } from '@/lib/admin-orders';
import { useToast } from '@/components/ui/Toast';
import { formatPrice } from '@/lib/money';
import { MODE_LABELS, onsiteLabel, orderNumberLabel, splitFreePizza, STATUS_LABELS } from '@/lib/format';
import { cancel, changeStatus, collectOnsite, type AdminResult } from '@/app/(admin)/admin/actions';

const TZ = 'Europe/Paris';
const hm = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).replace(':', 'h');
const AUTO_PRINT_KEY = 'tfx_admin_autoprint';
const SOUND_KEY = 'tfx_admin_sound';

/* R3 : sonnerie de cuisine via Web Audio (aucun fichier à charger).
   Un seul contexte audio pour la page : le navigateur le laisse « suspendu » tant que personne
   n'a touché l'écran, d'où le déblocage au premier appui (voir useKitchenPermissions). */
let audioCtx: AudioContext | null = null;
function audio(): AudioContext | null {
  try { return (audioCtx ??= new AudioContext()); } catch { return null; }
}
const audioReady = () => audio()?.state === 'running';

function ring() {
  const ctx = audio();
  if (!ctx) return;
  if (ctx.state !== 'running') void ctx.resume();
  // Deux séries de « ding-dong » montants, bien audibles dans une cuisine bruyante (~2 s)
  const notes = [988, 784, 988, 784, 1175, 988, 1175, 988];
  notes.forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.22 + (i >= 4 ? 0.35 : 0);
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = freq;
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.6, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.start(t); o.stop(t + 0.21);
  });
}

/* Autorisations de la tablette ou du navigateur, demandées au premier appui sur l'écran :
   son (déblocage audio), notifications système (onglet en arrière-plan), écran toujours allumé. */
function useKitchenPermissions() {
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    let wake: { release: () => Promise<void> } | null = null;
    const keepAwake = async () => {
      try {
        const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock;
        if (wl && document.visibilityState === 'visible') wake = await wl.request('screen');
      } catch { /* refusé ou non pris en charge */ }
    };
    const unlock = () => {
      const ctx = audio();
      if (ctx && ctx.state !== 'running') void ctx.resume().then(() => setUnlocked(audioReady()));
      else setUnlocked(audioReady());
      try { if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission(); } catch { /* ignoré */ }
      void keepAwake();
    };
    setUnlocked(audioReady());
    void keepAwake();
    const onVisible = () => { if (document.visibilityState === 'visible') void keepAwake(); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', onVisible);
      void wake?.release().catch(() => {});
    };
  }, []);
  return unlocked;
}

function notify(o: BoardOrder) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted' || document.visibilityState === 'visible') return;
    new Notification(`Nouvelle commande ${orderNumberLabel(o.number)}`, { body: `${o.items.length} article${o.items.length > 1 ? 's' : ''} · ${formatPrice(o.total)}`, tag: o.id, requireInteraction: true });
  } catch { /* ignoré */ }
}

const openTicket = (id: string) => window.open(`/admin/commandes/${id}/ticket?print=1`, `ticket-${id}`, 'width=420,height=700');

/* Impression automatique d'une nouvelle commande : le ticket est chargé dans un cadre invisible qui
   lance l'impression lui-même (pas de fenêtre pop-up, souvent bloquée sur tablette). Avec Chrome lancé
   en « --kiosk-printing », le ticket sort sans boîte de dialogue. */
const printing = new Set<string>();
function printTicket(id: string) {
  if (printing.has(id)) return;
  printing.add(id);
  const frame = document.createElement('iframe');
  frame.title = 'Impression du ticket';
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
  frame.src = `/admin/commandes/${id}/ticket?print=1&frame=1`;
  document.body.appendChild(frame);
  setTimeout(() => frame.remove(), 120_000);
}

interface BoardRestaurant { id: string; slug: string; label: string }
const REPEAT_MS = 10_000; // R3 : alerte répétée tant qu'une commande attend d'être prise en charge

export function OrdersBoard({ initial, restaurants, selected, allowAll }: { initial: BoardOrder[]; restaurants: BoardRestaurant[]; selected: string | null; allowAll: boolean }) {
  const toast = useToast();
  const [orders, setOrders] = useState(initial);
  const [pending, start] = useTransition();
  const [autoPrint, setAutoPrint] = useState(false);
  // Son activé par défaut ; seul un « Couper le son » volontaire est mémorisé
  const [soundOn, setSoundOn] = useState(true);
  const [offline, setOffline] = useState(false);
  const seen = useRef(new Set(initial.map(o => o.id)));
  const unlocked = useKitchenPermissions();
  const now = useNow();

  useEffect(() => {
    try {
      setAutoPrint(localStorage.getItem(AUTO_PRINT_KEY) === '1');
      setSoundOn(localStorage.getItem(SOUND_KEY) !== '0');
    } catch { /* ignoré */ }
  }, []);
  const toggleSound = () => {
    const v = !soundOn;
    setSoundOn(v);
    try { localStorage.setItem(SOUND_KEY, v ? '1' : '0'); } catch { /* ignoré */ }
    if (v) ring();
  };

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/admin/orders${selected ? `?r=${selected}` : ''}`, { cache: 'no-store' }).catch(() => null);
    if (!res?.ok) { setOffline(true); return; }
    setOffline(false);
    const data: BoardOrder[] = await res.json();
    const fresh = data.filter(o => !seen.current.has(o.id) && o.status === 'RECEIVED');
    data.forEach(o => seen.current.add(o.id));
    if (fresh.length) {
      if (soundOn) ring();
      fresh.forEach(notify);
      toast(`${fresh.length} nouvelle${fresh.length > 1 ? 's' : ''} commande${fresh.length > 1 ? 's' : ''}`, 'bag');
    }
    // Impression auto : toute commande à préparer dont le ticket n'est pas encore sorti
    // (y compris celles arrivées pendant que la tablette était éteinte)
    if (autoPrint) data.filter(o => o.status === 'RECEIVED' && !o.printedAt).forEach(o => printTicket(o.id));
    setOrders(data);
  }, [soundOn, autoPrint, toast, selected]);

  useEffect(() => {
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  // R3 : tant qu'une commande est « à préparer », le son revient et l'onglet clignote
  // Une commande pour plus tard ne fait sonner qu'à son arrivée, puis de nouveau quand il faut la lancer
  const waiting = orders.filter(o => o.status === 'RECEIVED' && new Date(o.startAt).getTime() <= now).length;
  // Commande en retard : délai de préparation (15 min) ou heure choisie dépassé, sans être passée « prête »
  const overdue = orders.filter(o => (o.status === 'RECEIVED' || o.status === 'PREPARING') && now > new Date(o.dueAt).getTime()).length;
  useEffect(() => {
    if (!waiting && !overdue) { document.title = 'Commandes · Gestion Tacos Fox'; return; }
    const label = overdue ? `(${overdue}) Commande en retard !` : `(${waiting}) Nouvelle commande !`;
    let on = false;
    const blink = setInterval(() => { on = !on; document.title = on ? label : 'Commandes · Gestion Tacos Fox'; }, 1000);
    const again = soundOn ? setInterval(ring, REPEAT_MS) : null;
    return () => { clearInterval(blink); if (again) clearInterval(again); };
  }, [waiting, overdue, soundOn]);

  const act = (fn: () => Promise<AdminResult>, ok?: string) => start(async () => {
    const r = await fn();
    if (!r.ok) toast(r.error ?? 'Action impossible');
    else if (ok) toast(ok);
    await refresh();
  });

  const cols = [
    { title: 'À préparer', match: (o: BoardOrder) => o.status === 'RECEIVED' },
    { title: 'En préparation', match: (o: BoardOrder) => o.status === 'PREPARING' },
    { title: 'Prêtes', match: (o: BoardOrder) => o.status === 'READY' || o.status === 'OUT_FOR_DELIVERY' },
  ];
  const done = orders.filter(o => o.status === 'COMPLETED' || o.status === 'CANCELLED').reverse();

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-title">Commandes</h1>
          <p className="admin-sub" style={{ margin: 0 }}>Mise à jour automatique toutes les 4 secondes{offline && <span className="pill pill--red" style={{ marginLeft: 8 }}>Connexion perdue</span>}</p>
        </div>
        <div className="filters" style={{ margin: 0 }}>
          <button className={`btn btn--sm ${soundOn ? 'btn--dark' : 'btn--ghost'}`} onClick={toggleSound} aria-pressed={soundOn}>{soundOn ? 'Sonnerie : oui' : 'Sonnerie : coupée'}</button>
          {soundOn && <button className="btn btn--sm btn--ghost" onClick={ring}>Tester la sonnerie</button>}
          <button className={`btn btn--sm ${autoPrint ? 'btn--dark' : 'btn--ghost'}`} onClick={() => { const v = !autoPrint; setAutoPrint(v); try { localStorage.setItem(AUTO_PRINT_KEY, v ? '1' : '0'); } catch { /* ignoré */ } toast(v ? 'Impression auto activée : chaque nouvelle commande sort sur l’imprimante' : 'Impression auto désactivée'); }}>
            {autoPrint ? 'Impression auto : oui' : 'Impression auto : non'}
          </button>
        </div>
      </div>

      {restaurants.length > 1 && (
        <nav className="filters" aria-label="Restaurant affiché">
          {allowAll && <Link className={`chip ${!selected ? 'is-selected' : ''}`} href="/admin">Tous</Link>}
          {restaurants.map(r => <Link key={r.id} className={`chip ${selected === r.id ? 'is-selected' : ''}`} href={`/admin?r=${r.slug}`}>{r.label}</Link>)}
        </nav>
      )}
      {!restaurants.length && <p className="alert alert--error">Aucun restaurant n&apos;est rattaché à votre compte. Demandez au gérant de vous ajouter le rôle de votre restaurant.</p>}
      {/* Le navigateur bloque le son tant que personne n'a touché l'écran : un appui n'importe où le débloque */}
      {soundOn && !unlocked && <button className="btn btn--primary btn--xl btn--block" style={{ marginBottom: 14 }} onClick={ring}>Touchez l&apos;écran pour activer la sonnerie</button>}
      {!soundOn && <button className="btn btn--ghost btn--block" style={{ marginBottom: 14 }} onClick={toggleSound}>Sonnerie coupée : appuyez pour la réactiver</button>}
      {overdue > 0 && <p className="alert alert--error" style={{ marginTop: 0, marginBottom: 14 }}>{overdue} commande{overdue > 1 ? 's' : ''} en retard : passez-la{overdue > 1 ? 's' : ''} en « Prête » dès que possible. La sonnerie revient toutes les 10 secondes.</p>}

      <div className="board">
        {cols.map(c => {
          const list = orders.filter(c.match);
          return (
            <section key={c.title} className="board__col">
              <div className="board__title">{c.title}<span className="board__count">{list.length}</span></div>
              {!list.length && <p className="small muted" style={{ padding: '0 6px 8px' }}>Rien pour le moment.</p>}
              {list.map(o => <OrderTicket key={o.id} o={o} pending={pending} act={act} showRestaurant={!selected} now={now} />)}
            </section>
          );
        })}
      </div>

      {done.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: 10 }}>Terminées récemment</h2>
          <div className="table-wrap" tabIndex={0}><table className="table"><tbody>
            {done.map(o => (
              <tr key={o.id}>
                <td><Link className="link" href={`/admin/commandes/${o.id}`}>{orderNumberLabel(o.number)}</Link></td>
                <td>{o.customerName}</td><td>{MODE_LABELS[o.mode]}</td>
                <td><span className={`pill ${o.status === 'CANCELLED' ? 'pill--red' : 'pill--green'}`}>{STATUS_LABELS[o.status]}</span></td>
                <td className="num">{formatPrice(o.total)}</td><td className="num">{hm(o.updatedAt)}</td>
              </tr>
            ))}
          </tbody></table></div>
        </section>
      )}
    </>
  );
}

/* « à l'instant », « 12 min », « 1 h 05 » */
function elapsed(ms: number) {
  const m = Math.max(0, Math.floor(ms / 60_000));
  if (m < 1) return 'à l\'instant';
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}

/* Heure courante rafraîchie toutes les 20 s, pour le temps écoulé affiché sur chaque commande */
function useNow(stepMs = 20_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), stepMs); return () => clearInterval(t); }, [stepMs]);
  return now;
}

function OrderTicket({ o, pending, act, showRestaurant, now }: { o: BoardOrder; pending: boolean; act: (fn: () => Promise<AdminResult>, ok?: string) => void; showRestaurant: boolean; now: number }) {
  const due = o.scheduledFor ? new Date(o.scheduledFor) : null;
  const waited = now - new Date(o.createdAt).getTime();
  // En retard : heure choisie dépassée, ou « dès que possible » au-delà du délai de préparation
  const late = due ? now > due.getTime() : waited > o.prepMinutes * 60_000;
  const later = !!due && now < new Date(o.startAt).getTime(); // commande pour plus tard, pas encore à lancer
  const unpaid = o.paymentStatus === 'UNPAID';
  const next = o.status === 'RECEIVED' ? { s: 'PREPARING' as const, l: 'Lancer' } : o.status === 'PREPARING' ? (o.mode === 'LIVRAISON' ? { s: 'OUT_FOR_DELIVERY' as const, l: 'Partie en livraison' } : { s: 'READY' as const, l: 'Prête' }) : { s: 'COMPLETED' as const, l: 'Remise au client' };

  return (
    <article className={`ticket ${o.status === 'RECEIVED' && !later ? 'is-new' : ''} ${later ? 'is-later' : ''} ${late && o.status !== 'RECEIVED' ? 'is-late' : ''}`}>
      <div className="ticket__head">
        <Link href={`/admin/commandes/${o.id}`} className="ticket__num">{orderNumberLabel(o.number)}</Link>
        <span className="pill pill--dark">{MODE_LABELS[o.mode]}</span>
      </div>
      {/* Heure de la commande en gros + temps écoulé (rouge au-delà du délai de préparation) */}
      <div className="ticket__time">
        <span className="ticket__clock">{hm(o.createdAt)}</span>
        {o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && <span className={`ticket__since ${late ? 'is-late' : ''}`}>il y a {elapsed(waited)}</span>}
      </div>
      <div className="ticket__meta">
        <span className={due ? 'pill pill--dark' : late ? 'pill pill--yellow' : 'pill'}>{due ? `Pour ${hm(o.scheduledFor!)}${later ? ` · à lancer à ${hm(o.startAt)}` : ''}` : `Dès que possible · prête vers ${hm(o.dueAt)}`}</span>
      </div>
      <div className="ticket__meta">
        <span><b>{o.customerName}</b> · <a href={`tel:${o.customerPhone}`}>{o.customerPhone}</a></span>
      </div>
      {showRestaurant && o.restaurant && <div className="ticket__meta"><span className="pill">{o.restaurant}</span></div>}
      {o.address && <div className="ticket__meta">{o.address}</div>}
      <div className="ticket__items">
        {o.items.map(i => { const { details, free } = splitFreePizza(i.details); return (<div key={i.id}><b>{i.qty} x {i.name}</b>{details.length > 0 && <small>{details.join(' · ')}</small>}{free && <b className="ticket-free">{i.qty} x {free}</b>}</div>); })}
      </div>
      {o.note && <div className="ticket__note">{o.note}</div>}
      <div className="ticket__meta" style={{ justifyContent: 'space-between' }}>
        <span className="price" style={{ fontSize: '1.3rem' }}>{formatPrice(o.total)}</span>
        <span className={`pill ${unpaid ? 'pill--red' : 'pill--green'}`}>{unpaid ? `À encaisser${o.onsiteMethods.length ? ` · ${onsiteLabel(o.onsiteMethods)}` : ''}` : o.paymentMethod === 'CARD' ? 'Payée CB en ligne' : 'Encaissée'}</span>
      </div>
      <div className="ticket__actions">
        {unpaid && <button className="btn btn--yellow" disabled={pending} onClick={() => act(() => collectOnsite(o.id), 'Encaissement enregistré')}>Encaisser</button>}
        {!(next.s === 'COMPLETED' && unpaid) && <button className="btn btn--primary" disabled={pending} onClick={() => act(() => changeStatus(o.id, next.s), `${orderNumberLabel(o.number)} : ${STATUS_LABELS[next.s].toLowerCase()}`)}>{next.l}</button>}
        <button className="btn btn--ghost" onClick={() => openTicket(o.id)}>{o.printedAt ? 'Réimprimer' : 'Ticket'}</button>
        {o.status !== 'OUT_FOR_DELIVERY' && <button className="btn btn--ghost" disabled={pending} onClick={() => {
          const reason = prompt(`Annuler ${orderNumberLabel(o.number)} ? Motif (visible du client) :`, 'Produit indisponible');
          if (reason !== null) act(() => cancel(o.id, reason), 'Commande annulée');
        }}>Annuler</button>}
      </div>
    </article>
  );
}
