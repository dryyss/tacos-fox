'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '@/components/Icons';

/* Feuille modale : glisse du bas sur mobile, fenêtre centrée sur ordinateur */
export function Sheet({ title, sub, onClose, children, foot }: { title: string; sub?: string; onClose: () => void; children: ReactNode; foot: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchY = useRef<number | null>(null);

  useEffect(() => {
    document.body.classList.add('is-locked');
    const t = setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 50);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.classList.remove('is-locked'); clearTimeout(t); document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <section
        className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle"
        onTouchStart={e => { if ((e.target as HTMLElement).closest('.sheet__handle, .sheet__head')) touchY.current = e.touches[0].clientY; }}
        onTouchEnd={e => { if (touchY.current !== null && e.changedTouches[0].clientY - touchY.current > 80) onClose(); touchY.current = null; }}
      >
        <div className="sheet__handle" aria-hidden="true" />
        <div className="sheet__inner">
          <div className="sheet__head">
            <div><h2 className="sheet__title" id="sheetTitle">{title}</h2>{sub && <p className="sheet__sub">{sub}</p>}</div>
            <button ref={closeRef} className="sheet__close" onClick={onClose} aria-label="Fermer"><Icon name="close" /></button>
          </div>
          <div className="sheet__body">{children}</div>
          <div className="sheet__foot">{foot}</div>
        </div>
      </section>
    </>
  );
}

export function Qty({ value, onChange, small }: { value: number; onChange: (v: number) => void; small?: boolean }) {
  return (
    <div className={`qty ${small ? 'qty--sm' : ''}`} role="group" aria-label="Quantité">
      <button type="button" onClick={() => onChange(value - 1)} aria-label="Moins"><Icon name="minus" /></button>
      <span>{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} aria-label="Plus"><Icon name="plus" /></button>
    </div>
  );
}
