'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@/components/Icons';
import type { SlideView } from '@/lib/slide-types';

const STAGE_MS = 5600;
const BANNER_MS = 4800;

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduce(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return reduce;
}

function safeHref(href: string) {
  const v = href.trim();
  if (v.startsWith('/') && !v.startsWith('//')) return v;
  if (/^https:\/\//i.test(v)) return v;
  return '';
}

function Title({ title, highlight, className }: { title: string; highlight: string; className: string }) {
  const h = highlight.trim();
  if (!h) return <div className={className}>{title}</div>;
  const i = title.toLowerCase().indexOf(h.toLowerCase());
  if (i < 0) return <div className={className}>{title} <span className="accent">{h}</span></div>;
  return (
    <div className={className}>
      {title.slice(0, i)}
      <span className="accent">{title.slice(i, i + h.length)}</span>
      {title.slice(i + h.length)}
    </div>
  );
}

function SlideLink({ href, className, children, tabIndex, hidden }: { href: string; className: string; children: ReactNode; tabIndex?: number; hidden?: boolean }) {
  const safe = safeHref(href);
  const hiddenProps = hidden ? { 'aria-hidden': true as const, tabIndex: -1 } : { tabIndex };
  if (!safe) return <div className={className} {...hiddenProps}>{children}</div>;
  if (safe.startsWith('http')) return <a className={className} href={safe} target="_blank" rel="noopener noreferrer" {...hiddenProps}>{children}</a>;
  return <Link className={className} href={safe} {...hiddenProps}>{children}</Link>;
}

function Dots({ slides, index, onPick, label }: { slides: SlideView[]; index: number; onPick: (n: number) => void; label: string }) {
  if (slides.length < 2) return null;
  return (
    <div className="dots" role="tablist" aria-label={label}>
      {slides.map((s, n) => (
        <button key={s.id} type="button" role="tab" className={`dot-btn ${n === index ? 'is-on' : ''}`} aria-selected={n === index} aria-label={`${n + 1}. ${s.title}`} onClick={() => onPick(n)} />
      ))}
    </div>
  );
}

/* Grand diaporama : défilement auto, swipe, pause au survol */
export function PromoCarousel({ slides }: { slides: SlideView[] }) {
  const [i, setI] = useState(0);
  const [hover, setHover] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const reduce = useReducedMotion();
  const startX = useRef(0);
  const dragged = useRef(false);
  const count = slides.length;
  const index = count ? ((i % count) + count) % count : 0;
  const paused = hover || userPaused;

  useEffect(() => {
    if (paused || reduce || count < 2) return;
    const id = window.setInterval(() => setI(n => (n + 1) % count), STAGE_MS);
    return () => window.clearInterval(id);
  }, [paused, reduce, count, i]);

  if (!count) return null;
  const go = (dir: number) => setI(n => (n + dir + count) % count);

  return (
    <div
      className="stage"
      style={{ ['--stage-ms' as string]: `${STAGE_MS}ms` }}
      role="region"
      aria-roledescription="carrousel"
      aria-label="À l'affiche"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setHover(true)}
      onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHover(false); }}
      onKeyDown={e => {
        if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      }}
    >
      <div
        className="stage__viewport"
        onTouchStart={e => { startX.current = e.touches[0].clientX; dragged.current = false; }}
        onTouchEnd={e => {
          const dx = e.changedTouches[0].clientX - startX.current;
          if (Math.abs(dx) < 48) return;
          dragged.current = true;
          go(dx < 0 ? 1 : -1);
        }}
        onClickCapture={e => { if (dragged.current) { e.preventDefault(); e.stopPropagation(); dragged.current = false; } }}
      >
        <div className="stage__track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((s, n) => (
            <SlideLink key={s.id} href={s.ctaHref} hidden={n !== index} className={`stage__slide tone-${s.tone.toLowerCase()} ${n === index ? 'is-active' : ''}`}>
              <div className="stage__copy">
                {s.kicker && <span className="stage__kicker">{s.kicker}</span>}
                <Title className="stage__title" title={s.title} highlight={s.highlight} />
                {s.text && <p className="stage__text">{s.text}</p>}
                {s.ctaLabel && <span className="stage__cta">{s.ctaLabel}</span>}
              </div>
              {s.imageUrl && <div className="stage__media"><img src={s.imageUrl} alt="" /></div>}
              {s.badge && <span className="stage__badge">{s.badge}</span>}
            </SlideLink>
          ))}
        </div>
      </div>
      {count > 1 && (
        <div className="stage__controls">
          <button type="button" className="stage__nav" aria-label="Offre précédente" onClick={() => go(-1)}><Icon name="back" /></button>
          <Dots slides={slides} index={index} onPick={setI} label="Offres à l'affiche" />
          <button type="button" className="stage__nav" aria-label="Offre suivante" onClick={() => go(1)}><Icon name="chevron" /></button>
          <button type="button" className="stage__pause" aria-pressed={userPaused} onClick={() => setUserPaused(v => !v)}>{userPaused ? 'Lecture' : 'Pause'}</button>
        </div>
      )}
      {count > 1 && !reduce && !paused && <div className="stage__progress" aria-hidden="true"><span key={index} /></div>}
    </div>
  );
}

/* Bandeau qui tourne. S'il n'y en a aucun, l'accueil garde l'offre pizza calculée. */
export function PromoBanner({ slides }: { slides: SlideView[] }) {
  const [i, setI] = useState(0);
  const [hover, setHover] = useState(false);
  const reduce = useReducedMotion();
  const count = slides.length;
  const index = count ? ((i % count) + count) % count : 0;
  const slide = slides[index];

  useEffect(() => {
    if (hover || reduce || count < 2) return;
    const id = window.setInterval(() => setI(n => (n + 1) % count), BANNER_MS);
    return () => window.clearInterval(id);
  }, [hover, reduce, count, i]);

  if (!slide) return null;
  const ctaDark = slide.tone === 'RED' || slide.tone === 'DARK';
  return (
    <div className="promo-rotator" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} role="region" aria-label="Offres en bandeau">
      <SlideLink key={`${slide.id}-${index}`} href={slide.ctaHref} className={`promo tone-${slide.tone.toLowerCase()} ${slide.badge ? '' : 'promo--plain'} ${reduce ? '' : 'promo--in'}`}>
        {slide.badge && <div className="promo__pizza">{slide.badge}</div>}
        <div>
          {slide.kicker && <span className="promo__kicker">{slide.kicker}</span>}
          <Title className="promo__title" title={slide.title} highlight={slide.highlight} />
        </div>
        {slide.text && <p className="promo__text">{slide.text}</p>}
        {slide.ctaLabel && <span className={`btn promo__cta ${ctaDark ? 'btn--yellow' : 'btn--dark'}`}>{slide.ctaLabel}</span>}
      </SlideLink>
      <Dots slides={slides} index={index} onPick={setI} label="Bandeaux" />
    </div>
  );
}

/* Cartes publicitaires, défilantes au doigt, en grille sur grand écran */
export function PromoPanels({ slides }: { slides: SlideView[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    const el = ref.current;
    if (!el) return;
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    el.scrollBy({ left: dir * Math.max(220, el.clientWidth * 0.8), behavior });
  };
  if (!slides.length) return null;
  return (
    <div className="rail">
      <button type="button" className="rail__btn rail__btn--prev" aria-label="Offres précédentes" onClick={() => scroll(-1)}><Icon name="back" /></button>
      <div className="offer-rail" ref={ref}>
        {slides.map(s => (
          <SlideLink key={s.id} href={s.ctaHref} className={`offer tone-${s.tone.toLowerCase()} ${s.imageUrl ? 'offer--photo' : ''}`}>
            {s.imageUrl && <img className="offer__img" src={s.imageUrl} alt="" />}
            {s.badge && <span className="offer__badge">{s.badge}</span>}
            {s.kicker && <span className="offer__kicker">{s.kicker}</span>}
            <Title className="offer__title" title={s.title} highlight={s.highlight} />
            {s.text && <p className="offer__text">{s.text}</p>}
            {s.ctaLabel && <span className="offer__cta">{s.ctaLabel} <Icon name="chevron" /></span>}
          </SlideLink>
        ))}
      </div>
      <button type="button" className="rail__btn rail__btn--next" aria-label="Offres suivantes" onClick={() => scroll(1)}><Icon name="chevron" /></button>
    </div>
  );
}
