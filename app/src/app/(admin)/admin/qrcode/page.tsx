import { appUrl } from '@/lib/url';
import { QrSheet } from './QrSheet';

export const metadata = { title: 'QR code' };

export default function QrPage() {
  return (
    <>
      <div className="admin-head no-print">
        <div>
          <h1 className="admin-title">QR code de la carte</h1>
          <p className="admin-sub" style={{ margin: 0 }}>Pour la vitrine, les flyers et les tables. Le QR « table » présélectionne le mode sur place.</p>
        </div>
      </div>
      <QrSheet url={`${appUrl()}/carte`} />
    </>
  );
}
