'use client';

import { useState, FormEvent } from 'react';

type Status = { kind: 'idle' | 'sending' | 'ok' | 'error'; text: string };

export default function ContactForm() {
  const [status, setStatus] = useState<Status>({ kind: 'idle', text: '' });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    setStatus({ kind: 'sending', text: 'Šaljemo upit...' });

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setStatus({ kind: 'error', text: json.error || 'Upit nije poslat. Pokušajte ponovo.' });
        return;
      }

      form.reset();
      setStatus({ kind: 'ok', text: 'Hvala! Upit je primljen — javljamo se u najkraćem roku.' });
    } catch {
      setStatus({ kind: 'error', text: 'Nema veze sa serverom. Proverite internet i pokušajte ponovo.' });
    }
  }

  const isSending = status.kind === 'sending';

  return (
    <form id="contact-form" onSubmit={handleSubmit}>
      <div className="row2">
        <div className="field">
          <label htmlFor="f-name">Ime i prezime</label>
          <input id="f-name" name="name" type="text" required placeholder="Marko Marković" />
        </div>
        <div className="field">
          <label htmlFor="f-contact">Telefon ili e-mail</label>
          <input id="f-contact" name="contact" type="text" required placeholder="+381 6x xxx xxxx" />
        </div>
      </div>

      <div className="row2">
        <div className="field">
          <label htmlFor="f-package">Paket</label>
          <select id="f-package" name="package" defaultValue="Pojedinačna tura">
            <option>Pojedinačna tura</option>
            <option>Agencija — 3 ture mesečno</option>
            <option>Agencija — 5 tura mesečno</option>
            <option>Veći obim (dogovor)</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-agency">Naziv agencije</label>
          <input id="f-agency" name="agency" type="text" placeholder="Opciono, ako prijavljujete agenciju" />
        </div>
      </div>

      <div className="row2">
        <div className="field">
          <label htmlFor="f-type">Tip oglasa</label>
          <select id="f-type" name="type" defaultValue="Prodaja">
            <option>Prodaja</option>
            <option>Izdavanje</option>
            <option>Kratkoročni smeštaj</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-size">Kvadratura (m²)</label>
          <input id="f-size" name="size" type="text" placeholder="npr. 64" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="f-msg">Poruka</label>
        <textarea
          id="f-msg"
          name="message"
          placeholder="Lokacija nekretnine, željeni termin snimanja, jezici koji su vam potrebni..."
        />
      </div>

      <div>
        <button className="btn btn-primary" type="submit" disabled={isSending}>
          {isSending ? 'Šaljemo...' : 'Pošaljite upit'}
        </button>
      </div>

      <p
        className="form-note"
        role="status"
        aria-live="polite"
        style={{ color: status.kind === 'error' ? '#dc2626' : 'var(--accent)' }}
      >
        {status.text}
      </p>
    </form>
  );
}
