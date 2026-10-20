'use client';

import { useEffect } from 'react';

/* Lance l'impression à l'ouverture (fenêtre ouverte depuis le tableau des commandes) */
export function AutoPrint({ auto }: { auto: boolean }) {
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [auto]);
  return (
    <p className="no-print center" style={{ marginBottom: 16, fontFamily: 'var(--text)' }}>
      <button className="btn btn--dark btn--sm" onClick={() => window.print()}>Imprimer</button>
    </p>
  );
}
