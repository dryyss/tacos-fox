'use client';

import { useState } from 'react';

/* Planche imprimable : un QR général ou un QR par table */
export function QrSheet({ url }: { url: string }) {
  const [tables, setTables] = useState(0);
  const list = tables > 0 ? Array.from({ length: tables }, (_, i) => i + 1) : [null];
  return (
    <>
      <div className="filters no-print">
        <label className="small">Nombre de tables <input type="number" min={0} max={60} value={tables} onChange={e => setTables(Math.max(0, Math.min(60, Number(e.target.value) || 0)))} style={{ width: 80 }} /></label>
        <button className="btn btn--dark btn--sm" onClick={() => window.print()}>Imprimer</button>
        <a className="btn btn--ghost btn--sm" href="/api/admin/qrcode" download="qr-tacosfox.svg">Télécharger le QR (SVG)</a>
      </div>
      <p className="small muted no-print" style={{ marginBottom: 12 }}>Lien : {url}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {list.map(t => (
          <div key={t ?? 'all'} className="panel" style={{ margin: 0, textAlign: 'center', breakInside: 'avoid' }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: '1.8rem', letterSpacing: '.06em' }}>TACOS<span style={{ color: 'var(--red)' }}>FOX</span></div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/admin/qrcode${t ? `?table=${t}` : ''}`} alt={t ? `QR code table ${t}` : 'QR code de la carte'} style={{ width: '100%', maxWidth: 200, margin: '8px auto' }} />
            <div style={{ fontFamily: 'var(--display)', fontSize: '1.4rem' }}>{t ? `Table ${t}` : 'Scannez, commandez'}</div>
            <div className="small muted">Commande directe, sans appli</div>
          </div>
        ))}
      </div>
    </>
  );
}
