'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { PROJECT_TEXT, statusLabel, trackKey, type ProjectLang } from '../../app/lib/projectI18n';
import type { UnitStatus } from '../../app/lib/projects';
import { trackSiteEvent } from '../../app/lib/track';

/**
 * Upit za jedan stan: dugme „Raspitaj se" → ime, kontakt, poruka →
 * /api/contact (from: 'project'; ruta upisuje project_inquiries i javlja
 * Telegramom). Deli ga kartica stana u izboru (ProjectSelector) i strana
 * stana (/novogradnja/[slug]/stan/[oznaka]). Prodat stan nema upit.
 *
 * `trackView`: strana stana broji otvaranje (`pu:<slug>:<oznaka>`), kao
 * otvaranje stana u izboru - izveštaj po stanu ostaje isti.
 */

type FormState = { kind: 'idle' | 'sending' | 'ok' | 'error'; text: string };

export default function UnitInquiry({
  slug,
  projectTitle,
  unitId,
  code,
  status,
  where,
  embedded = false,
  lang = 'sr',
  trackView = false,
  open = false
}: {
  slug: string;
  projectTitle: string;
  unitId: string;
  code: string;
  status: UnitStatus;
  /** Lamela i sprat na srpskom, za Telegram („Lamela A · 3. sprat"). */
  where: string;
  embedded?: boolean;
  lang?: ProjectLang;
  trackView?: boolean;
  /** Forma otvorena odmah (strana stana), bez dugmeta. */
  open?: boolean;
}) {
  const t = PROJECT_TEXT[lang];
  const [asking, setAsking] = useState(open);
  const [form, setForm] = useState<FormState>({ kind: 'idle', text: '' });

  useEffect(() => {
    if (trackView) trackSiteEvent('cta_click', trackKey('pu', slug, code));
  }, [trackView, slug, code]);

  if (status === 'sold') return null;

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setForm({ kind: 'sending', text: t.sending });
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'project',
          embedded,
          unitId,
          name: fd.get('name'),
          contact: fd.get('contact'),
          agency: projectTitle,
          package: `Stan ${code} · ${where} · ${statusLabel(status, 'sr')}`,
          message: fd.get('message'),
          lang
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setForm({ kind: 'error', text: lang === 'sr' && json?.error ? json.error : t.failed });
        return;
      }
      trackSiteEvent('form_submit', trackKey('pq', slug, code));
      setForm({ kind: 'ok', text: t.sent });
    } catch {
      setForm({ kind: 'error', text: t.offline });
    }
  }

  return (
    <>
      {!asking && form.kind !== 'ok' && (
        <button type="button" className="inv-cta inv-ask" onClick={() => setAsking(true)}>
          {status === 'reserved' ? t.notifyMe : t.ask}
        </button>
      )}
      {asking && form.kind !== 'ok' && (
        <form className="inv-form" onSubmit={send}>
          <input name="name" type="text" required placeholder={t.name} aria-label={t.name} autoComplete="name" />
          <input name="contact" type="text" required placeholder={t.contact} aria-label={t.contact} autoComplete="tel" />
          <textarea name="message" aria-label={t.message} defaultValue={status === 'reserved' ? t.msgReserved(code) : t.msgDefault(code)} />
          <button type="submit" className="inv-cta" disabled={form.kind === 'sending'}>
            {form.kind === 'sending' ? t.sending : status === 'reserved' ? t.notifyMe : t.send}
          </button>
        </form>
      )}
      {form.text && (
        <p className={form.kind === 'error' ? 'inv-form-msg is-err' : 'inv-form-msg is-ok'} role="status">
          {form.text}
        </p>
      )}
    </>
  );
}
