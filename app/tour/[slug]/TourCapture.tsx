'use client';

import { useState } from 'react';
import { THEME, FILL_ACCENT } from './theme';
import { IconMail, IconCheck } from './icons';

export type CaptureWhere = 'plan' | 'info' | 'exit';
export type CaptureStatus = 'idle' | 'sending' | 'sent' | 'error';

/**
 * "Pošaljite sebi link i tlocrt": niskog praga ponuda da posetilac ostavi
 * kontakt, bez obaveze zakazivanja (za razliku od "Zakaži razgledanje").
 * Pojavljuje se TAČNO JEDNOM po poseti turi, na prvo od tri mesta: ulazak
 * u Plan, ulazak u Info, ili pokušaj izlaska iz ture (vlasnik, 7. 10. 2026:
 * "jedno pojavljivanje dovoljno, ne da se pojavljuje svaki put"). Koje je
 * mesto prvo "potrošilo" ponudu beleži useTourCapture.ts (sessionStorage),
 * ovaj fajl je samo prikaz i slanje.
 */

const FRAME = '#9DBBE3';

// translations.ts tipizira `translations` kao Record<Language, Record<string,
// string>> (zatečene i18n ključeve), pa `t` koji stiže iz ture gubi tačne
// nazive polja - isti razlog zašto TourModals.tsx ima svoj lokalni alias
// "Labels" umesto strogog tipa. Ovde se pristupa istim poljima bez provere
// tipa u zamenu za to da se `t` iz ture može prosleđivati direktno.
export type CaptureLabels = Record<string, string>;

/** Validacija na klijentu - ista granica kao looksLikeEmail/telefon na serveru, samo da ne šaljemo prazno/besmisleno. */
function looksUsable(value: string): boolean {
  const v = value.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return true;
  return (v.match(/\d/g) ?? []).length >= 6;
}

/** Kartica unutar Plan/Info modala (dno sadržaja). */
export function TourCaptureCard({
  t,
  status,
  onSend,
  onDismiss
}: {
  t: CaptureLabels;
  status: CaptureStatus;
  onSend: (value: string) => void;
  onDismiss: () => void;
}) {
  const [value, setValue] = useState('');
  if (status === 'sent') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: THEME.success, fontSize: '13px', fontWeight: 700, padding: '10px 2px' }}>
        <IconCheck size={16} color={THEME.success} /> {t.captureSent}
      </div>
    );
  }
  const disabled = status === 'sending' || !looksUsable(value);
  return (
    <div
      style={{
        border: `1.5px solid ${FRAME}`,
        borderRadius: '16px',
        padding: '14px 14px 16px',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F1F6FD 100%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        position: 'relative'
      }}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t.captureSend === 'Pošalji' ? 'Zatvori' : 'Close'}
        style={{ position: 'absolute', top: '8px', right: '8px', width: '26px', height: '26px', borderRadius: '50%', border: 0, background: 'rgba(17,17,19,.06)', color: THEME.textMuted, fontSize: '15px', cursor: 'pointer', lineHeight: 1 }}
      >
        ×
      </button>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', paddingRight: '22px' }}>
        <span
          aria-hidden="true"
          style={{ width: '38px', height: '38px', borderRadius: '12px', ...FILL_ACCENT, display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0 }}
        >
          <IconMail size={18} />
        </span>
        <div>
          <p style={{ margin: 0, fontFamily: 'var(--font-urbanist), ' + THEME.fontDisplay, fontSize: '15.5px', color: THEME.textPrimary, fontWeight: 700 }}>{t.captureTitle}</p>
          <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: THEME.textSecondary, lineHeight: 1.4 }}>{t.captureSubtitle}</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t.capturePlaceholder}
          style={{ flex: 1, minWidth: 0, height: '42px', borderRadius: '11px', border: `1.5px solid ${THEME.border}`, padding: '0 12px', fontSize: '14px', fontFamily: 'inherit' }}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSend(value.trim())}
          style={{ height: '42px', padding: '0 16px', borderRadius: '11px', border: 0, color: '#fff', fontWeight: 700, fontSize: '13.5px', whiteSpace: 'nowrap', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1, ...FILL_ACCENT }}
        >
          {status === 'sending' ? '…' : t.captureSend}
        </button>
      </div>
      {status === 'error' && <p style={{ margin: 0, fontSize: '12px', color: THEME.danger }}>{t.captureError}</p>}
    </div>
  );
}

/** Polje ubačeno u dijalog "Da li želite da napustite turu?", iznad dugmadi Ostani/Napusti. */
export function TourCaptureExitField({
  t,
  exitSubtitle,
  status,
  onSend
}: {
  t: CaptureLabels;
  exitSubtitle: string;
  status: CaptureStatus;
  onSend: (value: string) => void;
}) {
  const [value, setValue] = useState('');
  if (status === 'sent') {
    return (
      <p style={{ margin: '0 0 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', color: THEME.success, fontSize: '13px', fontWeight: 700 }}>
        <IconCheck size={15} color={THEME.success} /> {t.captureSent}
      </p>
    );
  }
  const disabled = status === 'sending' || !looksUsable(value);
  return (
    <>
      <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: THEME.textSecondary, lineHeight: 1.4 }}>{exitSubtitle}</p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t.capturePlaceholder}
          style={{ flex: 1, minWidth: 0, height: '42px', borderRadius: '11px', border: `1.5px solid ${THEME.border}`, padding: '0 12px', fontSize: '13.5px', fontFamily: 'inherit' }}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSend(value.trim())}
          style={{ height: '42px', padding: '0 14px', borderRadius: '11px', border: 0, color: '#fff', fontWeight: 700, fontSize: '13px', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1, ...FILL_ACCENT }}
        >
          {status === 'sending' ? '…' : t.captureSend}
        </button>
      </div>
      {status === 'error' && <p style={{ margin: '-8px 0 14px', fontSize: '12px', color: THEME.danger }}>{t.captureError}</p>}
    </>
  );
}

const SLOT_PREFIX = 'k360-capture:';

/**
 * Da li je ponuda još slobodna za ovu posetu (sessionStorage, po turi).
 * Prvi poziv sa `claim: true` je uvek taj koji "pobeđuje" - sledeći na bilo
 * kom od tri mesta vraćaju false i ništa se ne prikazuje.
 */
function claimCaptureSlot(slug: string): boolean {
  try {
    const key = SLOT_PREFIX + slug;
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, '1');
    return true;
  } catch {
    // Privatni mod i sl. - bez pamćenja, ali ponuda sme da se prikaže.
    return true;
  }
}

/**
 * `active` = ovaj trenutak je kandidat za ponudu (npr. activeModal === 'plan',
 * ili dijalog za izlazak je otvoren). Hook sam vodi računa da se "osvoji"
 * najviše jednom po poseti; drugi i treći kandidat ostaju `false`.
 */
export function useTourCaptureOffer(slug: string | undefined, active: boolean): boolean {
  // Lenji inicijalizator pokriva slučaj kad je `active` već true pri PRVOM
  // renderu (npr. izlazni dijalog, ili Plan otvoren direktno).
  const [offer, setOffer] = useState(() => Boolean(active && slug && claimCaptureSlot(slug)));
  // Plan i Info dele JEDAN mount (TourModals ostaje podignut dok se modovi
  // menjaju preko donjeg menija - samo activeModal promeni vrednost), pa
  // osvajanje mora da se proveri svaki put kad `active` KASNIJE postane true,
  // ne samo pri prvom renderu. "Prilagođavanje stanja tokom rendera" umesto
  // efekta (react.dev: "Adjusting state based on a prop change") - prati se
  // prethodna vrednost `active` i poredi, bez setState unutar efekta.
  const [prevActive, setPrevActive] = useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    if (active && !offer && slug && claimCaptureSlot(slug)) setOffer(true);
  }
  return offer;
}

export function useTourCaptureSend(slug: string | undefined) {
  const [status, setStatus] = useState<CaptureStatus>('idle');
  const send = async (value: string, where: CaptureWhere, lang: string) => {
    if (!slug || !value) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/tour-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, contact: value, where, lang })
      });
      const json = await res.json().catch(() => null);
      setStatus(json?.success ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  };
  return { status, send };
}
