'use client';

import { useMemo, useState } from 'react';
import { THEME } from './theme';
import { SLOT_WINDOWS, upcomingShootDays, type SlotWindow } from '../../lib/shootSlot';
import type { Language } from './types';

/**
 * "Zakaži razgledanje" iz ture: ime, telefon i željeni termin (dan + deo
 * dana), opciono poruka. Šalje se na /api/viewing-request, koji upisuje
 * zahtev i javlja vlasniku na Telegram. Termin je želja, ne rezervacija -
 * agent zove da ga potvrdi, pa nema kalendara u pozadini.
 *
 * Tekst forme stoji ovde, na sva četiri jezika ture, jer ga koristi samo
 * ova forma i dugme koje je otvara (VIEWING_TEXT.cta u TourModals).
 */

type ViewingText = {
  cta: string;
  ctaHint: string;
  title: string;
  name: string;
  phone: string;
  day: string;
  window: string;
  anyTime: string;
  message: string;
  messagePlaceholder: string;
  submit: string;
  sending: string;
  close: string;
  doneTitle: string;
  doneText: string;
  errorInvalid: string;
  errorGeneric: string;
  errorLimit: string;
  weekdays: string[];
};

export const VIEWING_TEXT: Record<Language, ViewingText> = {
  sr: {
    cta: 'Zakaži razgledanje',
    ctaHint: 'Izaberite dan — agent vas zove da potvrdi termin.',
    title: 'Zakaži razgledanje',
    name: 'Ime i prezime',
    phone: 'Telefon',
    day: 'Dan',
    window: 'Deo dana',
    anyTime: 'Bilo kad',
    message: 'Poruka (opciono)',
    messagePlaceholder: 'npr. Dolazimo nas dvoje, zanima nas i parking.',
    submit: 'Pošalji zahtev',
    sending: 'Šaljem...',
    close: 'Zatvori',
    doneTitle: 'Zahtev je poslat',
    doneText: 'Agent će vas pozvati da potvrdi termin razgledanja.',
    errorInvalid: 'Upišite ime i broj telefona.',
    errorGeneric: 'Zahtev nije poslat. Pokušajte ponovo ili pozovite agenta.',
    errorLimit: 'Previše zahteva u kratkom roku. Pokušajte za nekoliko minuta.',
    weekdays: ['NED', 'PON', 'UTO', 'SRE', 'ČET', 'PET', 'SUB']
  },
  en: {
    cta: 'Book a viewing',
    ctaHint: 'Pick a day — the agent will call you to confirm.',
    title: 'Book a viewing',
    name: 'Full name',
    phone: 'Phone',
    day: 'Day',
    window: 'Time of day',
    anyTime: 'Any time',
    message: 'Message (optional)',
    messagePlaceholder: 'e.g. Two of us are coming, we would also like to ask about parking.',
    submit: 'Send request',
    sending: 'Sending...',
    close: 'Close',
    doneTitle: 'Request sent',
    doneText: 'The agent will call you to confirm the viewing time.',
    errorInvalid: 'Please enter your name and phone number.',
    errorGeneric: 'The request was not sent. Please try again or call the agent.',
    errorLimit: 'Too many requests in a short time. Please try again in a few minutes.',
    weekdays: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  },
  de: {
    cta: 'Besichtigung vereinbaren',
    ctaHint: 'Wählen Sie einen Tag — der Makler ruft Sie zur Bestätigung an.',
    title: 'Besichtigung vereinbaren',
    name: 'Vor- und Nachname',
    phone: 'Telefon',
    day: 'Tag',
    window: 'Tageszeit',
    anyTime: 'Jederzeit',
    message: 'Nachricht (optional)',
    messagePlaceholder: 'z. B. Wir kommen zu zweit und haben eine Frage zum Parken.',
    submit: 'Anfrage senden',
    sending: 'Wird gesendet...',
    close: 'Schließen',
    doneTitle: 'Anfrage gesendet',
    doneText: 'Der Makler ruft Sie an, um den Besichtigungstermin zu bestätigen.',
    errorInvalid: 'Bitte Namen und Telefonnummer angeben.',
    errorGeneric: 'Die Anfrage wurde nicht gesendet. Bitte erneut versuchen oder den Makler anrufen.',
    errorLimit: 'Zu viele Anfragen in kurzer Zeit. Bitte in ein paar Minuten erneut versuchen.',
    weekdays: ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA']
  },
  ru: {
    cta: 'Записаться на просмотр',
    ctaHint: 'Выберите день — агент перезвонит, чтобы подтвердить время.',
    title: 'Записаться на просмотр',
    name: 'Имя и фамилия',
    phone: 'Телефон',
    day: 'День',
    window: 'Время дня',
    anyTime: 'Любое время',
    message: 'Сообщение (необязательно)',
    messagePlaceholder: 'напр. Придём вдвоём, интересует также парковка.',
    submit: 'Отправить заявку',
    sending: 'Отправка...',
    close: 'Закрыть',
    doneTitle: 'Заявка отправлена',
    doneText: 'Агент позвонит вам, чтобы подтвердить время просмотра.',
    errorInvalid: 'Укажите имя и номер телефона.',
    errorGeneric: 'Заявка не отправлена. Попробуйте ещё раз или позвоните агенту.',
    errorLimit: 'Слишком много заявок за короткое время. Попробуйте через несколько минут.',
    weekdays: ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ']
  }
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 12px',
  fontSize: '16px', // 16px: iPhone inače zumira stranu pri kucanju
  border: '1px solid ' + THEME.borderStrong,
  borderRadius: '10px',
  background: THEME.surface,
  color: THEME.textPrimary,
  fontFamily: THEME.fontBody
};

const labelStyle: React.CSSProperties = { fontSize: '12.5px', fontWeight: 600, color: THEME.textSecondary, margin: '0 0 6px' };

function chipStyle(selected: boolean): React.CSSProperties {
  return {
    padding: '7px 9px',
    borderRadius: '9px',
    border: '1px solid ' + (selected ? THEME.accent : THEME.borderStrong),
    background: selected ? THEME.accent : THEME.surface,
    color: selected ? '#fff' : THEME.textPrimary,
    fontSize: '12.5px',
    fontWeight: 600,
    lineHeight: 1.25,
    cursor: 'pointer',
    textAlign: 'center',
    flexShrink: 0
  };
}

export function ViewingRequestModal({
  slug,
  tourTitle,
  lang,
  onClose,
  onSent
}: {
  slug: string;
  tourTitle: string;
  lang: Language;
  onClose: () => void;
  /** Posle uspešnog slanja - za merenje (kontakt iz ture). */
  onSent?: () => void;
}) {
  const t = VIEWING_TEXT[lang] ?? VIEWING_TEXT.sr;
  const days = useMemo(() => upcomingShootDays(), []);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [day, setDay] = useState<string | null>(null);
  const [slotWindow, setSlotWindow] = useState<SlotWindow | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || (phone.match(/\d/g) ?? []).length < 6) {
      setError(t.errorInvalid);
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/viewing-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name, phone, slotDate: day, slotWindow, message, lang })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setError(res.status === 429 ? t.errorLimit : res.status === 400 ? t.errorInvalid : t.errorGeneric);
        return;
      }
      setDone(true);
      onSent?.();
    } catch {
      setError(t.errorGeneric);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="tour-ui-scale"
      style={{ position: 'absolute', inset: 0, zIndex: 85, backgroundColor: THEME.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="viewing-title"
        style={{ backgroundColor: THEME.surface, border: '1px solid ' + THEME.border, borderRadius: '20px', width: '100%', maxWidth: '460px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: THEME.shadowLg, fontFamily: THEME.fontBody }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', padding: '16px 20px', borderBottom: '1px solid ' + THEME.border }}>
          <div style={{ minWidth: 0 }}>
            <h2 id="viewing-title" style={{ margin: 0, fontSize: '19px', fontWeight: 700, color: THEME.textPrimary }}>
              {done ? t.doneTitle : t.title}
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: THEME.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tourTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            title={t.close}
            aria-label={t.close}
            style={{ background: 'transparent', border: 'none', color: THEME.textMuted, fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', padding: '0 4px', lineHeight: 1, flexShrink: 0 }}
          >
            ×
          </button>
        </div>

        {done ? (
          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', textAlign: 'center' }}>
            <div aria-hidden="true" style={{ width: '48px', height: '48px', borderRadius: '50%', background: THEME.accentSoft, color: THEME.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700 }}>
              ✓
            </div>
            <p style={{ margin: 0, fontSize: '15px', color: THEME.textPrimary, lineHeight: 1.5 }}>{t.doneText}</p>
            <button onClick={onClose} style={{ padding: '11px 28px', borderRadius: '999px', border: 'none', background: THEME.accent, color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
              {t.close}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ padding: '16px 20px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <p style={labelStyle}>{t.name}</p>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} style={inputStyle} aria-label={t.name} />
            </div>
            <div>
              <p style={labelStyle}>{t.phone}</p>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" maxLength={60} style={inputStyle} aria-label={t.phone} />
            </div>

            <div>
              <p style={labelStyle}>{t.day}</p>
              {/* Vodoravni niz - na telefonu se prelistava prstom, ne lomi formu. */}
              <div role="group" aria-label={t.day} style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {days.map((d) => (
                  <button key={d.iso} type="button" aria-pressed={day === d.iso} onClick={() => setDay(day === d.iso ? null : d.iso)} style={chipStyle(day === d.iso)}>
                    {t.weekdays[d.weekday]}
                    <br />
                    {d.day}.{d.month}.
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p style={labelStyle}>{t.window}</p>
              <div role="group" aria-label={t.window} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button type="button" aria-pressed={slotWindow === null} onClick={() => setSlotWindow(null)} style={chipStyle(slotWindow === null)}>
                  {t.anyTime}
                </button>
                {SLOT_WINDOWS.map((w) => (
                  <button key={w} type="button" aria-pressed={slotWindow === w} onClick={() => setSlotWindow(w)} style={chipStyle(slotWindow === w)}>
                    {w.replace('-', '–')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p style={labelStyle}>{t.message}</p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder={t.messagePlaceholder}
                style={{ ...inputStyle, resize: 'vertical' }}
                aria-label={t.message}
              />
            </div>

            {error && (
              <p role="alert" style={{ margin: 0, color: THEME.danger, fontSize: '13.5px' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              style={{ padding: '13px', borderRadius: '999px', border: 'none', background: THEME.accent, color: '#fff', fontSize: '15px', fontWeight: 700, cursor: sending ? 'default' : 'pointer', opacity: sending ? 0.7 : 1 }}
            >
              {sending ? t.sending : t.submit}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
