'use client';

/* Planche imprimable : un QR code par restaurant */
export function QrSheet({ restaurants }: { restaurants: { slug: string; title: string; street: string; url: string }[] }) {
  return (
    <>
      <div className="filters no-print">
        <button className="btn btn--dark btn--sm" onClick={() => window.print()}>Imprimer</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {restaurants.map(r => (
          <div key={r.slug} className="panel" style={{ margin: 0, textAlign: 'center', breakInside: 'avoid' }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: '1.8rem', letterSpacing: '.06em' }}>TACOS<span style={{ color: 'var(--red)' }}>FOX</span></div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/admin/qrcode?r=${r.slug}`} alt={`QR code ${r.title}`} style={{ width: '100%', maxWidth: 200, margin: '8px auto' }} />
            <div style={{ fontFamily: 'var(--display)', fontSize: '1.4rem' }}>Scannez, commandez</div>
            <div className="small"><b>{r.title}</b>, {r.street}</div>
            <div className="small muted">Commande directe, sans appli</div>
            <div className="no-print" style={{ marginTop: 8 }}>
              <a className="btn btn--ghost btn--sm" href={`/api/admin/qrcode?r=${r.slug}`} download={`qr-tacosfox-${r.slug}.svg`}>Télécharger (SVG)</a>
              <p className="small muted" style={{ marginTop: 6, wordBreak: 'break-all' }}>{r.url}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
