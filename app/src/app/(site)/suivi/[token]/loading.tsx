import { Loading, Sk } from '@/components/ui/Skeleton';

/* Chargement de la page de suivi de commande */
export default function SuiviLoading() {
  return (
    <Loading label="Chargement de votre commande…">
      <section className="confirm" style={{ display: 'grid', justifyItems: 'center', gap: 12 }}>
        <Sk w={64} h={64} r={999} />
        <Sk w="60%" h={36} />
        <Sk w="45%" h={14} />
        <Sk w={120} h={44} r={12} />
        <Sk h={70} r={16} style={{ marginTop: 8 }} />
        <div className="sk-panel" style={{ width: '100%' }}>{[0, 1, 2].map(i => <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Sk w={34} h={34} r={999} /><Sk w="60%" h={16} /></div>)}</div>
      </section>
    </Loading>
  );
}
