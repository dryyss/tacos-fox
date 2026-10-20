import type { Metadata } from 'next';
import { getCatalog, getSettings } from '@/lib/catalog';
import { ALLERGENS } from '@/lib/allergens';
import { orTodo } from '../todo';

export const metadata: Metadata = { title: 'Allergènes', description: 'Liste des allergènes présents dans les plats de Tacos Fox à Stains.' };
export const dynamic = 'force-dynamic';

export default async function AllergensPage() {
  const [catalog, s] = await Promise.all([getCatalog(), getSettings()]);
  const filled = catalog.products.filter(p => p.allergens.length);
  return (
    <article className="page legal" style={{ maxWidth: 1100 }}>
      <h1>Allergènes</h1>
      <p>Conformément au règlement européen INCO (UE 1169/2011), voici les 14 allergènes majeurs présents dans nos plats. Nos produits sont préparés dans une cuisine commune : des traces de tous les allergènes sont possibles. En cas d&apos;allergie, demandez conseil au comptoir ou au {orTodo(s.phone, 'téléphone')} avant de commander.</p>
      {!filled.length && <p><mark style={{ background: 'var(--yellow)', padding: '0 4px' }}>[allergènes à renseigner par le restaurant dans l&apos;espace de gestion]</mark></p>}
      {catalog.categories.map(c => {
        const list = catalog.products.filter(p => p.categorySlug === c.slug);
        if (!list.length) return null;
        return (
          <section key={c.slug}>
            <h2>{c.label}</h2>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Plat</th>{ALLERGENS.map(a => <th key={a} style={{ fontSize: '.7rem', writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>{a}</th>)}</tr></thead>
                <tbody>
                  {list.map(p => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      {ALLERGENS.map(a => <td key={a} style={{ textAlign: 'center' }}>{p.allergens.includes(a) ? '●' : ''}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </article>
  );
}
