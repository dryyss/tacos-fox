import { requireStaffPage } from '@/lib/admin';
import { getHours, getSettings } from '@/lib/catalog';
import { stripeEnabled } from '@/lib/stripe';
import { SettingsEditor } from './SettingsEditor';

export const metadata = { title: 'Horaires et réglages' };

export default async function SettingsPage() {
  await requireStaffPage(true);
  const [settings, hours] = await Promise.all([getSettings(), getHours()]);
  const { id, updatedAt, ...editable } = settings; void id; void updatedAt;
  return (
    <>
      <h1 className="admin-title">Horaires et réglages</h1>
      <p className="admin-sub">Tout est appliqué immédiatement sur le site.</p>
      <SettingsEditor settings={editable} hours={hours} services={{ stripe: stripeEnabled(), email: !!process.env.RESEND_API_KEY }} />
    </>
  );
}
