import { Sk } from '@/components/ui/Skeleton';

/* Chargement de la gestion (écran cuisine en 3 colonnes) */
export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Chargement…</span>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'grid', gap: 8 }}><Sk w={200} h={34} /><Sk w={260} h={14} /></div>
        <Sk w={160} h={38} r={10} />
      </div>
      <div className="board" aria-hidden="true">
        {[0, 1, 2].map(c => (
          <section key={c} className="board__col">
            <Sk w="45%" h={22} style={{ margin: '4px 6px 12px' }} />
            {[0, 1].map(i => <div key={i} className="sk-panel" style={{ marginBottom: 10 }}><Sk w="40%" h={24} /><Sk w="30%" h={30} /><Sk w="80%" h={14} /><Sk w="60%" h={14} /><div style={{ display: 'flex', gap: 8 }}><Sk w={90} h={40} r={10} /><Sk w={80} h={40} r={10} /></div></div>)}
          </section>
        ))}
      </div>
    </div>
  );
}
