'use client';

import Link from 'next/link';
import UnitMedia, { UnitRooms } from './UnitMedia';
import UnitInquiry from './UnitInquiry';
import PaymentCalculator from './PaymentCalculator';
import { parseVideo } from '../../app/lib/videoEmbed';
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

/**
 * Ekran jednog stana (spec 2026-10-25, odeljak 2): mediji, cena, podaci,
 * prostorije, PDF, plan plaćanja ili upit, slični slobodni stanovi.
 *  - mode="page":   strana /novogradnja/[slug]/stan/[oznaka] (UnitPage), linkovi;
 *  - mode="inline": na strani projekta, umesto birača (ProjectSelector) - ‹ ›
 *    i slični biraju stan na istoj strani, povratak vodi na sprat.
 */

const UNIT_SCREEN_STYLES = `
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
  .up-head h1 em{font-size:.86em;}
  .up-label{display:block; font-size:.7rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-faint,#9A9DA4); margin-bottom:.45rem;}
  .up-price{display:flex; justify-content:space-between; align-items:flex-start; gap:.8rem; padding:1rem 1.1rem; margin:-.2rem -.2rem .9rem; border-radius:16px; background:var(--surface-2,#F2F1EC);}
  .up-price-l{margin:0 0 .15rem!important; font-size:.72rem!important; font-weight:800; letter-spacing:.08em; text-transform:uppercase;}
  .up-price.is-dark{background:linear-gradient(160deg,#16325C 0%,#1E5AA8 100%); color:#fff;}
  .up-price.is-dark b{color:#fff;}
  .up-price.is-dark small{color:#C9D9EE;}
  .up-price b{display:block;}
  .up-price b::first-letter{text-transform:uppercase;}
  .up-sold-similar{display:flex; flex-direction:column; gap:8px; margin:0 0 1rem;}
  .up-sold-similar .up-card{padding:.7rem .9rem; border-radius:14px; box-shadow:none;}
  .up-about{background:var(--surface); border:1px solid var(--line); border-radius:18px; padding:1rem 1.1rem; box-shadow:var(--shadow);}
  .up-about p{margin:0; font-size:.95rem; line-height:1.6; color:var(--ink); white-space:pre-line;}
  .up-main{display:flex; flex-direction:column; gap:14px; min-width:0;}
  .up-where{ background:var(--surface); border:1px solid var(--line); border-radius:18px; padding:1rem 1.1rem; box-shadow:var(--shadow);}
  .up-where-grid{display:grid; grid-template-columns:72px minmax(0,1fr); gap:12px 16px; align-items:center;}
  .up-where-grid p{grid-column:1 / -1; margin:0; font-size:.88rem; color:var(--ink-soft);}
  .up-where-bld{display:flex; flex-direction:column; gap:3px; padding:6px; border-radius:10px; background:linear-gradient(180deg,#E5EDF6,#CBD8E8);}
  .up-where-bld i{height:12px; border-radius:3px; background:#F6F3EC;}
  .up-where-bld i.is-on{background:#1E5AA8;}
  .up-where-floor{display:flex; flex-wrap:wrap; gap:6px;}
  .up-where-floor i{font-style:normal; min-width:34px; height:30px; display:grid; place-items:center; border-radius:8px; font-size:.78rem; font-weight:700; border:1px solid var(--line); background:#EDF4EE; color:#1F7A45;}
  .up-where-floor i.is-r{background:#FCEFD3; color:#9A6A0B;}
  .up-where-floor i.is-p{background:#F1F1EC; color:#8C8E93;}
  .up-where-floor i.is-on{background:#1E5AA8; border-color:#1E5AA8; color:#fff; box-shadow:0 6px 14px rgba(30,90,168,.3);}
  .up-screen button.up-card{font:inherit; text-align:left; cursor:pointer; width:100%;}
  .up-crumb-btn{border:0; background:none; padding:0; font:inherit; font-weight:700; color:var(--accent); cursor:pointer;}
  .up-pn button{display:inline-flex; align-items:center; gap:.35rem; min-height:44px; padding:0 1rem; border-radius:999px; border:1px solid var(--line); background:var(--surface); color:var(--ink); font:inherit; font-weight:700; font-size:.88rem; cursor:pointer; box-shadow:var(--shadow);}
  .up-pn button:hover{border-color:var(--accent); color:var(--accent);}
  .up-ask{scroll-margin-top:120px;}
  .usb{display:none;}
  @media (max-width:899px){
    .usb{position:fixed; left:0; right:0; bottom:0; z-index:61; display:flex; align-items:center; gap:12px; padding:10px 14px calc(10px + env(safe-area-inset-bottom)); background:rgba(255,255,255,.96); backdrop-filter:blur(8px); border-top:1px solid var(--line);}
    .usb span{display:flex; flex-direction:column; min-width:0;}
    .usb small{font-size:.72rem; color:var(--ink-faint); font-weight:700;}
    .usb b{font-family:var(--font-display); font-size:1.15rem; white-space:nowrap;}
    .usb .btn{flex:1; justify-content:center; min-height:46px;}
  }
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
  .up-card strong::first-letter{text-transform:uppercase;}
`;

export type UnitScreenData = Pick<ProjectPageData, 'units' | 'floors' | 'buildings' | 'demoMedia'> & {
  project: { slug: string; title: string; city: string | null };
};

function SimilarLink({ inline, href, onPick, children }: { inline: boolean; href: string; onPick: () => void; children: React.ReactNode }) {
  return inline ? (
    <button type="button" className="up-card" onClick={onPick}>
      {children}
    </button>
  ) : (
    <Link className="up-card" href={href}>
      {children}
    </Link>
  );
}

export default function UnitScreen({
  data,
  unit,
  floor,
  lang,
  mode,
  onPick,
  onBack,
  embedded = false
}: {
  data: UnitScreenData;
  unit: SelectorUnit;
  floor: SelectorFloor | null;
  lang: ProjectLang;
  mode: 'page' | 'inline';
  /** inline: izbor drugog stana (‹ ›, slični). */
  onPick?: (unitId: string) => void;
  /** inline: povratak na sprat. */
  onBack?: () => void;
  embedded?: boolean;
}) {
  const t = PROJECT_TEXT[lang];
  const inline = mode === 'inline';
  const { project, units, floors, buildings } = data;
  const prefix = lang === 'en' ? '/en' : '';
  const base = `${prefix}/novogradnja/${project.slug}`;
  const unitHref = (u: SelectorUnit) => `${base}/stan/${encodeURIComponent(u.code)}`;
  const title = project.title;
  const building = floor?.buildingId && buildings.length > 1 ? (buildings.find((b) => b.id === floor.buildingId)?.name ?? null) : null;
  const fName = floor ? floorLabel(floor.level, floor.label, lang) : null;
  const sold = unit.status === 'sold';
  const sqm = unit.price && unit.areaSqm ? Math.round(unit.price / unit.areaSqm) : null;
  const badge = unit.status === 'available' ? 's' : unit.status === 'reserved' ? 'r' : 'p';
  const fallbackPlan = !unit.planUrl && floor?.planUrl && unit.polygon ? { src: floor.planUrl, polygon: unit.polygon } : null;
  const hasMedia = Boolean(data.demoMedia || unit.planUrl || fallbackPlan || unit.plan3dUrl || unit.photos.length || unit.tourHref || parseVideo(unit.videoUrl));
  // Opis stana po jeziku; engleska strana bez engleskog opisa ga ne prikazuje.
  const about = (lang === 'en' ? unit.descriptionEn : unit.description) ?? null;

  // Redosled za ‹ › : lamela, sprat, oznaka - isto kao u listi stanova.
  const level = new Map(floors.map((f) => [f.id, f.level]));
  const order = [...units].sort(
    (a, b) => (level.get(a.floorId) ?? 0) - (level.get(b.floorId) ?? 0) || a.code.localeCompare(b.code, 'sr', { numeric: true })
  );
  const i = order.findIndex((u) => u.id === unit.id);
  const prev = i > 0 ? order[i - 1] : null;
  const next = i < order.length - 1 ? order[i + 1] : null;

  // Slični: ista struktura, slobodni; najbliža cena kad je ima, inače najbliža kvadratura.
  const near = (u: SelectorUnit) =>
    unit.price && u.price ? Math.abs(u.price - unit.price) : Math.abs((u.areaSqm ?? 0) - (unit.areaSqm ?? 0));
  const similar = units
    .filter((u) => u.id !== unit.id && u.status === 'available' && u.structure === unit.structure)
    .sort((a, b) => near(a) - near(b))
    .slice(0, 4);
  // Podaci samo kad postoje - prazno se ne prikazuje kao „—".
  const facts: { label: string; value: string }[] = [];
  if (unit.areaSqm) facts.push({ label: t.area, value: formatArea(unit.areaSqm, lang) });
  if (unit.terraceSqm) facts.push({ label: t.terrace, value: formatArea(unit.terraceSqm, lang) });
  if (fName)
    facts.push({
      label: t.floor,
      value: [building, fName].filter(Boolean).join(' · ')
    });
  if (unit.orientation)
    facts.push({
      label: t.orientation,
      value: orientationText(unit.orientation, lang) || unit.orientation
    });
  // Položaj u zgradi: spratovi iste lamele i stanovi ovog sprata.
  const floorsOfBuilding = floors.filter((fl) => (fl.buildingId ?? null) === (floor?.buildingId ?? null)).sort((a, b) => b.level - a.level);
  const unitsOfFloor = units.filter((u) => u.floorId === floor?.id).sort((a, b) => a.code.localeCompare(b.code, 'sr', { numeric: true }));
  const floorOf = (u: SelectorUnit) => floors.find((f) => f.id === u.floorId);

  return (
    <div key={unit.id} className={inline ? 'up-screen is-inline' : 'up-screen'}>
      <style dangerouslySetInnerHTML={{ __html: UNIT_SCREEN_STYLES }} />
      <nav className="up-crumbs" aria-label="Putanja">
        {inline ? (
          <button type="button" className="up-crumb-btn" onClick={onBack}>
            ← {fName || title}
          </button>
        ) : (
          <Link href={base}>← {title}</Link>
        )}
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
            {unit.structure && (
              <>
                {' · '}
                <em>{structureText(unit.structure, lang)}</em>
              </>
            )}
          </h1>
          <div className="up-tags">
            {unit.areaSqm && <span className="chip">{formatArea(unit.areaSqm, lang)}</span>}
            {fName && <span className="chip">{[building, fName].filter(Boolean).join(' · ')}</span>}
            {unit.orientation && <span className="chip">{orientationText(unit.orientation, lang)}</span>}
          </div>
        </div>
        <div className="up-pn">
          {prev ? (
            inline ? (
              <button type="button" onClick={() => onPick?.(prev.id)} aria-label={t.prevUnit}>
                ‹ {prev.code}
              </button>
            ) : (
              <Link href={unitHref(prev)} aria-label={t.prevUnit}>
                ‹ {prev.code}
              </Link>
            )
          ) : (
            <span aria-hidden="true">‹</span>
          )}
          {next ? (
            inline ? (
              <button type="button" onClick={() => onPick?.(next.id)} aria-label={t.nextUnit}>
                {next.code} ›
              </button>
            ) : (
              <Link href={unitHref(next)} aria-label={t.nextUnit}>
                {next.code} ›
              </Link>
            )
          ) : (
            <span aria-hidden="true">›</span>
          )}
        </div>
      </div>

      <div className="up-grid">
        <div className="up-main">
          {hasMedia && (
            <div className="up-media">
              <UnitMedia
                planUrl={unit.planUrl}
                plan3dUrl={unit.plan3dUrl}
                photos={unit.photos}
                tourHref={unit.tourHref}
                code={unit.code}
                lang={lang}
                fallbackPlan={fallbackPlan}
                demo={data.demoMedia}
                videoUrl={unit.videoUrl ?? null}
                large
              />
              {(unit.planUrl || fallbackPlan) && <p className="up-plan-note">{t.planNote}</p>}
            </div>
          )}
          {about && (
            <div className="up-about">
              <span className="up-label">{t.aboutUnit}</span>
              <p>{about}</p>
            </div>
          )}
          {floor && (
            <div className="up-where">
              <span className="up-label">{t.whereTitle}</span>
              <div className="up-where-grid">
                <div className="up-where-bld" aria-hidden="true">
                  {floorsOfBuilding.map((fl) => (
                    <i key={fl.id} className={fl.id === floor.id ? 'is-on' : undefined} />
                  ))}
                </div>
                <div className="up-where-floor" aria-hidden="true">
                  {unitsOfFloor.map((u) => (
                    <i
                      key={u.id}
                      className={u.id === unit.id ? 'is-on' : `is-${u.status === 'available' ? 's' : u.status === 'reserved' ? 'r' : 'p'}`}
                      title={`${t.unit} ${u.code}`}
                    >
                      {u.code}
                    </i>
                  ))}
                </div>
                <p>{t.floorPosition([building, fName].filter(Boolean).join(' · '), unitsOfFloor.length)}</p>
              </div>
            </div>
          )}
        </div>

        <aside className="inv-demo up-side">
          <div className={sold ? 'up-price is-sold' : unit.price ? 'up-price is-dark' : 'up-price'}>
            <div>
              <small className="up-price-l">{sold ? t.soldNote : t.price}</small>
              {!sold && <b>{unit.price ? formatPrice(unit.price, lang) : t.onRequest}</b>}
              {!sold && sqm ? <small>{`${formatPrice(sqm, lang)} ${t.perSqm}`}</small> : null}
            </div>
            <span className={`inv-badge is-${badge}`}>{statusLabel(unit.status, lang)}</span>
          </div>
          {sold && similar.length > 0 && (
            <div className="up-sold-similar">
              <span className="up-label">{t.similar}</span>
              {similar.slice(0, 3).map((u) => {
                const f = floorOf(u);
                return (
                  <SimilarLink key={u.id} inline={inline} href={unitHref(u)} onPick={() => onPick?.(u.id)}>
                    <b>
                      {t.unit} {u.code}
                    </b>
                    <span>{[f ? floorLabel(f.level, f.label, lang) : null, formatArea(u.areaSqm, lang)].filter(Boolean).join(' · ')}</span>
                  </SimilarLink>
                );
              })}
            </div>
          )}
          {facts.length > 0 && (
            <div className="inv-facts">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <small>{fact.label}</small>
                  <b>{fact.value}</b>
                </div>
              ))}
            </div>
          )}
          <UnitRooms rooms={unit.rooms} lang={lang} />
          <a className="inv-pdf" href={`${unitHref(unit)}/letak`} target="_blank" rel="noopener" data-track="cta:project_unit_pdf">
            <span aria-hidden="true">PDF</span> {t.pdf}
          </a>
          {!sold && unit.price ? (
            <PaymentCalculator price={unit.price} areaSqm={unit.areaSqm} sheetHref={`${unitHref(unit)}/letak`} lang={lang} />
          ) : null}
          {/* Prodat stan nema upit, ali se otvaranje strane i dalje broji. */}
          {sold && (
            <UnitInquiry
              slug={project.slug}
              projectTitle={project.title}
              unitId={unit.id}
              code={unit.code}
              status={unit.status}
              where=""
              lang={lang}
              trackView
            />
          )}
          {!sold && (
            <div className="up-ask" id="up-ask">
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
                embedded={embedded}
                trackView
                open
              />
            </div>
          )}
        </aside>
      </div>

      {similar.length > 0 && !sold && (
        <section className="up-similar">
          <h2>{t.similar}</h2>
          <div className="up-cards">
            {similar.map((u) => {
              const f = floorOf(u);
              return (
                <SimilarLink key={u.id} inline={inline} href={unitHref(u)} onPick={() => onPick?.(u.id)}>
                  <b>
                    {t.unit} {u.code}
                  </b>
                  <span>{[f ? floorLabel(f.level, f.label, lang) : null, formatArea(u.areaSqm, lang)].filter(Boolean).join(' · ')}</span>
                  <strong>{u.price ? formatPrice(u.price, lang) : t.onRequest}</strong>
                </SimilarLink>
              );
            })}
          </div>
        </section>
      )}

      {inline && !sold && (
        <div className="usb">
          <span>
            {unit.price ? <small>{t.price}</small> : null}
            <b>{unit.price ? formatPrice(unit.price, lang) : t.onRequestBar}</b>
          </span>
          <a
            className="btn btn-primary"
            href="#up-ask"
            onClick={(e) => {
              // Skrol do forme bez #up-ask u adresi (ne dodaje korak za "nazad").
              e.preventDefault();
              document.getElementById('up-ask')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            data-track="cta:unit_bar_ask"
          >
            {unit.price ? t.askCta : t.askPriceCta}
          </a>
        </div>
      )}
    </div>
  );
}
