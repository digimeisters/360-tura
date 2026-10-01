'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';
import { trackSiteEvent } from '../app/lib/track';
import type { HomeLang } from '../app/lib/homeCopy';
import { SLOT_WINDOWS, upcomingShootDays, type ShootDay, type SlotWindow } from '../app/lib/shootSlot';
import { CONTACT_PACKAGES } from '../app/lib/pricing';

type Status = { kind: 'idle' | 'sending' | 'ok' | 'error'; text: string };

// Vrednosti opcija ostaju na srpskom na obe strane - tako stižu u bazu i na
// Telegram, pa vlasnik uvek čita isto. Menja se samo ono što posetilac vidi.
const PACKAGES: readonly string[] = CONTACT_PACKAGES;
const LISTING_TYPES = ['Prodaja', 'Izdavanje', 'Stan na dan'];

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
    more: string;
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
    contactPh: '+381 6x xxx xxxx ili ime@primer.com',
    pkg: 'Paket',
    packages: PACKAGES,
    agency: 'Naziv agencije',
    agencyPh: 'Opciono, ako se javljate u ime agencije',
    type: 'Tip oglasa',
    types: LISTING_TYPES,
    size: 'Kvadratura (m²)',
    sizePh: 'npr. 64',
    message: 'Poruka',
    messagePh: 'Adresa nekretnine, broj prostorija, jezici koji su vam potrebni...',
    more: 'Dodatni detalji',
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
    ok: 'Hvala! Upit je stigao — javljamo se za 24h radnim danima.',
    failed: 'Upit nije poslat. Pokušajte ponovo.',
    offline: 'Nema veze sa serverom. Proverite internet i pokušajte ponovo.'
  },
  en: {
    name: 'Full name',
    namePh: 'John Smith',
    contact: 'Phone or email',
    contactPh: '+381 6x xxx xxxx or name@example.com',
    pkg: 'Package',
    packages: [
      'Basic (SR + language of choice)',
      'Premium (all 4 languages)',
      'Tour only or photos only',
      'Larger volume (custom)'
    ],
    agency: 'Agency name',
    agencyPh: 'Optional, if you represent an agency',
    type: 'Listing type',
    types: ['Sale', 'Rent', 'Short-term stay'],
    size: 'Floor area (m²)',
    sizePh: 'e.g. 64',
    message: 'Message',
    messagePh: 'Property location, languages you need...',
    more: 'More details',
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

// Strana za agencije: umesto paketa, tipa oglasa, kvadrature i termina (to je
// upit za jedan stan) pita koliko nekretnina agencija oglašava mesečno - baš
// ono što piše iznad forme. Vrednost ide u postojeće polje "paket", pa baza i
// Telegram ne traže izmenu.
const AGENCY_VOLUMES = ['1–2', '3–4', '5–9', '10+'] as const;
// "1–2 nekretnine", ali "5–9 nekretnina" - broj se slaže sa gornjom granicom.
const agencyVolumeValue = (v: string) =>
  `Agencija · ${v} ${v === '1–2' || v === '3–4' ? 'nekretnine' : 'nekretnina'} mesečno`;

export default function ContactForm({
  lang = 'sr',
  // Paket koji je unapred izabran u formi (prvi = Osnovni).
  defaultPackage = PACKAGES[0],
  variant = 'default'
}: {
  lang?: HomeLang;
  defaultPackage?: string;
  /** 'agency' = kraća forma za /za-agencije (vidi AGENCY_VOLUMES). */
  variant?: 'default' | 'agency';
}) {
  const [status, setStatus] = useState<Status>({ kind: 'idle', text: '' });
  const t = TEXT[lang];

  // Dani se računaju tek u pregledaču: strana je statična i osvežava se na
  // sat, pa bi dani izračunati na serveru zastareli (i ne bi se poklopili sa
  // prvim renderom kod posetioca).
  const [days, setDays] = useState<ShootDay[]>([]);
  const [slotDate, setSlotDate] = useState<string | null>(null);
  const [slotWindow, setSlotWindow] = useState<SlotWindow | null>(null);
  useEffect(() => setDays(upcomingShootDays()), []);

  // Klik na "Izaberi Premium" u cenovniku (Pricing, data-package) spušta
  // posetioca do forme - ovde se u formi odmah bira isti paket, da ne piše
  // "Osnovni" ispod dugmeta za Premium.
  const packageRef = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const value = (e.target as Element | null)?.closest<HTMLElement>('[data-package]')?.dataset.package;
      const select = packageRef.current;
      if (value && select && PACKAGES.includes(value)) select.value = value;
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const pickedDay = days.find((d) => d.iso === slotDate) ?? null;

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

  const footer = (
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
  );

  if (variant === 'agency') {
    return (
      <form id="contact-form" className="card contact-form" onSubmit={handleSubmit}>
        <input type="hidden" name="from" value="agency" />
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
            <label htmlFor="f-agency">Naziv agencije</label>
            <input className="input" id="f-agency" name="agency" type="text" placeholder="npr. Nekretnine Centar" />
          </div>
          <div className="field">
            <label htmlFor="f-volume">Koliko nekretnina mesečno oglašavate?</label>
            <select className="input" id="f-volume" name="package" defaultValue={agencyVolumeValue(AGENCY_VOLUMES[1])}>
              {AGENCY_VOLUMES.map((v) => (
                <option key={v} value={agencyVolumeValue(v)}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="f-msg">
            {t.message} <small style={{ fontWeight: 400 }}>(opciono)</small>
          </label>
          <textarea className="input" id="f-msg" name="message" placeholder="Npr. imamo 3 nekretnine za izdavanje ovog meseca, zanima nas Premium…" />
        </div>
        {footer}
      </form>
    );
  }

  return (
    <form id="contact-form" className="card contact-form" onSubmit={handleSubmit}>
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

      <div className="field">
        <label htmlFor="f-package">{t.pkg}</label>
        <select ref={packageRef} className="input" id="f-package" name="package" defaultValue={defaultPackage}>
          {PACKAGES.map((value, i) => (
            <option key={value} value={value}>
              {t.packages[i]}
            </option>
          ))}
        </select>
      </div>

      {/* Sve ostalo je opciono, pa je sklopljeno: forma na prvi pogled traži
          samo ime, kontakt i paket. Polja ostaju u formi i kad je sklopljeno,
          pa se šalju ako ih je posetilac popunio pa zatvorio. */}
      <details className="form-more">
        <summary>
          {t.more} <small>({t.slotOptional})</small>
        </summary>
        <div className="form-more-body">
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
              <input className="input" id="f-size" name="size" type="text" inputMode="numeric" placeholder={t.sizePh} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="f-agency">{t.agency}</label>
            <input className="input" id="f-agency" name="agency" type="text" placeholder={t.agencyPh} />
          </div>

          <fieldset className="slot">
            <legend>{t.slotLegend}</legend>
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
        </div>
      </details>

      {footer}
    </form>
  );
}
