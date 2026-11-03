'use client';

import { useState, type ReactNode } from 'react';
import { Icon } from '@/components/Icons';

interface Item { id: string; lat: number | null; lng: number | null; card: ReactNode }

/* Distance à vol d'oiseau, en km */
function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const label = (d: number) => (d < 1 ? `à ${Math.round(d * 1000 / 50) * 50} m` : `à ${d.toFixed(1).replace('.', ',')} km`);

/* C2 : « le plus proche de moi » trie les restaurants par distance (la position reste dans le navigateur) */
export function NearestList({ items }: { items: Item[] }) {
  const [state, setState] = useState<'idle' | 'loading' | 'denied' | 'done'>('idle');
  const [dist, setDist] = useState<Record<string, number>>({});

  const locate = () => {
    if (!('geolocation' in navigator)) return setState('denied');
    setState('loading');
    navigator.geolocation.getCurrentPosition(
      p => {
        const me = { lat: p.coords.latitude, lng: p.coords.longitude };
        setDist(Object.fromEntries(items.filter(i => i.lat != null && i.lng != null).map(i => [i.id, km(me, { lat: i.lat!, lng: i.lng! })])));
        setState('done');
      },
      () => setState('denied'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

  const sorted = state === 'done' ? [...items].sort((a, b) => (dist[a.id] ?? 1e9) - (dist[b.id] ?? 1e9)) : items;
  return (
    <>
      <div className="nearest">
        <button type="button" className="btn btn--dark" onClick={locate} disabled={state === 'loading'}>
          <Icon name="pin" /> {state === 'loading' ? 'Localisation…' : 'Le plus proche de moi'}
        </button>
        {state === 'denied' && <span className="small muted">Position indisponible : choisissez dans la liste.</span>}
        {state === 'done' && <span className="small muted">Classés du plus proche au plus loin.</span>}
      </div>
      <div className="resto-grid">
        {sorted.map((i, k) => (
          <div key={i.id} className="nearest__item">
            {state === 'done' && dist[i.id] != null && <span className={`nearest__dist ${k === 0 ? 'is-first' : ''}`}>{k === 0 ? 'Le plus proche · ' : ''}{label(dist[i.id])}</span>}
            {i.card}
          </div>
        ))}
      </div>
    </>
  );
}
