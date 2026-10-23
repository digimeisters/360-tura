'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { trackSiteEvent } from '../../lib/track';
import { THEME, GLASS_ACCENT } from './theme';
import { CONTACT_LINKS } from '../../lib/site';

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
 * "Zakažite snimanje" otvara kratku formu u istoj kartici (ime + telefon,
 * POST /api/contact sa from: 'tour') umesto da vodi na početnu, koja se na
 * telefonu sporo učitava (vlasnik, 23. 10. 2026, maketa UpitUTuri.html).
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
    home: '/',
    formKicker: 'Kvadrat360 · zakazivanje snimanja',
    formTitle: 'Ostavite broj, javljamo vam se',
    nameLabel: 'Ime',
    namePh: 'Vaše ime',
    contactLabel: 'Telefon ili Viber',
    contactPh: '06x xxx xxxx',
    send: 'Pošaljite',
    sending: 'Šaljemo…',
    //   i ⁠: "pon–sub 08–20h" ostaje u jednom redu.
    fine: 'Javljamo se u radno vreme, pon⁠–⁠sub 08⁠–⁠20h. Broj koristimo samo za ovaj poziv.',
    or: 'ili odmah',
    call: '📞 Pozovite',
    formInvalid: 'Upišite ime i broj telefona.',
    formFailed: 'Upit nije poslat. Pokušajte ponovo ili nas pozovite.',
    thanks: 'Hvala, {name}!',
    sentBefore: 'Javljamo se na ',
    sentAfter: ' u radno vreme (pon⁠–⁠sub, 08⁠–⁠20h). Do tada slobodno razgledajte turu.',
    viberUs: 'Pišite nam na Viber'
  },
  en: {
    kicker: 'Kvadrat360 · this is a sample',
    title: 'You can have a tour like this for your property.',
    sub: 'We shoot in Kragujevac; the tour is ready in 24–48h.',
    book: 'Book a shoot',
    prices: 'Prices',
    pill: 'A tour like this for your property',
    close: 'Close',
    home: '/en',
    formKicker: 'Kvadrat360 · book a shoot',
    formTitle: 'Leave your number, we will call you',
    nameLabel: 'Name',
    namePh: 'Your name',
    contactLabel: 'Phone or Viber',
    contactPh: '+381 6x xxx xxxx',
    send: 'Send',
    sending: 'Sending…',
    fine: 'We reply during working hours, Mon⁠–⁠Sat 08⁠–⁠20h. We use your number only for this call.',
    or: 'or right now',
    call: '📞 Call us',
    formInvalid: 'Please enter your name and phone number.',
    formFailed: 'Not sent. Please try again or call us.',
    thanks: 'Thank you, {name}!',
    sentBefore: 'We will call ',
    sentAfter: ' during working hours (Mon⁠–⁠Sat, 08⁠–⁠20h). Meanwhile, feel free to keep exploring the tour.',
    viberUs: 'Message us on Viber'
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
  onClose,
  tourSlug
}: {
  lang: string;
  /** Tura iz koje je upit - ide u bazu i na Telegram. */
  tourSlug: string;
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
  const [view, setView] = useState<'card' | 'form' | 'sent'>('card');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ name: string; contact: string } | null>(null);
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

  const sendForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    const data = new FormData(e.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const contact = String(data.get('contact') ?? '').trim();
    if (!name || (contact.match(/\d/g) ?? []).length < 6) {
      setFormError(copy.formInvalid);
      return;
    }
    setSending(true);
    setFormError(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contact, from: 'tour', tourSlug, lang: lang === 'sr' ? 'sr' : 'en' })
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) throw new Error(json?.error || '');
      trackSiteEvent('form_submit', 'tour_invite_form');
      setSent({ name: name.split(/\s+/)[0], contact });
      setView('sent');
    } catch {
      setFormError(copy.formFailed);
    } finally {
      setSending(false);
    }
  };

  const title: React.CSSProperties = {
    margin: '5px 0 3px',
    paddingRight: '28px',
    fontFamily: 'var(--font-urbanist), var(--font-jakarta), system-ui, sans-serif',
    fontSize: narrow ? '16.5px' : '17.5px',
    fontWeight: 800,
    lineHeight: 1.2,
    textWrap: 'balance'
  };
  const primary: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '40px', padding: '0 16px', borderRadius: '999px',
    background: '#1F5BB5', color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', cursor: 'pointer'
  };
  const outline: React.CSSProperties = {
    ...primary, background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.38)', fontWeight: 600
  };
  const viber: React.CSSProperties = {
    ...primary, background: 'linear-gradient(180deg, #8C7CF7 0%, #7360F2 55%, #5F4BDB 100%)'
  };
  const field: React.CSSProperties = {
    display: 'block', width: '100%', boxSizing: 'border-box', height: '42px', margin: '0 0 9px', padding: '0 12px', borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.25)', background: 'rgba(255, 255, 255, 0.96)', color: '#111113', fontFamily: 'inherit', fontSize: '16px'
  };
  const labelStyle: React.CSSProperties = { display: 'block', margin: '0 0 4px', fontSize: '11.5px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.78)' };
  const kicker = (text: string) => (
    <p style={{ margin: 0, paddingRight: '40px', fontSize: '10.5px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9cc3ff' }}>{text}</p>
  );

  return (
    <div
      ref={ref}
      data-k360-invite-card
      role="complementary"
      aria-label={copy.kicker}
      className={fade}
      style={{
        ...glass,
        ...(narrow ? { left: '12px', right: '12px' } : { right: '16px', width: '350px' }),
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

      {view === 'card' && (
        <>
          {kicker(copy.kicker)}
          <p style={title}>{copy.title}</p>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.45, color: 'rgba(255, 255, 255, 0.8)' }}>{copy.sub}</p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '11px' }}>
            <button
              type="button"
              className="k360-tap"
              onClick={() => {
                trackSiteEvent('cta_click', 'tour_invite_book');
                setView('form');
              }}
              style={primary}
            >
              {copy.book}
            </button>
            <a
              href={`${copy.home}#cenovnik`}
              target="_top"
              className="k360-tap"
              onClick={() => trackSiteEvent('cta_click', 'tour_invite_prices')}
              style={outline}
            >
              {copy.prices}
            </a>
          </div>
        </>
      )}

      {view === 'form' && (
        <form onSubmit={sendForm} noValidate>
          {kicker(copy.formKicker)}
          <p style={{ ...title, margin: '5px 0 10px' }}>{copy.formTitle}</p>
          <label htmlFor="k360-invite-name" style={labelStyle}>{copy.nameLabel}</label>
          <input id="k360-invite-name" name="name" type="text" autoComplete="name" required maxLength={120} placeholder={copy.namePh} style={field} />
          <label htmlFor="k360-invite-contact" style={labelStyle}>{copy.contactLabel}</label>
          <input id="k360-invite-contact" name="contact" type="tel" inputMode="tel" autoComplete="tel" required maxLength={60} placeholder={copy.contactPh} style={field} />
          {formError && (
            <p role="alert" style={{ margin: '0 0 8px', fontSize: '12.5px', color: '#FCA5A5' }}>{formError}</p>
          )}
          <button type="submit" className="k360-tap" disabled={sending} style={{ ...primary, width: '100%', opacity: sending ? 0.7 : 1 }}>
            {sending ? copy.sending : copy.send}
          </button>
          <p style={{ margin: '8px 0 0', fontSize: '11px', lineHeight: 1.4, color: 'rgba(255, 255, 255, 0.72)' }}>{copy.fine}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '11px 0 9px', fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)' }}>
            <span style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.2)' }} />
            {copy.or}
            <span style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.2)' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a href={CONTACT_LINKS.viber} className="k360-tap" onClick={() => trackSiteEvent('contact_click', 'tour_invite_viber')} style={{ ...viber, flex: 1 }}>
              Viber
            </a>
            <a href={CONTACT_LINKS.phone} className="k360-tap" onClick={() => trackSiteEvent('contact_click', 'tour_invite_call')} style={{ ...outline, flex: 1 }}>
              {copy.call}
            </a>
          </div>
        </form>
      )}

      {view === 'sent' && sent && (
        <div role="status">
          <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center', width: '42px', height: '42px', margin: '2px 0 10px', borderRadius: '50%', background: '#16A34A', fontSize: '21px' }}>✓</span>
          <p style={{ ...title, margin: '0 0 4px' }}>{copy.thanks.replace('{name}', sent.name)}</p>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'rgba(255, 255, 255, 0.84)' }}>
            {copy.sentBefore}
            <b>{sent.contact}</b>
            {copy.sentAfter}
          </p>
          <a href={CONTACT_LINKS.viber} className="k360-tap" onClick={() => trackSiteEvent('contact_click', 'tour_invite_viber')} style={{ ...viber, width: '100%', marginTop: '12px', boxSizing: 'border-box' }}>
            {copy.viberUs}
          </a>
        </div>
      )}
    </div>
  );
}
