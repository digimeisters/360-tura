import Link from 'next/link';
import { SiteNav, SiteFooter } from '../SiteChrome';
import SiteTracker from '../SiteTracker';
import ProjectSelector from './ProjectSelector';
import ProjectProgress from './ProjectProgress';
import ProjectNearby from './ProjectNearby';
import { parseNearby } from '../../app/lib/nearby';
import EmbedAutoHeight from './EmbedAutoHeight';
import { SITE_URL } from '../../app/lib/site';
import { floorLabel, formatPrice, PROJECT_TEXT, structureText, type ProjectLang } from '../../app/lib/projectI18n';
import ProjectFacts from './ProjectFacts';
import ProjectBuying from './ProjectBuying';
import ProjectJumpBar from './ProjectJumpBar';
import ProjectContact from './ProjectContact';
import ProjectMobileBar from './ProjectMobileBar';
import type { ProjectPageData } from '../../app/lib/projectData';
import SiteStylesheets from '../SiteStylesheets';
import HtmlLang from '../HtmlLang';

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
  .proj-stats{display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px;}
  .proj-stat{background:var(--surface); border:1px solid var(--line); border-radius:18px; padding:1rem 1.1rem; box-shadow:0 1px 2px rgba(20,22,27,.04),0 8px 24px rgba(20,22,27,.06);}
  .proj-stat b{display:block; font-family:var(--font-display); font-weight:800; font-size:clamp(1.45rem,2.6vw,1.95rem); letter-spacing:-.02em; line-height:1.1; color:var(--ink); white-space:nowrap;}
  .proj-stat b small{font-size:.55em; font-weight:700; color:var(--ink-faint); margin-left:.15rem;}
  .proj-stat span{display:block; margin-top:.3rem; font-size:.78rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-faint);}
  .proj-stat.is-free{background:linear-gradient(160deg,#16325C 0%,#1E5AA8 100%); border-color:transparent;}
  .proj-stat.is-free b, .proj-stat.is-free b small{color:#FFFFFF;}
  .proj-stat.is-free span{color:#DCE8F7;}
  .proj-anchor{display:block; position:relative; top:-90px; visibility:hidden;}
  .proj-body{padding-bottom:clamp(1.2rem,2.5vw,1.8rem);}
  .proj-contact{display:flex; flex-wrap:wrap; gap:.4rem 1.4rem; margin-top:1.4rem; color:var(--ink-soft); font-size:.95rem;}
  .proj-contact a{color:inherit;}
  .proj-info{padding-bottom:clamp(2.4rem,5vw,4rem);}
  .proj-info-grid{display:grid; grid-template-columns:repeat(12,minmax(0,1fr)); gap:22px;}
  .proj-info-grid > *{grid-column:span 12;}
  .proj-card{background:var(--surface); border:1px solid var(--line); border-radius:18px; box-shadow:var(--shadow); padding:clamp(1.1rem,2.4vw,1.6rem); scroll-margin-top:var(--proj-anchor,140px);}
  @media (max-width:979px){ .proj-info{--proj-anchor:124px;} }
  .proj-card h2{font-size:clamp(1.3rem,2.4vw,1.7rem); letter-spacing:-.02em; margin:.35rem 0 .9rem;}
  .proj-desc{color:var(--ink-soft); line-height:1.65; margin:0 0 1rem; max-width:70ch;}
  .proj-wide{scroll-margin-top:var(--proj-anchor,140px);}
  .proj-wide > section{margin-top:0;}
  .proj-contact-card{scroll-margin-top:var(--proj-anchor,140px);}
  @media (min-width:960px){ .proj-buy{grid-column:span 6;} .proj-contact-card{grid-column:span 6;} }
  .pf-grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:10px; margin:0;}
  .pf-item{background:var(--surface-2); border-radius:14px; padding:.75rem .9rem;}
  .pf-item dt{font-size:.72rem; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:var(--ink-faint);}
  .pf-item dd{margin:.15rem 0 0; font-family:var(--font-display); font-weight:700; font-size:1.02rem;}
  .pf-cta{display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:.6rem; margin:1rem 0 0; padding:.75rem 1rem; border-radius:14px; background:var(--accent-soft); font-size:.92rem;}
  .pf-cta a{font-weight:700; color:var(--accent); text-decoration:none;}
  .pb-steps{list-style:none; margin:0; padding:0; display:grid; grid-template-columns:1fr 1fr; gap:10px;}
  @media (max-width:560px){ .pb-steps{grid-template-columns:1fr;} }
  .pb-steps li{border:1px solid var(--line); border-radius:14px; padding:.8rem .9rem; display:flex; flex-direction:column; gap:.1rem;}
  .pb-n{font-family:var(--font-display); font-weight:800; font-size:.8rem; color:var(--accent);}
  .pb-steps b{font-family:var(--font-display); font-size:1rem;}
  .pb-steps small{color:var(--ink-soft); font-size:.86rem;}
  .pb-calc{display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:.7rem; margin:1rem 0 0; padding:.8rem 1rem; border-radius:14px; background:var(--accent-soft); font-size:.92rem;}
  /* Traka za skok samo na računaru: ispod 980px meni sajta je u dva reda, a
     traka na dnu telefona (ProjectMobileBar) već vodi kroz stranu. */
  @media (max-width:979px){ .pj{display:none;} }
  .pj{position:sticky; top:72px; z-index:30; background:color-mix(in srgb, var(--bg) 94%, transparent); backdrop-filter:blur(8px); border-block:1px solid var(--line); margin-bottom:22px;}
  .pj-inner{display:flex; gap:4px; overflow-x:auto; padding-block:8px; scrollbar-width:none;}
  .pj-inner::-webkit-scrollbar{display:none;}
  .pj a{flex:none; padding:.45rem .8rem; border-radius:10px; font-weight:600; font-size:.9rem; color:var(--ink-soft); text-decoration:none;}
  .pj a.is-on{background:var(--surface); color:var(--ink); box-shadow:0 1px 3px rgba(0,0,0,.08);}
  .proj-badge{background:var(--accent-soft); border-top:1px solid var(--line);}
  .proj-badge-inner{display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:.6rem; padding-block:1rem; font-size:.9rem; color:var(--ink-soft);}
  .proj-badge-inner a{font-weight:700; color:var(--accent); text-decoration:none;}
`;

/** Okolina za mapu: samo kad projekat ima koordinate i bar jedno mesto u blizini. */
function nearbyOf(data: ProjectPageData) {
  const { lat, lng } = data.project;
  const places = parseNearby(data.project.nearby);
  return lat !== null && lng !== null && places.length > 0 ? { lat, lng, places } : null;
}

/** „Jadranska - Garić Invest" -> naslov sa akcentom na delu posle crte. */
function splitTitle(title: string): [string, string | null] {
  const m = title.match(/^(.+?)\s+[-–]\s+(.+)$/);
  return m ? [m[1], m[2]] : [title, null];
}

/** Spratovi sa najviše slobodnih stanova, kao tekst („1., 2. i 3. sprat"); null = nema slobodnih. */
function mostFreeFloors(data: ProjectPageData, lang: ProjectLang): string | null {
  const free = new Map<string, number>();
  for (const u of data.units) if (u.status === 'available') free.set(u.floorId, (free.get(u.floorId) ?? 0) + 1);
  const max = Math.max(0, ...free.values());
  if (!max) return null;
  const names = data.floors
    .filter((fl) => free.get(fl.id) === max)
    .sort((a, b) => a.level - b.level)
    .map((fl) => floorLabel(fl.level, fl.label, lang));
  if (names.length === 1) return names[0];
  const and = lang === 'en' ? ' and ' : ' i ';
  return `${names.slice(0, -1).join(', ')}${and}${names[names.length - 1]}`;
}

export function projectTitle(data: ProjectPageData, lang: ProjectLang): string {
  return (lang === 'en' && data.project.title_en?.trim()) || data.project.title;
}

export function selectorProject(data: ProjectPageData, lang: ProjectLang) {
  const { project } = data;
  return {
    slug: project.slug,
    title: projectTitle(data, lang),
    srTitle: project.title,
    developer: project.developer_name,
    address: project.address,
    city: project.city,
    moveIn: project.move_in,
    renderUrl: project.render_url,
    videoUrl: project.video_url
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
  const areaRange: [number, number] | null = areas.length ? [Math.floor(Math.min(...areas)), Math.ceil(Math.max(...areas))] : null;
  const topLevel = floors.length ? Math.max(...floors.map((fl) => fl.level)) : null;
  const floorsSpan = topLevel === null ? null : t.floorsSpan(topLevel);
  const [titleMain, titleAccent] = splitTitle(title);
  const moveIn = project.move_in?.trim() || null;
  // Delovi ispod izbora stana - traka za skok nudi samo one koji postoje.
  const jump = [
    { id: 'o-projektu', label: t.jumpAbout },
    ...(nearby ? [{ id: 'okolina', label: t.jumpArea }] : []),
    ...(progress.length > 0 ? [{ id: 'gradiliste', label: t.jumpProgress }] : []),
    { id: 'kupovina', label: t.jumpBuy },
    { id: 'kontakt', label: t.jumpContact }
  ];

  return (
    <div lang={lang} style={{ display: 'contents' }}>
      {lang === 'en' && <HtmlLang lang="en" />}
      <SiteStylesheets selector />
      <style dangerouslySetInnerHTML={{ __html: PAGE_STYLES }} />
      {/* Pregled se ne broji u posetama - gleda ga samo admin ili investitor. */}
      {!preview && <SiteTracker />}
      {/* Sa logom investitora (migracija 034) znak u zaglavlju je njegov i vodi na
          vrh ove strane, ne na naš sajt; Kvadrat360 ostaje u podnožju. */}
      <SiteNav
        brandHref={project.logo_url ? '#' : lang === 'en' ? '/en' : '/'}
        brandAria={project.logo_url ? project.developer_name || title : 'Kvadrat360'}
        brandLogo={project.logo_url ? { src: project.logo_url, alt: project.developer_name || title, dark: project.logo_dark } : null}
        cta={{ href: '#kontakt', label: t.askInvestor, track: 'cta:project_nav_ask' }}
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
              <h1>
                {titleMain}
                {titleAccent && (
                  <>
                    {' – '}
                    <em>{titleAccent}</em>
                  </>
                )}
              </h1>
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
                {areaRange && (
                  <div className="proj-stat">
                    <b>{`${areaRange[0]}–${areaRange[1]} m²`}</b>
                    <span>{t.heroSizes}</span>
                  </div>
                )}
                {floorsSpan && (
                  <div className="proj-stat">
                    <b>{floorsSpan}</b>
                    <span>{t.heroFloors}</span>
                  </div>
                )}
                {minPrice && (
                  <div className="proj-stat">
                    <b>{formatPrice(minPrice, lang)}</b>
                    <span>{t.heroFrom}</span>
                  </div>
                )}
                {moveIn && (
                  <div className="proj-stat">
                    <b>{moveIn}</b>
                    <span>{t.heroMoveIn}</span>
                  </div>
                )}
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
          </div>
        </section>

        <ProjectJumpBar items={jump} label={t.jumpLabel} />

        <section className="proj-info">
          <div className="wrap proj-info-grid">
            <div className="proj-card proj-about" id="o-projektu">
              <span className="eyebrow">{t.aboutEyebrow}</span>
              <h2>
                {titleMain}
                {titleAccent && (
                  <>
                    {' – '}
                    <em>{titleAccent}</em>
                  </>
                )}
              </h2>
              {description && <p className="proj-desc">{description}</p>}
              <ProjectFacts
                lang={lang}
                developer={project.developer_name}
                address={project.address}
                city={project.city}
                floorsSpan={floorsSpan}
                unitsCount={units.length}
                areaRange={areaRange}
                moveIn={moveIn}
                mostFree={mostFreeFloors(data, lang)}
              />
            </div>
            {nearby && (
              <div className="proj-wide">
                <ProjectNearby lang={lang} title={title} {...nearby} />
              </div>
            )}
            {progress.length > 0 && (
              <div className="proj-wide">
                <ProjectProgress entries={progress} lang={lang} />
              </div>
            )}
            <div className="proj-card proj-buy" id="kupovina">
              <ProjectBuying lang={lang} />
            </div>
            <div className="proj-contact-card" id="kontakt">
              <ProjectContact
                lang={lang}
                slug={project.slug}
                projectTitle={data.project.title}
                phone={project.contact_phone}
                email={project.contact_email}
                units={units
                  .filter((u) => u.status === 'available')
                  .sort((a, b) => a.code.localeCompare(b.code, 'sr', { numeric: true }))
                  .map((u) => {
                    const fl = floors.find((x) => x.id === u.floorId);
                    return {
                      id: u.id,
                      code: u.code,
                      label: [`${t.unit} ${u.code}`, fl ? floorLabel(fl.level, fl.label, lang) : null, u.structure ? structureText(u.structure, lang) || u.structure : null].filter(Boolean).join(' · '),
                      // Za Telegram i prodaju uvek na srpskom, kao upit iz kartice stana.
                      srLabel: [`Stan ${u.code}`, fl ? floorLabel(fl.level, fl.label, 'sr') : null, u.structure].filter(Boolean).join(' · ')
                    };
                  })}
              />
            </div>
          </div>
        </section>

        <aside className="proj-badge">
          <div className="wrap proj-badge-inner">
            <span>{t.investorBadge}</span>
            <a href={lang === 'en' ? '/za-investitore' : '/za-investitore'} data-track="cta:project_investor_badge">
              {t.investorCta} →
            </a>
          </div>
        </aside>
      </main>

      <ProjectMobileBar lang={lang} listCount={units.length} />
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
      <SiteStylesheets selector />
      <style dangerouslySetInnerHTML={{ __html: EMBED_STYLES }} />
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
