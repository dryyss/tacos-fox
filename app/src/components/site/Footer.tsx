import Link from 'next/link';
import { Icon } from '@/components/Icons';
import type { Restaurant } from '@/lib/catalog';
import { phoneHref } from '@/lib/format';

export function Footer({ settings }: { settings: Restaurant['settings'] }) {
  return (
    <footer className="footer">
      <div className="footer__grid">
        <div>
          <div className="footer__brand">TACOS<span>FOX</span></div>
          <p className="small">{settings.tagline}. {settings.slogan}.</p>
          <p className="small" style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}><Icon name="halal" /> {settings.halalLabel}</p>
        </div>
        <div className="footer__links">
          <strong>Commander</strong>
          <Link href="/carte">La carte</Link>
          <Link href="/carte?cat=tacos">Composer un tacos</Link>
          <Link href="/carte?cat=pizzas">Pizzas : 1 achetée = 1 offerte</Link>
          <Link href="/compte">Mon compte</Link>
        </div>
        <div className="footer__links">
          <strong>Le restaurant</strong>
          <Link href="/infos">Horaires et accès</Link>
          {settings.phone && <a href={phoneHref(settings.phone)}>{settings.phone}</a>}
          <span>{settings.addressLine1}, {settings.postalCode} {settings.city}</span>
        </div>
      </div>
      <div className="footer__legal">
        <Link href="/mentions-legales">Mentions légales</Link>
        <Link href="/cgv">CGV</Link>
        <Link href="/confidentialite">Confidentialité</Link>
        <Link href="/allergenes">Allergènes</Link>
        <span>Prix TTC, service compris</span>
        <a className="footer__credit" href="https://magar-developpement.fr" target="_blank" rel="noopener" aria-label="Site réalisé par MAGAR Développement">
          <span>Site réalisé par</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/magar-dev-mark.svg" alt="" width={28} height={20} />
          <strong>MAGAR <em>Développement</em></strong>
        </a>
      </div>
    </footer>
  );
}
