'use client';

import { useEffect } from 'react';

/* Lance l'impression à l'ouverture (fenêtre ouverte depuis le tableau des commandes) */
export function AutoPrint({ auto, hidden = false }: { auto: boolean; hidden?: boolean }) {
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [auto]);
  if (hidden) return null; // impression auto depuis l'écran cuisine (cadre invisible)
  return (
    <p className="no-print center" style={{ marginBottom: 16, fontFamily: 'var(--text)' }}>
      <button className="btn btn--dark btn--sm" onClick={() => window.print()}>Imprimer</button>
    </p>
  );
}
