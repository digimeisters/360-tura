'use client';

import { useState, type FormEvent } from 'react';
import { PROJECT_TEXT, trackKey, type ProjectLang } from '../../app/lib/projectI18n';
import { trackSiteEvent } from '../../app/lib/track';

/**
 * „Pitajte investitora" na dnu strane projekta (spec 2026-10-25, odeljak 1.4):
 * upit bez obaveznog izbora stana. Bez stana ide kao opšti upit za projekat
 * (/api/contact, projectSlug), sa izabranim stanom isto kao upit iz kartice
 * stana (unitId) - oba stižu prodaji investitora.
 */

type State = { kind: 'idle' | 'sending' | 'sent' | 'error'; text?: string };

export default function ProjectContact({
  lang,
  slug,
  projectTitle,
  phone,
  email,
  units,
  embedded = false
}: {
  lang: ProjectLang;
  slug: string;
  projectTitle: string;
  phone: string | null;
  email: string | null;
  /** Slobodni stanovi za opcioni izbor: natpis na jeziku strane, a srLabel ide prodaji (uvek srpski). */
  units: { id: string; code: string; label: string; srLabel: string }[];
  embedded?: boolean;
}) {
  const t = PROJECT_TEXT[lang];
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const unitId = String(fd.get('unit') || '');
    const unit = units.find((u) => u.id === unitId);
    setState({ kind: 'sending' });
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'project',
          embedded,
          ...(unit ? { unitId: unit.id } : { projectSlug: slug }),
          name: fd.get('name'),
          contact: fd.get('contact'),
          agency: projectTitle,
          package: unit ? unit.srLabel : PROJECT_TEXT.sr.contactUnitNone,
          message: fd.get('message'),
          lang
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setState({ kind: 'error', text: lang === 'sr' && json?.error ? json.error : t.contactFailed });
        return;
      }
      trackSiteEvent('form_submit', trackKey('pq', slug, unit ? unit.code : 'opsti'));
      setState({ kind: 'sent' });
    } catch {
      setState({ kind: 'error', text: t.contactFailed });
    }
  }

  const tel = phone ? phone.replace(/[^\d+]/g, '') : null;

  return (
    <div className="pc">
      <div className="pc-text">
        <span className="eyebrow">{t.contactEyebrow}</span>
        <h2>
          {t.contactTitleStart} <em>{t.contactTitleEm}</em>
        </h2>
        <p>{t.contactNote}</p>
        {(tel || email) && (
          <p className="pc-direct">
            {tel && <a href={`tel:${tel}`}>{phone}</a>}
            {email && <a href={`mailto:${email}`}>{email}</a>}
          </p>
        )}
      </div>
      {state.kind === 'sent' ? (
        <p className="pc-sent" role="status">
          {t.contactSent}
        </p>
      ) : (
        <form className="pc-form" onSubmit={send}>
          <div className="pc-row">
            <label>
              <span>{t.contactName}</span>
              <input name="name" required maxLength={120} autoComplete="name" />
            </label>
            <label>
              <span>{t.contactReach}</span>
              <input name="contact" required maxLength={160} autoComplete="tel" />
            </label>
          </div>
          {units.length > 0 && (
            <label>
              <span>{t.contactUnit}</span>
              <select name="unit" defaultValue="">
                <option value="">{t.contactUnitNone}</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span>{t.contactMessage}</span>
            <textarea name="message" rows={3} maxLength={1500} />
          </label>
          {state.kind === 'error' && (
            <p className="pc-error" role="alert">
              {state.text}
            </p>
          )}
          <button type="submit" className="btn btn-primary pc-send" disabled={state.kind === 'sending'}>
            {state.kind === 'sending' ? t.contactSending : t.contactSend}
          </button>
        </form>
      )}
    </div>
  );
}
