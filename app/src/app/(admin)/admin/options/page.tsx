import { requireStaffPage } from '@/lib/admin';
import { OPTION_LABELS, type OptionCode } from '@/lib/options';
import { OptionsEditor } from './OptionsEditor';

export const metadata = { title: 'Options' };

/* Prix des options du devis DEV-2026-TFX-004, pour mémoire */
const PRICES: Record<OptionCode, string> = {
  O1: '300 €', O2: '300 €', O3: '250 €', O4: '200 €', O5: '500 €', O6: '400 €', O7: '300 €', O8: '200 €', O9: '150 €', O10: '250 €',
};
/* Options dont le code existe déjà dans le socle (les autres demandent un développement) */
const READY: OptionCode[] = ['O1', 'O2', 'O3', 'O5', 'O7', 'O8', 'O9'];

export default async function OptionsPage() {
  const user = await requireStaffPage('options');
  return (
    <>
      <h1 className="admin-title">Options du devis</h1>
      <p className="admin-sub">Réservé à MAGAR Développement. Activez une option quand Tacos Fox l&apos;a achetée : elle apparaît aussitôt sur le site et dans la gestion du gérant. Formule de base : Essentiel (aucune option).</p>
      <OptionsEditor options={(Object.keys(OPTION_LABELS) as OptionCode[]).map(code => ({
        code, label: OPTION_LABELS[code], price: PRICES[code], ready: READY.includes(code), enabled: user.options.has(code),
      }))} />
    </>
  );
}
