'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Toggle } from '@/components/admin/fields';
import type { OptionCode } from '@/lib/options';
import { setOption } from './actions';

interface Row { code: OptionCode; label: string; price: string; ready: boolean; enabled: boolean }

export function OptionsEditor({ options }: { options: Row[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <div className="table-wrap" tabIndex={0}>
      <table className="table">
        <thead><tr><th>Option</th><th className="num">Prix</th><th>État</th><th>Active</th></tr></thead>
        <tbody>
          {options.map(o => (
            <tr key={o.code}>
              <td><b>{o.code}</b> · {o.label}</td>
              <td className="num">{o.price}</td>
              <td>{o.ready ? <span className="pill pill--green">Prête</span> : <span className="pill">À développer</span>}</td>
              <td>
                <Toggle on={o.enabled} label={`Activer ${o.label}`} disabled={pending || (!o.ready && !o.enabled)}
                  onChange={v => start(async () => {
                    const r = await setOption(o.code, v);
                    if (!r.ok) return toast(r.error ?? 'Erreur');
                    toast(`${o.code} ${v ? 'activée' : 'désactivée'}`);
                    router.refresh();
                  })} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
