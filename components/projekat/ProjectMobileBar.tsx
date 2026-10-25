import { PROJECT_TEXT, type ProjectLang } from '../../app/lib/projectI18n';

/**
 * Traka na dnu ekrana telefona na strani projekta: lista stanova i upit
 * investitoru, na svakom delu strane (spec 2026-10-25, odeljak 1.5). Na
 * računaru se ne prikazuje, a sklanja se dok je otvoren prozor preko strane
 * (filteri, ceo ekran) - CSS u ProjectView (.pmb).
 */
export default function ProjectMobileBar({ lang, listCount }: { lang: ProjectLang; listCount: number }) {
  const t = PROJECT_TEXT[lang];
  return (
    <div className="pmb" role="navigation" aria-label={t.askInvestor}>
      {listCount > 0 && (
        <a className="btn btn-secondary" href="#lista" data-track="cta:project_bar_list">
          ☰ {t.listCount(listCount)}
        </a>
      )}
      <a className="btn btn-primary" href="#kontakt" data-track="cta:project_bar_ask">
        {t.askInvestor}
      </a>
    </div>
  );
}
