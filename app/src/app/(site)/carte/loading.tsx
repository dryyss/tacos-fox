import { Loading, Sk, SkCard } from '@/components/ui/Skeleton';

/* Chargement de la carte : catégories à gauche, plats en grille, panier à droite (ordinateur) */
export default function CarteLoading() {
  return (
    <Loading label="Chargement de la carte…">
      <div className="sk-menu">
        <aside className="sk-menu__side" aria-hidden="true">
          <Sk h={44} r={12} />
          <div className="sk-panel">{Array.from({ length: 9 }, (_, i) => <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Sk w={36} h={36} r={8} /><Sk w="60%" h={16} /></div>)}</div>
        </aside>
        <div>
          <Sk h={150} r={16} />
          <div className="sk-grid" style={{ marginTop: 16 }}>{Array.from({ length: 6 }, (_, i) => <SkCard key={i} />)}</div>
        </div>
      </div>
    </Loading>
  );
}
