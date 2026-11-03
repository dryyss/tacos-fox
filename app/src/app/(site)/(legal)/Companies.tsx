import { prisma } from '@/lib/prisma';
import { orTodo } from './todo';

/* Les sociétés qui exploitent chaque restaurant et encaissent ses ventes (vendeurs, factures) */
export async function Companies() {
  const restaurants = await prisma.restaurant.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  return (
    <ul>
      {restaurants.map(r => (
        <li key={r.id}>
          <b>{r.name} {r.city}</b>, {r.addressLine1}, {r.postalCode} {r.city} : exploité par {orTodo(r.legalName, 'raison sociale')}
          {r.legalForm && `, ${r.legalForm}`}{r.shareCapital > 0 && ` au capital de ${(r.shareCapital / 100).toLocaleString('fr-FR')} €`}
          {r.siren && `, RCS ${r.rcsCity} ${r.siren}`}{r.siret && `, SIRET ${r.siret}`}{r.vatNumber && `, TVA ${r.vatNumber}`}
          {r.phone && `, tél. ${r.phone}`}.
        </li>
      ))}
    </ul>
  );
}
