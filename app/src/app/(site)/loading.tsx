import { Loading, Sk, SkCard } from '@/components/ui/Skeleton';

/* Chargement d'une page du site (accueil, pages légales…) */
export default function SiteLoading() {
  return (
    <Loading>
      <section className="section">
        <div className="sk-wrap">
          <Sk w={180} h={12} />
          <Sk w="60%" h={44} style={{ marginTop: 10 }} />
          <Sk w="80%" h={14} style={{ marginTop: 14 }} />
          <Sk w="50%" h={14} style={{ marginTop: 8 }} />
          <div className="sk-grid" style={{ marginTop: 24 }}>{[0, 1, 2, 3].map(i => <SkCard key={i} />)}</div>
        </div>
      </section>
    </Loading>
  );
}
