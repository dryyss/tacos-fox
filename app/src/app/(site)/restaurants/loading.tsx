import { Loading, Sk } from '@/components/ui/Skeleton';

/* Chargement de la liste des restaurants et des pages restaurant */
export default function RestaurantsLoading() {
  return (
    <Loading label="Chargement des restaurants…">
      <section className="section">
        <div className="sk-wrap">
          <Sk w={140} h={12} />
          <Sk w="55%" h={44} style={{ marginTop: 10 }} />
          <Sk w={220} h={44} r={12} style={{ marginTop: 18 }} />
          <div className="resto-grid" style={{ marginTop: 16 }}>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="sk-panel" aria-hidden="true">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><Sk w="55%" h={20} /><Sk w={110} h={22} r={999} /></div>
                <Sk w="80%" h={14} /><Sk w="50%" h={14} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}><Sk h={48} r={12} /><Sk h={48} r={12} /></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Loading>
  );
}
