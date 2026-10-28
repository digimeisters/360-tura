import Link from 'next/link';
import { SiteNav, SiteFooter } from '../SiteChrome';
import SiteTracker from '../SiteTracker';
import { PROJECT_TEXT, type ProjectLang } from '../../app/lib/projectI18n';
import type { ProjectPageData } from '../../app/lib/projectData';
import type { SelectorFloor, SelectorUnit } from './ProjectSelector';
import SiteStylesheets from '../SiteStylesheets';
import UnitScreen from './UnitScreen';
import HtmlLang from '../HtmlLang';

/**
 * Strana jednog stana: /novogradnja/[slug]/stan/[oznaka] (+ /en), po uzoru
 * na 3d.sokolis.rs - velike kartice Osnova / 360° tura / 3D osnova / Slike
 * levo, cena, podaci, prostorije, upit, PDF i plan plaćanja desno, ispod
 * slični slobodni stanovi. Prodaja šalje ovaj link kupcu umesto PDF-a.
 *
 * Stan bez svoje osnove, a iscrtan na osnovi sprata, dobija isečak osnove
 * sprata (UnitPlanCrop preko UnitMedia `fallbackPlan`).
 */

const PAGE_STYLES = `
  .up{padding-block:clamp(1.2rem,3vw,2.2rem) clamp(3rem,6vw,5rem);}
`;

export default function UnitPage({
  data,
  unit,
  floor,
  lang = 'sr'
}: {
  data: ProjectPageData;
  unit: SelectorUnit;
  floor: SelectorFloor | null;
  lang?: ProjectLang;
}) {
  const t = PROJECT_TEXT[lang];
  const { project, units, floors, buildings } = data;
  const prefix = lang === 'en' ? '/en' : '';
  const base = `${prefix}/novogradnja/${project.slug}`;
  const title = (lang === 'en' && project.title_en?.trim()) || project.title;

  return (
    <div lang={lang} style={{ display: 'contents' }}>
      {lang === 'en' && <HtmlLang lang="en" />}
      <SiteStylesheets selector />
      <style dangerouslySetInnerHTML={{ __html: PAGE_STYLES }} />
      <SiteTracker />
      {/* Logo investitora (migracija 034) vodi na stranu projekta. */}
      <SiteNav
        brandHref={project.logo_url ? base : lang === 'en' ? '/en' : '/'}
        brandAria={project.logo_url ? project.developer_name || title : 'Kvadrat360'}
        brandLogo={project.logo_url ? { src: project.logo_url, alt: project.developer_name || title, dark: project.logo_dark } : null}
        cta={{ href: `${base}#izbor`, label: t.allUnits, track: 'cta:unit_nav' }}>
        <li className="nav-lang">
          {lang === 'en' ? (
            <Link href={`/novogradnja/${project.slug}/stan/${encodeURIComponent(unit.code)}`}>SR</Link>
          ) : (
            <Link href={`/en/novogradnja/${project.slug}/stan/${encodeURIComponent(unit.code)}`}>EN</Link>
          )}
        </li>
      </SiteNav>

      <main className="up">
        <div className="wrap">
          <UnitScreen
            mode="page"
            lang={lang}
            unit={unit}
            floor={floor}
            data={{ units, floors, buildings, demoMedia: data.demoMedia, project: { slug: project.slug, title, srTitle: project.title, city: project.city } }}
          />
        </div>
      </main>

      <SiteFooter note={`${title} · ${t.credit}`} lang={lang} />
    </div>
  );
}
