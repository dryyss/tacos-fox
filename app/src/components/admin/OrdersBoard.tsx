'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import type { BoardOrder } from '@/lib/admin-orders';
import { useToast } from '@/components/ui/Toast';
import { formatPrice } from '@/lib/money';
import { MODE_LABELS, orderNumberLabel, STATUS_LABELS } from '@/lib/format';
import { cancel, changeStatus, collectOnsite, type AdminResult } from '@/app/(admin)/admin/actions';

const TZ = 'Europe/Paris';
const hm = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).replace(':', 'h');
const AUTO_PRINT_KEY = 'tfx_admin_autoprint';

/* Bip court via Web Audio (aucun fichier à charger) */
function beep() {
  try {
    const ctx = new AudioContext();
    [0, 0.25].forEach(t => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.25, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
    });
  } catch { /* audio indisponible */ }
}

const openTicket = (id: string) => window.open(`/admin/commandes/${id}/ticket?print=1`, `ticket-${id}`, 'width=420,height=700');

export function OrdersBoard({ initial }: { initial: BoardOrder[] }) {
  const toast = useToast();
  const [orders, setOrders] = useState(initial);
  const [pending, start] = useTransition();
  const [autoPrint, setAutoPrint] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [offline, setOffline] = useState(false);
  const seen = useRef(new Set(initial.map(o => o.id)));

  useEffect(() => { try { setAutoPrint(localStorage.getItem(AUTO_PRINT_KEY) === '1'); } catch { /* ignoré */ } }, []);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/admin/orders', { cache: 'no-store' }).catch(() => null);
    if (!res?.ok) { setOffline(true); return; }
    setOffline(false);
    const data: BoardOrder[] = await res.json();
    const fresh = data.filter(o => !seen.current.has(o.id) && o.status === 'RECEIVED');
    data.forEach(o => seen.current.add(o.id));
    if (fresh.length) {
      if (soundOn) beep();
      toast(`${fresh.length} nouvelle${fresh.length > 1 ? 's' : ''} commande${fresh.length > 1 ? 's' : ''}`, 'bag');
      if (autoPrint) fresh.forEach(o => openTicket(o.id));
    }
    setOrders(data);
  }, [soundOn, autoPrint, toast]);

  useEffect(() => {
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  const act = (fn: () => Promise<AdminResult>, ok?: string) => start(async () => {
    const r = await fn();
    if (!r.ok) toast(r.error ?? 'Action impossible');
    else if (ok) toast(ok);
    await refresh();
  });

  const cols = [
    { title: 'Nouvelles', match: (o: BoardOrder) => o.status === 'RECEIVED' },
    { title: 'En préparation', match: (o: BoardOrder) => o.status === 'PREPARING' },
    { title: 'Prêtes / en livraison', match: (o: BoardOrder) => o.status === 'READY' || o.status === 'OUT_FOR_DELIVERY' },
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
          <button className={`btn btn--sm ${soundOn ? 'btn--dark' : 'btn--ghost'}`} onClick={() => { setSoundOn(v => !v); if (!soundOn) beep(); }}>{soundOn ? 'Son activé' : 'Activer le son'}</button>
          <button className={`btn btn--sm ${autoPrint ? 'btn--dark' : 'btn--ghost'}`} onClick={() => { const v = !autoPrint; setAutoPrint(v); try { localStorage.setItem(AUTO_PRINT_KEY, v ? '1' : '0'); } catch { /* ignoré */ } toast(v ? 'Impression auto activée : autorisez les fenêtres pop-up' : 'Impression auto désactivée'); }}>
            {autoPrint ? 'Impression auto : oui' : 'Impression auto : non'}
          </button>
        </div>
      </div>

      <div className="board">
        {cols.map(c => {
          const list = orders.filter(c.match);
          return (
            <section key={c.title} className="board__col">
              <div className="board__title">{c.title}<span className="board__count">{list.length}</span></div>
              {!list.length && <p className="small muted" style={{ padding: '0 6px 8px' }}>Rien pour le moment.</p>}
              {list.map(o => <OrderTicket key={o.id} o={o} pending={pending} act={act} />)}
            </section>
          );
        })}
      </div>

      {done.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: 10 }}>Terminées récemment</h2>
          <div className="table-wrap"><table className="table"><tbody>
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

function OrderTicket({ o, pending, act }: { o: BoardOrder; pending: boolean; act: (fn: () => Promise<AdminResult>, ok?: string) => void }) {
  const due = o.scheduledFor ? new Date(o.scheduledFor) : null;
  const late = due ? Date.now() > due.getTime() : Date.now() - new Date(o.createdAt).getTime() > 30 * 60 * 1000;
  const unpaid = o.paymentStatus === 'UNPAID';
  const next = o.status === 'RECEIVED' ? { s: 'PREPARING' as const, l: 'Lancer' } : o.status === 'PREPARING' ? (o.mode === 'LIVRAISON' ? { s: 'OUT_FOR_DELIVERY' as const, l: 'Partie en livraison' } : { s: 'READY' as const, l: 'Prête' }) : { s: 'COMPLETED' as const, l: 'Remise au client' };

  return (
    <article className={`ticket ${o.status === 'RECEIVED' ? 'is-new' : ''} ${late && o.status !== 'RECEIVED' ? 'is-late' : ''}`}>
      <div className="ticket__head">
        <Link href={`/admin/commandes/${o.id}`} className="ticket__num">{orderNumberLabel(o.number)}</Link>
        <span className="pill pill--dark">{MODE_LABELS[o.mode]}</span>
      </div>
      <div className="ticket__meta">
        <span><b>{o.customerName}</b> · <a href={`tel:${o.customerPhone}`}>{o.customerPhone}</a></span>
        <span>Reçue {hm(o.createdAt)}</span>
        <span className={late ? 'pill pill--yellow' : ''}>{due ? `Pour ${hm(o.scheduledFor!)}` : 'Dès que possible'}</span>
      </div>
      {o.address && <div className="ticket__meta">{o.address}</div>}
      <div className="ticket__items">
        {o.items.map(i => <div key={i.id}><b>{i.qty} x {i.name}</b>{i.details.length > 0 && <small>{i.details.join(' · ')}</small>}</div>)}
      </div>
      {o.note && <div className="ticket__note">{o.note}</div>}
      <div className="ticket__meta" style={{ justifyContent: 'space-between' }}>
        <span className="price" style={{ fontSize: '1.3rem' }}>{formatPrice(o.total)}</span>
        <span className={`pill ${unpaid ? 'pill--red' : 'pill--green'}`}>{unpaid ? 'À encaisser' : o.paymentMethod === 'CARD' ? 'Payée CB en ligne' : 'Encaissée'}</span>
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
