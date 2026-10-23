'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { trackSiteEvent } from '../../lib/track';
import { THEME, GLASS_ACCENT } from './theme';

/**
 * Poziv "Ovakvu turu možete da imate i vi" u NAŠIM primerima tura (vlasnik,
 * 23. 10. 2026, maketa public/mockup/PlocicaUTuri.html, varijanta B).
 * Posetioci sa sajta najviše otvaraju primere tura, a u turi nije bilo ničeg
 * što vodi na naručivanje. Kartica se pojavi posle polovine soba, ili kad
 * vodič završi (page.tsx odlučuje kada); posle zatvaranja ostaje mala pilula
 * do kraja posete. U turama agencija se nikad ne prikazuje.
 *
 * Mesto se meri: kartica stoji odmah iznad donjih elemenata ture koji su
 * označeni sa data-k360-dock (opis sobe, meni, Viber dugme), i to samo onih
 * koji su ispod nje po širini - na telefonu je to ceo red, na računaru desni
 * ugao, gde je inače prazno.
 *
 * Tekst je samo SR i EN (nemački i ruski posetilac dobija engleski) - primeri
 * su za agencije i vlasnike iz Srbije, a cenovnik postoji samo na te dve strane.
 */

const COPY = {
  sr: {
    kicker: 'Kvadrat360 · ovo je primer',
    title: 'Ovakvu turu možete da imate i za svoju nekretninu.',
    sub: 'Snimamo u Kragujevcu, tura je gotova za 24–48h.',
    book: 'Zakažite snimanje',
    prices: 'Cene',
    pill: 'Ovakva tura za vašu nekretninu',
    close: 'Zatvori',
    home: '/'
  },
  en: {
    kicker: 'Kvadrat360 · this is a sample',
    title: 'You can have a tour like this for your property.',
    sub: 'We shoot in Kragujevac; the tour is ready in 24–48h.',
    book: 'Book a shoot',
    prices: 'Prices',
    pill: 'A tour like this for your property',
    close: 'Close',
    home: '/en'
  }
} as const;

const CLOSED_KEY = 'k360_demo_invite_closed';

/** Posetilac je karticu već zatvorio u ovoj poseti - ostaje samo pilula. */
export function wasDemoInviteClosed(): boolean {
  try {
    return sessionStorage.getItem(CLOSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function rememberDemoInviteClosed(): void {
  try {
    sessionStorage.setItem(CLOSED_KEY, '1');
  } catch {}
}

export default function DemoTourInvite({
  lang,
  narrow,
  hidden,
  layoutKey,
  closed,
  onClose
}: {
  lang: string;
  /**
   * Zatvorena = samo pilula. Stanje drži page.tsx: dok je kartica otvorena,
   * opis sobe se sklanja (vlasnik, 23. 10. 2026 - ne dve kartice jedna iznad
   * druge), a vraća se čim se ova zatvori.
   */
  closed: boolean;
  onClose: () => void;
  narrow: boolean;
  /** Sklonjena dok se prstom razgleda panorama (kao opis sobe). */
  hidden: boolean;
  /** Menja se kad se promeni donji deo ture (opis, meni) - tada se mesto meri iznova. */
  layoutKey: string;
}) {
  const copy = lang === 'sr' ? COPY.sr : COPY.en;
  const [bottom, setBottom] = useState(16);
  const ref = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    let limit = window.innerHeight - 16;
    document.querySelectorAll<HTMLElement>('[data-k360-dock]').forEach((dock) => {
      const r = dock.getBoundingClientRect();
      if (!r.height || r.right < box.left || r.left > box.right) return;
      limit = Math.min(limit, r.top - 10);
    });
    setBottom(Math.max(16, Math.round(window.innerHeight - limit)));
  }, []);

  useLayoutEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    document.querySelectorAll('[data-k360-dock]').forEach((dock) => observer.observe(dock));
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, layoutKey, closed, narrow]);

  const glass: React.CSSProperties = {
    position: 'absolute',
    bottom: `${bottom}px`,
    zIndex: 40,
    boxSizing: 'border-box',
    background: 'rgba(15, 20, 34, 0.78)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.28)',
    color: '#fff',
    fontFamily: THEME.fontBody
  };
  const side: React.CSSProperties = narrow ? { left: '12px' } : { right: '16px' };
  const fade = `k360-fade-ui${hidden ? ' is-immersive' : ''}`;

  if (closed) {
    return (
      <a
        ref={ref as unknown as React.Ref<HTMLAnchorElement>}
        href={`${copy.home}#kontakt`}
        target="_top"
        className={`${fade} k360-tap`}
        onClick={() => trackSiteEvent('cta_click', 'tour_invite_pill')}
        style={{
          ...glass,
          ...side,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          height: '36px',
          padding: '0 14px 0 12px',
          borderRadius: '999px',
          fontSize: '13px',
          fontWeight: 600,
          textDecoration: 'none',
          whiteSpace: 'nowrap'
        }}
      >
        <span aria-hidden="true" style={{ width: '12px', height: '12px', border: `2px solid ${GLASS_ACCENT}`, borderRadius: '3px', transform: 'rotate(45deg)', flex: 'none' }} />
        {copy.pill}
        <span aria-hidden="true" style={{ color: '#9cc3ff' }}>→</span>
      </a>
    );
  }

  return (
    <div
      ref={ref}
      data-k360-invite-card
      role="complementary"
      aria-label={copy.kicker}
      className={fade}
      style={{
        ...glass,
        ...(narrow ? { left: '12px', right: '12px' } : { right: '16px', width: '340px' }),
        borderRadius: '20px',
        padding: '14px 16px 15px'
      }}
    >
      <button
        type="button"
        onClick={onClose}
        className="k360-tap"
        aria-label={copy.close}
        title={copy.close}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.12)',
          border: 'none',
          borderRadius: '50%',
          color: 'rgba(255, 255, 255, 0.85)',
          fontSize: '19px',
          lineHeight: 1,
          cursor: 'pointer'
        }}
      >
        ×
      </button>
      <p style={{ margin: 0, paddingRight: '40px', fontSize: '10.5px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9cc3ff' }}>
        {copy.kicker}
      </p>
      <p style={{ margin: '5px 0 3px', paddingRight: '28px', fontFamily: 'var(--font-urbanist), var(--font-jakarta), system-ui, sans-serif', fontSize: narrow ? '16.5px' : '17.5px', fontWeight: 800, lineHeight: 1.2, textWrap: 'balance' }}>
        {copy.title}
      </p>
      <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.45, color: 'rgba(255, 255, 255, 0.8)' }}>{copy.sub}</p>
      <div style={{ display: 'flex', gap: '8px', marginTop: '11px' }}>
        <a
          href={`${copy.home}#kontakt`}
          target="_top"
          className="k360-tap"
          onClick={() => trackSiteEvent('cta_click', 'tour_invite_book')}
          style={{ display: 'inline-flex', alignItems: 'center', height: '38px', padding: '0 16px', borderRadius: '999px', background: '#1F5BB5', color: '#fff', fontSize: '13.5px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          {copy.book}
        </a>
        <a
          href={`${copy.home}#cenovnik`}
          target="_top"
          className="k360-tap"
          onClick={() => trackSiteEvent('cta_click', 'tour_invite_prices')}
          style={{ display: 'inline-flex', alignItems: 'center', height: '38px', padding: '0 16px', borderRadius: '999px', border: '1px solid rgba(255, 255, 255, 0.35)', color: '#fff', fontSize: '13.5px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          {copy.prices}
        </a>
      </div>
    </div>
  );
}
