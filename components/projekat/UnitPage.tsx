import Link from 'next/link';
import { SiteNav, SiteFooter } from '../SiteChrome';
import SiteTracker from '../SiteTracker';
import UnitMedia, { UnitRooms } from './UnitMedia';
import UnitInquiry from './UnitInquiry';
import PaymentCalculator from './PaymentCalculator';
import {
  floorLabel,
  formatArea,
  formatPrice,
  orientationText,
  PROJECT_TEXT,
  statusLabel,
  structureText,
  type ProjectLang
} from '../../app/lib/projectI18n';
import type { ProjectPageData } from '../../app/lib/projectData';
import type { SelectorFloor, SelectorUnit } from './ProjectSelector';
import SiteStylesheets from '../SiteStylesheets';
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
  .up-crumbs{display:flex; flex-wrap:wrap; align-items:center; gap:.4rem .6rem; font-size:.88rem; color:var(--ink-soft);}
  .up-crumbs a{color:var(--accent); font-weight:700; text-decoration:none;}
  .up-crumbs a:hover{text-decoration:underline;}
  .up-head{display:flex; justify-content:space-between; align-items:flex-end; gap:1rem; flex-wrap:wrap; margin:1rem 0 1.4rem;}
  .up-head h1{font-size:clamp(2.3rem,5.2vw,3.8rem); line-height:1; letter-spacing:-.035em; margin:.5rem 0 0;}
  .up-tags{display:flex; flex-wrap:wrap; gap:.45rem; margin-top:.9rem;}
  .up-pn{display:flex; gap:.5rem;}
  .up-pn a, .up-pn span{display:inline-flex; align-items:center; gap:.35rem; min-height:44px; padding:0 1rem; border-radius:999px; border:1px solid var(--line); background:var(--surface); color:var(--ink); font-weight:700; font-size:.88rem; text-decoration:none; box-shadow:var(--shadow);}
  .up-pn a:hover{border-color:var(--accent); color:var(--accent);}
  .up-pn span{opacity:.4;}
  .up-grid{display:grid; grid-template-columns:minmax(0,1fr) 400px; gap:clamp(1rem,2.4vw,1.8rem); align-items:start;}
  @media (max-width:980px){ .up-grid{grid-template-columns:1fr;} }
  .up-media{background:var(--surface); border:1px solid var(--line); border-radius:28px; padding:clamp(.7rem,1.6vw,1.1rem); box-shadow:var(--shadow);}
  .up-media .inv-um{margin:0;}
  .up-plan-note{margin:.7rem .3rem 0; font-size:.78rem; color:var(--ink-faint);}
  @media (min-width:981px){ .up-side{position:sticky; top:88px;} }
  .up-side.inv-demo{padding:1.2rem;}
  .up-price{display:flex; justify-content:space-between; align-items:flex-start; gap:.8rem;}
  .up-price b{display:block; font-family:var(--font-display); font-weight:800; font-size:2.1rem; letter-spacing:-.03em; line-height:1.05; color:#111113;}
  .up-price small{display:block; margin-top:.25rem; color:#6B7280; font-size:.85rem;}
  .up-ask{margin-top:1rem; padding-top:1rem; border-top:1px solid #E3E9F2;}
  .up-ask h2{font-family:var(--font-display); font-size:1.1rem; margin:0;}
  .up-ask p{margin:.2rem 0 .6rem; font-size:.82rem; color:#6B7280;}
  .up-similar{margin-top:clamp(2rem,5vw,3.2rem);}
  .up-similar h2{font-size:clamp(1.4rem,3vw,1.9rem); margin:0 0 .9rem;}
  .up-cards{display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px;}
  .up-card{display:flex; flex-direction:column; gap:.2rem; padding:1rem 1.1rem; border-radius:20px; background:var(--surface); border:1px solid var(--line); color:var(--ink); text-decoration:none; box-shadow:var(--shadow); transition:border-color .15s, transform .15s;}
  .up-card:hover{border-color:var(--accent); transform:translateY(-2px);}
  .up-card b{font-family:var(--font-display); font-size:1.15rem;}
  .up-card span{font-size:.86rem; color:var(--ink-soft);}
  .up-card strong{margin-top:.4rem; font-family:var(--font-display); font-size:1.1rem; color:var(--accent);}
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
  const unitHref = (u: SelectorUnit) => `${base}/stan/${encodeURIComponent(u.code)}`;
  const title = (lang === 'en' && project.title_en?.trim()) || project.title;
  const building = floor?.buildingId && buildings.length > 1 ? buildings.find((b) => b.id === floor.buildingId)?.name ?? null : null;
  const fName = floor ? floorLabel(floor.level, floor.label, lang) : null;
  const sold = unit.status === 'sold';
  const sqm = unit.price && unit.areaSqm ? Math.round(unit.price / unit.areaSqm) : null;
  const badge = unit.status === 'available' ? 's' : unit.status === 'reserved' ? 'r' : 'p';
  const fallbackPlan = !unit.planUrl && floor?.planUrl && unit.polygon ? { src: floor.planUrl, polygon: unit.polygon } : null;
  const hasMedia = Boolean(data.demoMedia || unit.planUrl || fallbackPlan || unit.plan3dUrl || unit.photos.length || unit.tourHref);

  // Redosled za ‹ › : lamela, sprat, oznaka - isto kao u listi stanova.
  const level = new Map(floors.map((f) => [f.id, f.level]));
  const order = [...units].sort(
    (a, b) => (level.get(a.floorId) ?? 0) - (level.get(b.floorId) ?? 0) || a.code.localeCompare(b.code, 'sr', { numeric: true })
  );
  const i = order.findIndex((u) => u.id === unit.id);
  const prev = i > 0 ? order[i - 1] : null;
  const next = i < order.length - 1 ? order[i + 1] : null;

  // Slični: ista struktura, slobodni, najbliža cena.
  const similar = units
    .filter((u) => u.id !== unit.id && u.status === 'available' && u.structure === unit.structure)
    .sort((a, b) => Math.abs((a.price ?? 0) - (unit.price ?? 0)) - Math.abs((b.price ?? 0) - (unit.price ?? 0)))
    .slice(0, 4);
  const floorOf = (u: SelectorUnit) => floors.find((f) => f.id === u.floorId);

  return (
    <div lang={lang} style={{ display: 'contents' }}>
      {lang === 'en' && <HtmlLang lang="en" />}
      <SiteStylesheets selector />
      <style dangerouslySetInnerHTML={{ __html: PAGE_STYLES }} />
      <SiteTracker />
      <SiteNav brandHref={lang === 'en' ? '/en' : '/'} brandAria="Kvadrat360" cta={{ href: `${base}#izbor`, label: t.allUnits, track: 'cta:unit_nav' }}>
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
          <nav className="up-crumbs" aria-label="Putanja">
            <Link href={base}>← {title}</Link>
            {building && <span>/ {building}</span>}
            {fName && <span>/ {fName}</span>}
            <span>
              / {t.unit} {unit.code}
            </span>
          </nav>

          <div className="up-head">
            <div>
              <span className="eyebrow">{[t.newBuild, project.city].filter(Boolean).join(' · ')}</span>
              <h1>
                {t.unit} {unit.code}
              </h1>
              <div className="up-tags">
                {unit.structure && <span className="chip">{structureText(unit.structure, lang)}</span>}
                {unit.areaSqm && <span className="chip">{formatArea(unit.areaSqm, lang)}</span>}
                {fName && <span className="chip">{[building, fName].filter(Boolean).join(' · ')}</span>}
                {unit.orientation && <span className="chip">{orientationText(unit.orientation, lang)}</span>}
              </div>
            </div>
            <div className="up-pn">
              {prev ? (
                <Link href={unitHref(prev)} aria-label={t.prevUnit}>
                  ‹ {prev.code}
                </Link>
              ) : (
                <span aria-hidden="true">‹</span>
              )}
              {next ? (
                <Link href={unitHref(next)} aria-label={t.nextUnit}>
                  {next.code} ›
                </Link>
              ) : (
                <span aria-hidden="true">›</span>
              )}
            </div>
          </div>

          <div className="up-grid">
            <div className="up-media">
              {hasMedia ? (
                <UnitMedia
                  planUrl={unit.planUrl}
                  plan3dUrl={unit.plan3dUrl}
                  photos={unit.photos}
                  tourHref={unit.tourHref}
                  code={unit.code}
                  lang={lang}
                  fallbackPlan={fallbackPlan}
                  demo={data.demoMedia}
                  large
                />
              ) : (
                <p className="up-plan-note">{t.soon}</p>
              )}
              {(unit.planUrl || fallbackPlan) && <p className="up-plan-note">{t.planNote}</p>}
            </div>

            <aside className="inv-demo up-side">
              <div className="up-price">
                <div>
                  <b>{sold ? '—' : unit.price ? formatPrice(unit.price, lang) : t.onRequest}</b>
                  <small>
                    {sold ? t.soldNote : sqm ? `${formatPrice(sqm, lang)} ${t.perSqm}` : t.price}
                  </small>
                </div>
                <span className={`inv-badge is-${badge}`}>{statusLabel(unit.status, lang)}</span>
              </div>
              <div className="inv-facts">
                <div>
                  <small>{t.area}</small>
                  <b>{formatArea(unit.areaSqm, lang)}</b>
                </div>
                <div>
                  <small>{t.terrace}</small>
                  <b>{formatArea(unit.terraceSqm, lang)}</b>
                </div>
                <div>
                  <small>{t.structure}</small>
                  <b>{structureText(unit.structure, lang) || '—'}</b>
                </div>
                <div>
                  <small>{t.orientation}</small>
                  <b>{orientationText(unit.orientation, lang) || '—'}</b>
                </div>
              </div>
              <UnitRooms rooms={unit.rooms} lang={lang} />
              <a className="inv-pdf" href={`${unitHref(unit)}/letak`} target="_blank" rel="noopener" data-track="cta:project_unit_pdf">
                <span aria-hidden="true">PDF</span> {t.pdf}
              </a>
              {!sold && unit.price ? <PaymentCalculator price={unit.price} lang={lang} /> : null}
              {/* Prodat stan nema upit, ali se otvaranje strane i dalje broji. */}
              {sold && <UnitInquiry slug={project.slug} projectTitle={project.title} unitId={unit.id} code={unit.code} status={unit.status} where="" lang={lang} trackView />}
              {!sold && (
                <div className="up-ask">
                  <h2>{unit.status === 'reserved' ? t.notifyMe : t.askTitle}</h2>
                  <p>{t.askNote}</p>
                  <UnitInquiry
                    slug={project.slug}
                    projectTitle={project.title}
                    unitId={unit.id}
                    code={unit.code}
                    status={unit.status}
                    where={[building, floor ? floorLabel(floor.level, floor.label, 'sr') : null].filter(Boolean).join(' · ')}
                    lang={lang}
                    trackView
                    open
                  />
                </div>
              )}
            </aside>
          </div>

          {similar.length > 0 && (
            <section className="up-similar">
              <h2>{t.similar}</h2>
              <div className="up-cards">
                {similar.map((u) => {
                  const f = floorOf(u);
                  return (
                    <Link key={u.id} className="up-card" href={unitHref(u)}>
                      <b>
                        {t.unit} {u.code}
                      </b>
                      <span>{[f ? floorLabel(f.level, f.label, lang) : null, formatArea(u.areaSqm, lang)].filter(Boolean).join(' · ')}</span>
                      <strong>{u.price ? formatPrice(u.price, lang) : t.onRequest}</strong>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      <SiteFooter note={`${title} · ${t.credit}`} lang={lang} />
    </div>
  );
}
