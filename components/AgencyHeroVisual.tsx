import type { ShowcaseTour } from '../app/lib/showcaseTours';
import type { AgencyCopy } from '../app/lib/agencyCopy';
import { tourHref } from '../app/lib/tourHref';
import { IconPlay } from './SiteIcons';

/**
 * Vrh strane /za-agencije (vlasnik, 4. 11. 2026; maketa
 * public/mockup/VrhStrana.html): tamno, tekst levo, a desno prava tura u
 * prozoru pregledača i preko nje mesečni izveštaj - isti primer koji stoji
 * niže na strani (agencyCopy owner.report, oznaka "Primer"), bez novih brojki.
 *
 * Početna ima živu turu preko cele širine; ovde je slika sobe sa linkom ka
 * turi, da se tri strane razlikuju na prvi pogled.
 */
export const AGENCY_HERO_STYLES = `
  .ah{padding:clamp(2.6rem,5vw,4.5rem) 0;}
  .ah .wrap{display:grid; grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr); gap:clamp(2rem,4vw,3.5rem); align-items:center;}
  .ah-copy h1{font-size:clamp(2.3rem,3.8vw,3.5rem); line-height:1.04; letter-spacing:-0.035em;}
  .ah-copy .lede{margin-top:1rem; max-width:44ch; color:var(--ink-soft); font-size:clamp(1rem,1.2vw,1.1rem); line-height:1.6;}
  .ah-copy .hero-ctas{margin-top:1.5rem;}
  .ah-stack{position:relative; padding-bottom:clamp(5rem,9vw,7.5rem);}
  .ah-win{display:block; position:relative; margin-left:auto; width:90%; border-radius:16px; overflow:hidden; border:1px solid var(--line-strong);
    background:var(--surface-2); color:var(--ink); text-decoration:none; box-shadow:0 40px 80px -30px rgba(0,0,0,.75);}
  .ah-bar{display:flex; align-items:center; gap:6px; height:34px; padding:0 14px; border-bottom:1px solid var(--line);}
  .ah-bar i{width:9px; height:9px; border-radius:50%; background:var(--line-strong);}
  .ah-bar span{margin-left:10px; font-size:.78rem; color:var(--ink-faint); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
  .ah-win img{display:block; width:100%; aspect-ratio:16/10; object-fit:cover;}
  .ah-open{position:absolute; left:50%; top:calc(34px + (100% - 34px) / 2); transform:translate(-50%,-50%); display:inline-flex; align-items:center; gap:.45rem;
    padding:.65rem 1.1rem; border-radius:999px; background:rgba(17,17,19,.72); color:#FFFFFF; font-family:var(--font-display); font-weight:700; font-size:.92rem; white-space:nowrap;
    transition:background-color .2s ease, transform .2s ease;}
  .ah-win:hover .ah-open{background:#1E5AA8;}
  .ah-win:focus-visible{outline:2px solid var(--accent); outline-offset:3px;}
  .ah-report{position:absolute; left:0; bottom:0; width:min(62%, 360px); padding:1rem 1.1rem 1.1rem; border-radius:18px; background:#FFFFFF; color:#111113;
    box-shadow:0 30px 60px -18px rgba(0,0,0,.65);}
  .ah-report-head{display:flex; justify-content:space-between; align-items:baseline; gap:.6rem;}
  .ah-report-head strong{font-family:var(--font-display); font-size:.98rem; font-weight:800;}
  .ah-report-head span{flex:none; font-size:.7rem; font-weight:700; padding:.15rem .55rem; border-radius:999px; background:#E9EFF6; color:#1E5AA8;}
  .ah-kpis{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.45rem; margin:.75rem 0 .6rem;}
  .ah-kpis div{padding:.5rem .55rem; border-radius:10px; background:#F1F1EC;}
  .ah-kpis b{display:block; font-family:var(--font-display); font-size:1.3rem; font-weight:800; font-variant-numeric:tabular-nums; line-height:1.1;}
  .ah-kpis small{font-size:.7rem; color:#5B5D63; line-height:1.2; display:block;}
  .ah-bars{display:grid; gap:.35rem; margin:0; padding:0; list-style:none;}
  .ah-bars li{display:grid; grid-template-columns:7.5rem 1fr; align-items:center; gap:.5rem; font-size:.75rem; color:#5B5D63;}
  .ah-bars i{display:block; height:6px; border-radius:3px; background:#1E5AA8;}
  @media (max-width:980px){
    .ah .wrap{grid-template-columns:1fr;}
  }
  @media (max-width:560px){
    .ah-stack{padding-bottom:0;}
    .ah-win{width:100%;}
    .ah-report{position:relative; width:auto; margin:-2.5rem .8rem 0;}
  }
`;

export default function AgencyHeroVisual({ tour, report }: { tour: ShowcaseTour | null; report: AgencyCopy['owner']['report'] }) {
  // Naslovna soba ture - najbolja fotografija; ovde je u okviru pregledača, ne preko cele širine kao na početnoj.
  const room = tour?.rooms.find((r) => r.id === tour.coverRoomId) ?? tour?.rooms[0] ?? null;
  const photo = tour?.coverUrl ?? room?.previewUrl ?? null;
  return (
    <div className="ah-stack">
      {tour && photo && (
        <a className="ah-win" href={tourHref(tour.slug, tour.languages, 'sr')} data-track="cta:agency_hero_tour">
          <span className="ah-bar" aria-hidden="true">
            <i />
            <i />
            <i />
            <span>kvadrat360.com/tour/{tour.slug}</span>
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element -- 1200x630 JPG sa CDN-a */}
          <img src={photo} alt={room ? `Primer ture: ${room.title}` : ''} fetchPriority="high" />
          <span className="ah-open">
            <IconPlay /> Pogledajte primer ture
          </span>
        </a>
      )}
      <div className="ah-report" aria-label={report.title}>
        <div className="ah-report-head">
          <strong>{report.title}</strong>
          <span>{report.badge}</span>
        </div>
        <div className="ah-kpis">
          {report.kpis.map((kpi) => (
            <div key={kpi.label}>
              <b>{kpi.value}</b>
              <small>{kpi.label}</small>
            </div>
          ))}
        </div>
        <ul className="ah-bars">
          {report.rooms.map((r) => (
            <li key={r.name}>
              <span>{r.name}</span>
              <i style={{ width: `${r.pct}%` }} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
