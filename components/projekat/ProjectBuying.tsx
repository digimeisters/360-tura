import { PROJECT_TEXT, type ProjectLang } from '../../app/lib/projectI18n';

/**
 * „Od izbora do ključeva" na strani projekta: 4 koraka kupovine i put do
 * kalkulatora kredita (spec 2026-10-25, odeljak 1.4).
 */
export default function ProjectBuying({ lang }: { lang: ProjectLang }) {
  const t = PROJECT_TEXT[lang];
  return (
    <div className="pb">
      <span className="eyebrow">{t.buyEyebrow}</span>
      <h2>
        {t.buyTitleStart} <em>{t.buyTitleEm}</em>
      </h2>
      <ol className="pb-steps">
        {t.buySteps.map(([title, text], i) => (
          <li key={title}>
            <span className="pb-n">{String(i + 1).padStart(2, '0')}</span>
            <b>{title}</b>
            <small>{text}</small>
          </li>
        ))}
      </ol>
      <p className="pb-calc">
        <span>
          <b>{t.calcQuestion}</b> {t.calcNote}
        </span>
        <a className="btn btn-secondary" href="/alati/kalkulator-kredita" data-track="cta:project_calc">
          {t.calcCta} →
        </a>
      </p>
    </div>
  );
}
