'use client';

import { useState } from 'react';
import type { ProgressEntry } from '../../app/lib/projectData';
import { PROJECT_TEXT, type ProjectLang } from '../../app/lib/projectI18n';

/**
 * Gradilište po mesecima na strani projekta: mesec po mesec, jedna 360°
 * tura gradilišta (migracija 021, unos u adminu projekta). Najnoviji mesec
 * je izabran. Kupci koji su dali kaparu tako sami vide da radovi idu.
 */

export function monthLabel(month: string, lang: ProjectLang): string {
  const d = new Date(`${month.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return month;
  const text = d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'sr-Latn-RS', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

export default function ProjectProgress({ entries, lang = 'sr' }: { entries: ProgressEntry[]; lang?: ProjectLang }) {
  const t = PROJECT_TEXT[lang];
  const [selected, setSelected] = useState(entries[0]?.id ?? null);
  if (!entries.length) return null;
  const entry = entries.find((e) => e.id === selected) ?? entries[0];

  return (
    <section className="inv-progress-sec" id="gradiliste">
      <h2>{t.progressTitle}</h2>
      <div className="inv-months" role="group" aria-label={t.progress}>
        {entries.map((e) => (
          <button key={e.id} type="button" className="inv-chip" aria-pressed={e.id === entry.id} onClick={() => setSelected(e.id)}>
            {monthLabel(e.month, lang)}
          </button>
        ))}
      </div>
      <div className="inv-month-card">
        <a
          className="inv-mbtn"
          href={lang === 'en' ? `${entry.tourHref}?lang=en` : entry.tourHref ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          style={entry.preview ? { backgroundImage: `url(${entry.preview})` } : { background: 'linear-gradient(160deg,#9FBCE0,#5E83B3 60%,#C9A35A)' }}
          data-track="cta:project_progress_tour"
        >
          <em>360°</em>
          <span>{t.progressOpen}</span>
        </a>
        <div>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>{monthLabel(entry.month, lang)}</b>
          {entry.note && lang === 'sr' && <p>{entry.note}</p>}
        </div>
      </div>
    </section>
  );
}
