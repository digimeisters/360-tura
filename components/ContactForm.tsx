'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';
import { trackSiteEvent } from '../app/lib/track';
import type { HomeLang } from '../app/lib/homeCopy';
import { SLOT_WINDOWS, upcomingShootDays, type ShootDay, type SlotWindow } from '../app/lib/shootSlot';
import { CONTACT_PACKAGES } from '../app/lib/pricing';
import { ESTIMATE_EVENT, type EstimateDetail } from '../app/lib/estimateEvent';

type Status = { kind: 'idle' | 'sending' | 'ok' | 'error'; text: string };

// Vrednosti opcija ostaju na srpskom na obe strane - tako stižu u bazu i na
// Telegram, pa vlasnik uvek čita isto. Menja se samo ono što posetilac vidi.
const PACKAGES: readonly string[] = CONTACT_PACKAGES;
const LISTING_TYPES = ['Prodaja', 'Izdavanje', 'Kratkoročni smeštaj'];

const TEXT: Record<
  HomeLang,
  {
    name: string;
    namePh: string;
    contact: string;
    contactPh: string;
    pkg: string;
    packages: readonly string[];
    agency: string;
    agencyPh: string;
    type: string;
    types: string[];
    size: string;
    sizePh: string;
    message: string;
    messagePh: string;
    slotLegend: string;
    slotOptional: string;
    dayShort: string[];
    windowNames: Record<SlotWindow, string>;
    windowLabel: string;
    slotNone: string;
    slotConfirm: string;
    slotPicked: (day: ShootDay, window: SlotWindow | null) => string;
    submit: string;
    sending: string;
    sendingStatus: string;
    ok: string;
    failed: string;
    offline: string;
  }
> = {
  sr: {
    name: 'Ime i prezime',
    namePh: 'Marko Marković',
    contact: 'Telefon ili e-mail',
    contactPh: '+381 6x xxx xxxx',
    pkg: 'Paket',
    packages: PACKAGES,
    agency: 'Naziv agencije',
    agencyPh: 'Opciono, ako prijavljujete agenciju',
    type: 'Tip oglasa',
    types: LISTING_TYPES,
    size: 'Kvadratura (m²)',
    sizePh: 'npr. 64',
    message: 'Poruka',
    messagePh: 'Lokacija nekretnine, jezici koji su vam potrebni...',
    slotLegend: 'Željeni termin snimanja',
    slotOptional: 'opciono',
    dayShort: ['Ned', 'Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub'],
    windowLabel: 'Deo dana',
    windowNames: { '08-11': 'prepodne', '11-14': 'oko podne', '14-17': 'popodne', '17-20': 'predveče' },
    slotNone: 'Termin nije izabran — dogovaramo ga pozivom.',
    slotConfirm: 'termin potvrđujemo pozivom.',
    slotPicked: (day, window) => {
      const names = ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'];
      const months = ['januara', 'februara', 'marta', 'aprila', 'maja', 'juna', 'jula', 'avgusta', 'septembra', 'oktobra', 'novembra', 'decembra'];
      const when = window ? `${window.replace('-', '–')}h` : 'bilo kad tog dana';
      return `${names[day.weekday]}, ${day.day}. ${months[day.month - 1]} · ${when}`;
    },
    submit: 'Pošaljite upit',
    sending: 'Šaljemo...',
    sendingStatus: 'Šaljemo upit...',
    ok: 'Hvala! Upit je primljen — javljamo se u najkraćem roku.',
    failed: 'Upit nije poslat. Pokušajte ponovo.',
    offline: 'Nema veze sa serverom. Proverite internet i pokušajte ponovo.'
  },
  en: {
    name: 'Full name',
    namePh: 'John Smith',
    contact: 'Phone or email',
    contactPh: '+381 6x xxx xxxx or name@example.com',
    pkg: 'Package',
    packages: ['Single tour', 'Agency — 3 tours a month', 'Agency — 5 tours a month', 'Larger volume (custom)'],
    agency: 'Agency name',
    agencyPh: 'Optional, if you represent an agency',
    type: 'Listing type',
    types: ['Sale', 'Rent', 'Short-term stay'],
    size: 'Floor area (m²)',
    sizePh: 'e.g. 64',
    message: 'Message',
    messagePh: 'Property location, languages you need...',
    slotLegend: 'Preferred shooting date',
    slotOptional: 'optional',
    dayShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    windowLabel: 'Time of day',
    windowNames: { '08-11': 'morning', '11-14': 'midday', '14-17': 'afternoon', '17-20': 'evening' },
    slotNone: 'No date chosen — we’ll arrange one by phone.',
    slotConfirm: 'we’ll confirm it by phone.',
    slotPicked: (day, window) => {
      const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const when = window ? window.replace('-', '–') : 'any time that day';
      return `${names[day.weekday]}, ${day.day} ${months[day.month - 1]} · ${when}`;
    },
    submit: 'Send request',
    sending: 'Sending...',
    sendingStatus: 'Sending your request...',
    ok: 'Thank you! Your request has been received — we’ll get back to you shortly.',
    failed: 'The request wasn’t sent. Please try again or give us a call.',
    offline: 'No connection to the server. Check your internet and try again.'
  }
};

export default function ContactForm({ lang = 'sr' }: { lang?: HomeLang }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle', text: '' });
  const t = TEXT[lang];

  // Dani se računaju tek u pregledaču: strana je statična i osvežava se na
  // sat, pa bi dani izračunati na serveru zastareli (i ne bi se poklopili sa
  // prvim renderom kod posetioca).
  const [days, setDays] = useState<ShootDay[]>([]);
  const [slotDate, setSlotDate] = useState<string | null>(null);
  const [slotWindow, setSlotWindow] = useState<SlotWindow | null>(null);
  useEffect(() => setDays(upcomingShootDays()), []);

  const pickedDay = days.find((d) => d.iso === slotDate) ?? null;

  // "Pošalji upit sa ovim" iz kalkulatora: izabere paket i stavi procenu u
  // prvi red poruke. Ponovni klik zameni taj red, ne dodaje novi.
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const onEstimate = (e: Event) => {
      const form = formRef.current;
      if (!form) return;
      const { packageValue, message, prefix } = (e as CustomEvent<EstimateDetail>).detail;

      const pkg = form.elements.namedItem('package') as HTMLSelectElement | null;
      if (pkg && PACKAGES.includes(packageValue)) pkg.value = packageValue;

      const msg = form.elements.namedItem('message') as HTMLTextAreaElement | null;
      if (msg) {
        const rest = msg.value.startsWith(prefix) ? msg.value.split('\n').slice(1).join('\n').trim() : msg.value.trim();
        msg.value = rest ? `${message}\n\n${rest}` : message;
      }

      // Posle klizanja do forme, kursor u prvo polje.
      window.setTimeout(() => {
        (form.elements.namedItem('name') as HTMLInputElement | null)?.focus({ preventScroll: true });
      }, 450);
    };
    window.addEventListener(ESTIMATE_EVENT, onEstimate);
    return () => window.removeEventListener(ESTIMATE_EVENT, onEstimate);
  }, []);

  const toggleDay = (iso: string) => {
    if (slotDate === iso) {
      setSlotDate(null);
      setSlotWindow(null);
    } else {
      setSlotDate(iso);
    }
  };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = {
      ...Object.fromEntries(new FormData(form).entries()),
      lang,
      slotDate,
      slotWindow: slotDate ? slotWindow : null
    };

    setStatus({ kind: 'sending', text: t.sendingStatus });

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        // Poruke servera su na srpskom; na engleskoj strani ide opšta poruka.
        setStatus({ kind: 'error', text: lang === 'sr' ? json.error || t.failed : t.failed });
        return;
      }

      form.reset();
      setSlotDate(null);
      setSlotWindow(null);
      trackSiteEvent('form_submit', 'contact_form');
      setStatus({ kind: 'ok', text: t.ok });
    } catch {
      setStatus({ kind: 'error', text: t.offline });
    }
  }

  const isSending = status.kind === 'sending';

  return (
    <form id="contact-form" className="card contact-form" onSubmit={handleSubmit} ref={formRef}>
      <div className="row2">
        <div className="field">
          <label htmlFor="f-name">{t.name}</label>
          <input className="input" id="f-name" name="name" type="text" required placeholder={t.namePh} />
        </div>
        <div className="field">
          <label htmlFor="f-contact">{t.contact}</label>
          <input className="input" id="f-contact" name="contact" type="text" required placeholder={t.contactPh} />
        </div>
      </div>

      <div className="row2">
        <div className="field">
          <label htmlFor="f-package">{t.pkg}</label>
          <select className="input" id="f-package" name="package" defaultValue={PACKAGES[0]}>
            {PACKAGES.map((value, i) => (
              <option key={value} value={value}>
                {t.packages[i]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-agency">{t.agency}</label>
          <input className="input" id="f-agency" name="agency" type="text" placeholder={t.agencyPh} />
        </div>
      </div>

      <div className="row2">
        <div className="field">
          <label htmlFor="f-type">{t.type}</label>
          <select className="input" id="f-type" name="type" defaultValue={LISTING_TYPES[0]}>
            {LISTING_TYPES.map((value, i) => (
              <option key={value} value={value}>
                {t.types[i]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-size">{t.size}</label>
          <input className="input" id="f-size" name="size" type="text" placeholder={t.sizePh} />
        </div>
      </div>

      <fieldset className="slot">
        <legend>
          {t.slotLegend} <small>({t.slotOptional})</small>
        </legend>
        <div className="days" role="group" aria-label={t.slotLegend}>
          {days.map((day) => (
            <button
              key={day.iso}
              type="button"
              className="day"
              aria-pressed={slotDate === day.iso}
              onClick={() => toggleDay(day.iso)}
            >
              <small>{t.dayShort[day.weekday]}</small>
              <b>{day.day}.{day.month}.</b>
            </button>
          ))}
        </div>
        <div className="windows" role="group" aria-label={t.windowLabel}>
          {SLOT_WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              className="win"
              aria-pressed={slotWindow === w}
              disabled={!slotDate}
              onClick={() => setSlotWindow(slotWindow === w ? null : w)}
            >
              <b>{w.replace('-', '–')}</b>
              <small>{t.windowNames[w]}</small>
            </button>
          ))}
        </div>
        <p className="slot-summary" aria-live="polite">
          {pickedDay ? (
            <>
              <strong>{t.slotPicked(pickedDay, slotWindow)}</strong> — {t.slotConfirm}
            </>
          ) : (
            t.slotNone
          )}
        </p>
      </fieldset>

      <div className="field">
        <label htmlFor="f-msg">{t.message}</label>
        <textarea className="input" id="f-msg" name="message" placeholder={t.messagePh} />
      </div>

      <div className="form-foot">
        <button className="btn btn-primary" type="submit" disabled={isSending}>
          {isSending ? t.sending : t.submit}
        </button>

        {/* Ista poruka kao čip, u boji koja kaže da li je uspelo. Prazan
            element ostaje u DOM-u da bi čitač ekrana najavio promenu. */}
        <p
          role="status"
          aria-live="polite"
          className={status.text ? `toast toast-${status.kind === 'error' ? 'error' : 'ok'}` : undefined}
        >
          {status.kind === 'ok' ? '✓ ' : ''}
          {status.text}
        </p>
      </div>
    </form>
  );
}
