'use client';

import { useEffect, useState } from 'react';
import { formatAmount } from '@/lib/money';

export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" className="toggle" aria-pressed={on} aria-label={label} title={label} disabled={disabled} onClick={() => onChange(!on)} />;
}

/* Champ prix en euros (« 10,50 »), valeur en centimes ; vide autorisé si nullable */
export function Euro({ value, onChange, label, nullable }: { value: number | null; onChange: (c: number | null) => void; label: string; nullable?: boolean }) {
  const show = (v: number | null) => (v === null ? '' : formatAmount(v));
  const [text, setText] = useState(show(value));
  useEffect(() => { setText(t => (parse(t) === value ? t : show(value))); }, [value]);
  return (
    <input className="price-input" inputMode="decimal" aria-label={label} value={text} placeholder={nullable ? '—' : '0,00'}
      onChange={e => {
        setText(e.target.value);
        const c = parse(e.target.value);
        if (c !== undefined && (c !== null || nullable)) onChange(c);
      }}
      onBlur={() => setText(show(value))} />
  );
}

/* undefined = saisie invalide, null = vide */
function parse(s: string): number | null | undefined {
  const v = s.trim().replace(/\s|€/g, '').replace(',', '.');
  if (v === '') return null;
  return /^\d+(\.\d{1,2})?$/.test(v) ? Math.round(Number(v) * 100) : undefined;
}
