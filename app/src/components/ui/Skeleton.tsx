/* Squelettes de chargement : blocs gris animés à la forme du contenu attendu.
   Annoncés aux lecteurs d'écran par un seul « Chargement… » (role="status"). */

export function Sk({ w = '100%', h = 16, r = 8, style }: { w?: number | string; h?: number | string; r?: number; style?: React.CSSProperties }) {
  return <span className="sk" style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden="true" />;
}

export function Loading({ label = 'Chargement…', children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="page sk-page" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/* Carte de plat en cours de chargement */
export function SkCard() {
  return (
    <div className="sk-card" aria-hidden="true">
      <Sk h="auto" r={0} style={{ aspectRatio: '1 / 1', display: 'block' }} />
      <div style={{ padding: 12, display: 'grid', gap: 8 }}>
        <Sk w="70%" h={20} />
        <Sk w="90%" h={12} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}><Sk w={70} h={22} /><Sk w={44} h={44} r={12} /></div>
      </div>
    </div>
  );
}
