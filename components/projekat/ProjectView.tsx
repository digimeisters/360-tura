import Link from 'next/link';
import { SiteNav, SiteFooter } from '../SiteChrome';
import SiteTracker from '../SiteTracker';
import ProjectSelector from './ProjectSelector';
import ProjectProgress from './ProjectProgress';
import ProjectNearby from './ProjectNearby';
import { parseNearby } from '../../app/lib/nearby';
import EmbedAutoHeight from './EmbedAutoHeight';
import { SITE_STYLES } from '../../app/lib/siteStyles';
import { SITE_URL } from '../../app/lib/site';
import { SELECTOR_STYLES } from './selectorStyles';
import { formatPrice, PROJECT_TEXT, type ProjectLang } from '../../app/lib/projectI18n';
import type { ProjectPageData } from '../../app/lib/projectData';

/**
 * Cela strana projekta novogradnje. Deli je javna adresa
 * (/novogradnja/[slug], engleski /en/novogradnja/[slug]) i pregled pre
 * objave (/novogradnja/[slug]/pregled), da pregled izgleda tačno kao ono
 * što će posetilac videti. Ugradnja (ProjectEmbed ispod) koristi samo
 * izbor stana i gradilište.
 */

const PAGE_STYLES = `
  .proj-head{padding-block:clamp(1.6rem,4vw,3.2rem) clamp(1.2rem,2.4vw,2rem);}
  .proj-hero{display:grid; grid-template-columns:minmax(0,1.15fr) minmax(0,1fr); gap:clamp(1.4rem,4vw,3.5rem); align-items:end;}
  @media (max-width:900px){ .proj-hero{grid-template-columns:1fr; align-items:start;} }
  .proj-head h1{font-size:clamp(2.2rem,5vw,3.8rem); line-height:1.02; letter-spacing:-.035em; margin-top:.7rem;}
  .proj-head .lede{margin-top:.9rem; max-width:58ch; color:var(--ink-soft); font-size:1.02rem; line-height:1.65;}
  .proj-meta{display:flex; flex-wrap:wrap; gap:.35rem 1.1rem; margin-top:1rem; font-size:.9rem; color:var(--ink-soft);}
  .proj-meta span{display:inline-flex; align-items:center; gap:.4rem;}
  .proj-meta svg{width:16px; height:16px; flex:none; color:var(--accent);}
  .proj-cta{display:flex; flex-wrap:wrap; gap:.6rem; margin-top:1.4rem;}
  .proj-stats{display:grid; grid-template-columns:1fr 1fr; gap:10px;}
  .proj-stat{background:var(--surface); border:1px solid var(--line); border-radius:22px; padding:1rem 1.1rem; box-shadow:var(--shadow);}
  .proj-stat b{display:block; font-family:var(--font-display); font-weight:800; font-size:clamp(1.45rem,2.6vw,1.95rem); letter-spacing:-.02em; line-height:1.1; color:var(--ink); white-space:nowrap;}
  .proj-stat b small{font-size:.55em; font-weight:700; color:var(--ink-faint); margin-left:.15rem;}
  .proj-stat span{display:block; margin-top:.3rem; font-size:.78rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-faint);}
  .proj-stat.is-free{background:#1E5AA8; border-color:#1E5AA8;}
  .proj-stat.is-free b, .proj-stat.is-free b small{color:#FFFFFF;}
  .proj-stat.is-free span{color:#DCE8F7;}
  .proj-anchor{display:block; position:relative; top:-90px; visibility:hidden;}
  .proj-body{padding-bottom:clamp(3rem,6vw,5rem);}
  .proj-contact{display:flex; flex-wrap:wrap; gap:.4rem 1.4rem; margin-top:1.4rem; color:var(--ink-soft); font-size:.95rem;}
  .proj-contact a{color:inherit;}
`;

/** Okolina za mapu: samo kad projekat ima koordinate i bar jedno mesto u blizini. */
function nearbyOf(data: ProjectPageData) {
  const { lat, lng } = data.project;
  const places = parseNearby(data.project.nearby);
  return lat !== null && lng !== null && places.length > 0 ? { lat, lng, places } : null;
}

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
    moveIn: project.move_in
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
  const nearby = nearbyOf(data);
  // Brojke u vrhu strane: slobodni, najniža cena slobodnog stana, raspon kvadratura.
  const prices = units.filter((u) => u.status !== 'sold' && u.price).map((u) => u.price as number);
  const areas = units.filter((u) => u.areaSqm).map((u) => u.areaSqm as number);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const areaRange = areas.length ? [Math.floor(Math.min(...areas)), Math.ceil(Math.max(...areas))] : null;

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
        {nearby && (
          <li>
            <a href="#okolina">{t.nearbyNav}</a>
          </li>
        )}
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
          <div className="wrap proj-hero">
            <div>
              <span className="eyebrow">
                {t.newBuild}
                {project.city ? ` · ${project.city}` : ''}
              </span>
              <h1>{title}</h1>
              {description && <p className="lede">{description}</p>}
              <div className="proj-meta">
                {project.address && (
                  <span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z" />
                      <circle cx="12" cy="9.5" r="2.5" />
                    </svg>
                    {[project.address, project.city].filter(Boolean).join(', ')}
                  </span>
                )}
                {project.developer_name && (
                  <span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
                    </svg>
                    {t.investor}: {project.developer_name}
                  </span>
                )}
              </div>
              {units.length > 0 && (
                <div className="proj-cta">
                  <a className="btn btn-primary" href="#izbor" data-track="cta:project_hero_pick">
                    {t.heroPick}
                  </a>
                  <a className="btn btn-secondary" href="#lista" data-track="cta:project_hero_list">
                    {t.heroList}
                  </a>
                </div>
              )}
            </div>
            {units.length > 0 && (
              <div className="proj-stats">
                <div className="proj-stat is-free">
                  <b>
                    {free}
                    <small>/ {units.length}</small>
                  </b>
                  <span>{t.heroFree}</span>
                </div>
                <div className="proj-stat">
                  <b>{minPrice ? formatPrice(minPrice, lang) : '—'}</b>
                  <span>{t.heroFrom}</span>
                </div>
                <div className="proj-stat">
                  <b>{areaRange ? `${areaRange[0]}–${areaRange[1]} m²` : '—'}</b>
                  <span>{t.heroSizes}</span>
                </div>
                <div className="proj-stat">
                  <b>{project.move_in || '—'}</b>
                  <span>{t.heroMoveIn}</span>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="proj-body" id="izbor">
          <div className="wrap">
            {/* Sidro za „Lista svih stanova" - ProjectSelector na #lista otvara listu. */}
            <span id="lista" className="proj-anchor" aria-hidden="true" />
            {/* Zgrada se vidi čim postoje spratovi - stanovi mogu da stignu kasnije. */}
            {floors.length === 0 ? (
              <p className="note">{t.soon}</p>
            ) : (
              <ProjectSelector
                lang={lang}
                project={selectorProject(data, lang)}
                floors={floors}
                units={units}
                buildings={data.buildings}
                views={data.views}
                demoMedia={data.demoMedia}
                letakBase={preview ? null : `${lang === 'en' ? '/en' : ''}/novogradnja/${project.slug}/stan`}
              />
            )}
            {nearby && <ProjectNearby lang={lang} title={title} {...nearby} />}
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
  const embedNearby = nearbyOf(data);
  return (
    <main className="emb" lang={lang}>
      <style dangerouslySetInnerHTML={{ __html: SITE_STYLES + SELECTOR_STYLES + EMBED_STYLES }} />
      <EmbedAutoHeight slug={project.slug} />
      {floors.length === 0 ? (
        <p className="note">{t.soon}</p>
      ) : (
        <ProjectSelector
          embedded
          lang={lang}
          project={selectorProject(data, lang)}
          floors={floors}
          units={units}
          buildings={data.buildings}
          views={data.views}
          demoMedia={data.demoMedia}
          letakBase={`${lang === 'en' ? '/en' : ''}/novogradnja/${project.slug}/stan`}
        />
      )}
      {embedNearby && <ProjectNearby lang={lang} title={projectTitle(data, lang)} {...embedNearby} />}
      <ProjectProgress entries={progress} lang={lang} />
      <p className="emb-credit">
        <a href={`${SITE_URL}${lang === 'en' ? '/en' : '/'}?utm_source=ugradnja&utm_medium=potpis&utm_campaign=${encodeURIComponent(project.slug)}`} target="_blank" rel="noopener">
          {t.credit}
        </a>
      </p>
    </main>
  );
}
