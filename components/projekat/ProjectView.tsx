import Link from 'next/link';
import { SiteNav, SiteFooter } from '../SiteChrome';
import SiteTracker from '../SiteTracker';
import ProjectSelector from './ProjectSelector';
import ProjectProgress from './ProjectProgress';
import EmbedAutoHeight from './EmbedAutoHeight';
import { SITE_STYLES } from '../../app/lib/siteStyles';
import { SITE_URL } from '../../app/lib/site';
import { SELECTOR_STYLES } from './selectorStyles';
import { PROJECT_TEXT, type ProjectLang } from '../../app/lib/projectI18n';
import type { ProjectPageData } from '../../app/lib/projectData';

/**
 * Cela strana projekta novogradnje. Deli je javna adresa
 * (/novogradnja/[slug], engleski /en/novogradnja/[slug]) i pregled pre
 * objave (/novogradnja/[slug]/pregled), da pregled izgleda tačno kao ono
 * što će posetilac videti. Ugradnja (ProjectEmbed ispod) koristi samo
 * izbor stana i gradilište.
 */

const PAGE_STYLES = `
  .proj-head{padding-block:clamp(1.6rem,4vw,3rem) clamp(1rem,2vw,1.6rem);}
  .proj-head h1{font-size:clamp(2rem,4.4vw,3.4rem); line-height:1.05; letter-spacing:-.03em; margin-top:.8rem;}
  .proj-head .lede{margin-top:.9rem; max-width:60ch; color:var(--ink-soft); font-size:1.05rem; line-height:1.6;}
  .proj-facts{display:flex; flex-wrap:wrap; gap:.5rem; margin-top:1.1rem;}
  .proj-body{padding-bottom:clamp(3rem,6vw,5rem);}
  .proj-contact{display:flex; flex-wrap:wrap; gap:.4rem 1.4rem; margin-top:1.4rem; color:var(--ink-soft); font-size:.95rem;}
  .proj-contact a{color:inherit;}
`;

export function projectTitle(data: ProjectPageData, lang: ProjectLang): string {
  return (lang === 'en' && data.project.title_en?.trim()) || data.project.title;
}

function selectorProject(data: ProjectPageData, lang: ProjectLang) {
  const { project } = data;
  return {
    slug: project.slug,
    title: projectTitle(data, lang),
    developer: project.developer_name,
    address: project.address,
    city: project.city,
    moveIn: project.move_in,
    facadeUrl: project.facade_url
  };
}

export default function ProjectView({
  data,
  previewToken = null,
  lang = 'sr'
}: {
  data: ProjectPageData;
  /**
   * Poseban link za pokazivanje (/pregled?t=): strana izgleda tačno kao
   * prava - bez trake „pregled" (vlasnik je pokazuje investitoru kao gotov
   * primer, 2. 10. 2026) - ali se ne broji u posetama, a prekidač jezika
   * ostaje na pregledu sa istim potpisom.
   */
  previewToken?: string | null;
  lang?: ProjectLang;
}) {
  const { project, floors, units, progress } = data;
  const t = PROJECT_TEXT[lang];
  const preview = Boolean(previewToken);
  const free = units.filter((u) => u.status === 'available').length;
  const title = projectTitle(data, lang);
  const description = lang === 'en' ? project.description_en : project.description;
  const suffix = preview ? `/pregled?t=${encodeURIComponent(previewToken!)}` : '';
  const srHref = `/novogradnja/${project.slug}${suffix}`;
  const enHref = `/en/novogradnja/${project.slug}${suffix}`;

  return (
    <div lang={lang} style={{ display: 'contents' }}>
      <style dangerouslySetInnerHTML={{ __html: SITE_STYLES + SELECTOR_STYLES + PAGE_STYLES }} />
      {/* Pregled se ne broji u posetama - gleda ga samo admin ili investitor. */}
      {!preview && <SiteTracker />}
      <SiteNav
        brandHref={lang === 'en' ? '/en' : '/'}
        brandAria="Kvadrat360"
        cta={{ href: '#izbor', label: lang === 'en' ? 'Choose an apartment' : 'Izaberite stan', track: 'cta:project_nav' }}
      >
        {progress.length > 0 && (
          <li>
            <a href="#gradiliste">{t.progress}</a>
          </li>
        )}
        <li className="nav-lang">
          {lang === 'en' ? <Link href={srHref}>SR</Link> : <Link href={enHref}>EN</Link>}
        </li>
      </SiteNav>

      <main>
        <section className="proj-head">
          <div className="wrap">
            <span className="eyebrow">
              {t.newBuild}
              {project.city ? ` · ${project.city}` : ''}
            </span>
            <h1>{title}</h1>
            {description && <p className="lede">{description}</p>}
            <div className="proj-facts">
              {project.address && <span className="chip">{project.address}</span>}
              {project.move_in && (
                <span className="chip">
                  {lang === 'en' ? 'Move-in' : 'Useljenje'}: {project.move_in}
                </span>
              )}
              <span className="chip">
                <span className="dot" />
                {lang === 'en' ? 'Available apartments' : 'Slobodnih stanova'}: {free}
              </span>
              {project.developer_name && (
                <span className="chip">
                  {t.investor}: {project.developer_name}
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="proj-body" id="izbor">
          <div className="wrap">
            {/* Zgrada se vidi čim postoje spratovi - stanovi mogu da stignu kasnije. */}
            {floors.length === 0 ? (
              <p className="note">{t.soon}</p>
            ) : (
              <ProjectSelector lang={lang} project={selectorProject(data, lang)} floors={floors} units={units} />
            )}
            <ProjectProgress entries={progress} lang={lang} />
            {(project.contact_phone || project.contact_email) && (
              <p className="proj-contact">
                <span>{t.sales}:</span>
                {project.contact_phone && <a href={`tel:${project.contact_phone.replace(/[^\d+]/g, '')}`}>{project.contact_phone}</a>}
                {project.contact_email && <a href={`mailto:${project.contact_email}`}>{project.contact_email}</a>}
              </p>
            )}
          </div>
        </section>
      </main>

      <SiteFooter note={`${title} · ${t.credit}`} lang={lang} />
    </div>
  );
}

const EMBED_STYLES = `
  html, body{background:transparent;}
  .emb{padding:4px;}
  .emb .inv-demo{box-shadow:none;}
  .emb-credit{display:flex; justify-content:flex-end; margin:8px 6px 0; font-size:.75rem; color:var(--ink-faint);}
  .emb-credit a{color:inherit; text-decoration:none;}
  .emb-credit a:hover{color:var(--accent);}
`;

/** Ugradnja na sajt investitora (iframe): samo izbor stana, gradilište i potpis. */
export function ProjectEmbed({ data, lang = 'sr' }: { data: ProjectPageData; lang?: ProjectLang }) {
  const { project, floors, units, progress } = data;
  const t = PROJECT_TEXT[lang];
  return (
    <main className="emb" lang={lang}>
      <style dangerouslySetInnerHTML={{ __html: SITE_STYLES + SELECTOR_STYLES + EMBED_STYLES }} />
      <EmbedAutoHeight slug={project.slug} />
      {floors.length === 0 ? (
        <p className="note">{t.soon}</p>
      ) : (
        <ProjectSelector embedded lang={lang} project={selectorProject(data, lang)} floors={floors} units={units} />
      )}
      <ProjectProgress entries={progress} lang={lang} />
      <p className="emb-credit">
        <a href={`${SITE_URL}${lang === 'en' ? '/en' : '/'}?utm_source=ugradnja&utm_medium=potpis&utm_campaign=${encodeURIComponent(project.slug)}`} target="_blank" rel="noopener">
          {t.credit}
        </a>
      </p>
    </main>
  );
}
