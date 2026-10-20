import { requireStaffPage } from '@/lib/admin';
import { parisDay, parisDayRange, revenueBetween, splitVat, topProducts } from '@/lib/accounting';
import { getSettings } from '@/lib/catalog';
import { formatPrice } from '@/lib/money';
import { MODE_LABELS } from '@/lib/format';

export const metadata = { title: 'Comptabilité' };

const isDay = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export default async function AccountingPage({ searchParams }: { searchParams: Promise<{ du?: string; au?: string }> }) {
  await requireStaffPage(true);
  const sp = await searchParams;
  const today = parisDay(new Date());
  const monthStart = `${today.slice(0, 8)}01`;
  const fromDay = isDay(sp.du) ? sp.du! : monthStart;
  const toDay = isDay(sp.au) ? sp.au! : today;

  const thirtyAgo = new Date(); thirtyAgo.setUTCDate(thirtyAgo.getUTCDate() - 29);
  const [settings, todayStats, period, last30, top] = await Promise.all([
    getSettings(),
    revenueBetween(parisDayRange(today).from, parisDayRange(today).to),
    revenueBetween(parisDayRange(fromDay).from, parisDayRange(toDay).to),
    revenueBetween(parisDayRange(parisDay(thirtyAgo)).from, parisDayRange(today).to),
    topProducts(parisDayRange(fromDay).from, parisDayRange(toDay).to),
  ]);
  const vat = splitVat(period.revenue, settings.vatRate);

  const days = Array.from({ length: 30 }, (_, i) => { const d = new Date(thirtyAgo); d.setUTCDate(d.getUTCDate() + i); return parisDay(d); });
  const max = Math.max(1, ...days.map(d => last30.byDay[d] ?? 0));

  return (
    <>
      <div className="admin-head">
        <div><h1 className="admin-title">Comptabilité</h1><p className="admin-sub" style={{ margin: 0 }}>Montants TTC encaissés, remboursements déduits.</p></div>
        <form className="filters" style={{ margin: 0 }}>
          <label className="small">Du <input type="date" name="du" defaultValue={fromDay} /></label>
          <label className="small">au <input type="date" name="au" defaultValue={toDay} /></label>
          <button className="btn btn--dark btn--sm">Afficher</button>
          <a className="btn btn--primary btn--sm" href={`/api/admin/export?du=${fromDay}&au=${toDay}`}>Export CSV</a>
        </form>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="kpi__label">Aujourd&apos;hui</div><div className="kpi__value">{formatPrice(todayStats.revenue)}</div><div className="kpi__hint">{todayStats.count} commande{todayStats.count > 1 ? 's' : ''}</div></div>
        <div className="kpi"><div className="kpi__label">Période</div><div className="kpi__value">{formatPrice(period.revenue)}</div><div className="kpi__hint">{period.count} commandes</div></div>
        <div className="kpi"><div className="kpi__label">Panier moyen</div><div className="kpi__value">{formatPrice(period.average)}</div><div className="kpi__hint">sur la période</div></div>
        <div className="kpi"><div className="kpi__label">Remboursé</div><div className="kpi__value">{formatPrice(period.refunds)}</div><div className="kpi__hint">remises : {formatPrice(period.discounts)}</div></div>
      </div>

      <div className="panel" style={{ marginTop: 0 }}>
        <div className="panel__title">30 derniers jours</div>
        <div className="bar-chart" role="img" aria-label="Chiffre d'affaires par jour">
          {days.map(d => <div key={d} className="bar-chart__bar" style={{ height: `${((last30.byDay[d] ?? 0) / max) * 100}%` }} title={`${d.split('-').reverse().join('/')} : ${formatPrice(last30.byDay[d] ?? 0)}`} />)}
        </div>
        <div className="bar-chart__labels">{days.map((d, i) => <span key={d}>{i % 5 === 0 ? d.slice(8) + '/' + d.slice(5, 7) : ''}</span>)}</div>
      </div>

      <div className="infos-grid" style={{ padding: 0 }}>
        <div className="panel">
          <div className="panel__title">Ventilation de la période</div>
          <div className="summary-mini">
            <div><span>Total TTC</span><b>{formatPrice(period.revenue)}</b></div>
            <div><span>dont TVA ({(settings.vatRate / 100).toString().replace('.', ',')} %)</span><b>{formatPrice(vat.vat)}</b></div>
            <div><span>Total HT</span><b>{formatPrice(vat.ht)}</b></div>
            <div><span>dont frais de livraison</span><b>{formatPrice(period.deliveryFees)}</b></div>
            <div style={{ borderTop: '1px dashed var(--grey-2)', paddingTop: 6 }}><span>Carte en ligne</span><b>{formatPrice(period.byPayment.CARD)}</b></div>
            <div><span>Sur place</span><b>{formatPrice(period.byPayment.ONSITE)}</b></div>
            {(Object.keys(period.byMode) as (keyof typeof MODE_LABELS)[]).map(m => <div key={m}><span>{MODE_LABELS[m]}</span><b>{formatPrice(period.byMode[m])}</b></div>)}
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>TVA calculée au taux unique des réglages. Faites valider la ventilation par votre comptable si vous vendez des produits à taux différents.</p>
        </div>
        <div className="panel">
          <div className="panel__title">Meilleures ventes</div>
          {!top.length && <p className="small muted">Aucune vente sur la période.</p>}
          <div className="summary-mini">{top.map(t => <div key={t.name}><span>{t.name}</span><b>{t.qty}</b></div>)}</div>
        </div>
      </div>
    </>
  );
}
