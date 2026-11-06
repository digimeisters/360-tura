import type { ShowcaseTour } from '../app/lib/showcaseTours';
import type { AgencyCopy } from '../app/lib/agencyCopy';
import { tourHref } from '../app/lib/tourHref';
import { IconPlay } from './SiteIcons';

/**
 * Vrh strane /za-agencije (vlasnik, 4. 11. 2026; maketa
 * public/mockup/VrhStrana.html): tamno, tekst levo, a desno prozor sa
 * SAJTOM AGENCIJE u kome je tura ugrađena (vlasnik, 5. 11. 2026: da se vidi da
 * tura ide na njihov sajt i da se tamo klikne). Preko prozora mesečni
 * izveštaj - isti primer koji stoji niže na strani (agencyCopy owner.report,
 * oznaka "Primer"), bez novih brojki.
 *
 * Adresa u prozoru je opis ("Sajt vaše agencije"), ne izmišljen domen.
 * Dugme za turu stoji desno, da ga kartica izveštaja (levo dole) ne pokrije.
 */
export const AGENCY_HERO_STYLES = `
  .ah{padding:clamp(2.6rem,5vw,4.5rem) 0;}
  .ah .wrap{display:grid; grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr); gap:clamp(2rem,4vw,3.5rem); align-items:center;}
  .ah-copy h1{font-size:clamp(2.3rem,3.8vw,3.5rem); line-height:1.04; letter-spacing:-0.035em;}
  .ah-copy .lede{margin-top:1rem; max-width:44ch; color:var(--ink-soft); font-size:clamp(1rem,1.2vw,1.1rem); line-height:1.6;}
  .ah-copy .hero-ctas{margin-top:1.5rem;}
  .ah-stack{position:relative; padding:1.4rem 0 clamp(5.5rem,10vw,8rem);}

  /* Prozor pregledača sa sajtom agencije (svetao, kao pravi sajt). */
  .ah-win{display:block; position:relative; margin-left:auto; width:92%; border-radius:16px; overflow:hidden; background:#FFFFFF; color:#111113; text-decoration:none;
    box-shadow:0 0 0 1px rgba(255,255,255,.08), 0 40px 80px -30px rgba(0,0,0,.75);}
  .ah-win:focus-visible{outline:2px solid var(--accent); outline-offset:3px;}
  .ah-bar{display:flex; align-items:center; gap:6px; height:34px; padding:0 12px; background:#EDEEF0; border-bottom:1px solid #DCDDE0;}
  .ah-bar i{width:9px; height:9px; border-radius:50%; background:#C9CBD0;}
  .ah-url{display:flex; align-items:center; gap:6px; margin-left:10px; flex:1; min-width:0; height:22px; padding:0 10px; border-radius:999px; background:#FFFFFF;
    font-size:.74rem; color:#5B5D63; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
  .ah-url svg{flex:none; width:11px; height:11px; stroke:#5B5D63; fill:none; stroke-width:2.2;}
  /* Zaglavlje sajta agencije - nacrtano, bez pravog imena. */
  .ah-site{display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:10px 16px; border-bottom:1px solid #EEEEEA;}
  .ah-site b{font-family:var(--font-display); font-weight:800; font-size:.82rem; letter-spacing:.06em; text-transform:uppercase; color:#111113;}
  .ah-site span{display:flex; gap:8px;}
  .ah-site span i{width:30px; height:6px; border-radius:3px; background:#E4E4DE;}
  .ah-listing{padding:12px 16px 16px;}
  .ah-listing-title{display:flex; align-items:baseline; justify-content:space-between; gap:.8rem; margin-bottom:10px;}
  .ah-listing-title strong{font-family:var(--font-display); font-size:.95rem; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
  .ah-listing-title small{flex:none; font-size:.7rem; color:#8C8E93;}
  /* Ugrađena tura u oglasu. */
  .ah-embed{position:relative; border-radius:12px; overflow:hidden; background:#1A1B1F;}
  .ah-embed img{display:block; width:100%; aspect-ratio:16/9; object-fit:cover;}
  .ah-360{position:absolute; left:10px; top:10px; padding:.22rem .55rem; border-radius:999px; background:rgba(17,17,19,.72); color:#FFFFFF; font-family:var(--font-display); font-weight:800; font-size:.72rem;}
  .ah-open{position:absolute; right:7%; top:38%; transform:translateY(-50%); display:inline-flex; align-items:center; gap:.45rem;
    padding:.65rem 1.1rem; border-radius:999px; background:#1E5AA8; color:#FFFFFF; font-family:var(--font-display); font-weight:700; font-size:.92rem; white-space:nowrap;
    box-shadow:0 10px 24px -10px rgba(0,0,0,.6); transition:transform .2s ease, background-color .2s ease;}
  .ah-win:hover .ah-open{background:#174C8F; transform:translateY(-50%) scale(1.04);}
  .ah-credit{position:absolute; right:10px; bottom:8px; font-size:.64rem; color:rgba(255,255,255,.85); text-shadow:0 1px 2px rgba(0,0,0,.6);}

  /* Natpis iznad prozora: tura je na sajtu agencije. */
  .ah-tag{position:absolute; right:0; top:0; z-index:2; display:inline-flex; align-items:center; gap:.45rem; padding:.45rem .85rem; border-radius:999px;
    background:#FFFFFF; color:#111113; font-size:.8rem; font-weight:700; box-shadow:0 14px 30px -12px rgba(0,0,0,.6);}
  .ah-tag code{font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:.74rem; color:#1E5AA8;}

  .ah-report{position:absolute; left:0; bottom:0; width:min(60%, 340px); padding:1rem 1.1rem 1.1rem; border-radius:18px; background:#FFFFFF; color:#111113;
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
    .ah-stack{padding:1.4rem 0 0;}
    .ah-win{width:100%;}
    .ah-open{right:50%; top:50%; transform:translate(50%,-50%);}
    .ah-win:hover .ah-open{transform:translate(50%,-50%) scale(1.04);}
    .ah-report{position:relative; width:auto; margin:-1.5rem .8rem 0;}
  }
`;

export default function AgencyHeroVisual({ tour, report }: { tour: ShowcaseTour | null; report: AgencyCopy['owner']['report'] }) {
  // Naslovna soba ture - najbolja fotografija.
  const room = tour?.rooms.find((r) => r.id === tour.coverRoomId) ?? tour?.rooms[0] ?? null;
  const photo = tour?.coverUrl ?? room?.previewUrl ?? null;
  return (
    <div className="ah-stack">
      {tour && photo && (
        <>
          <span className="ah-tag" aria-hidden="true">
            <code>&lt;/&gt;</code> Ugrađeno na vaš sajt
          </span>
          <a
            className="ah-win"
            href={tourHref(tour.slug, tour.languages, 'sr')}
            data-track="cta:agency_hero_tour"
            aria-label={`Primer: 360° tura ugrađena u oglas na sajtu agencije. Otvori turu: ${tour.title}`}
          >
            <span className="ah-bar" aria-hidden="true">
              <i />
              <i />
              <i />
              <span className="ah-url">
                <svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                Sajt vaše agencije › Oglas
              </span>
            </span>
            <span className="ah-site" aria-hidden="true">
              <b>Vaša agencija</b>
              <span><i /><i /><i /></span>
            </span>
            <span className="ah-listing" style={{ display: 'block' }}>
              <span className="ah-listing-title" aria-hidden="true">
                <strong>{tour.title}</strong>
                <small>360° tura u oglasu</small>
              </span>
              <span className="ah-embed" style={{ display: 'block' }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- 1200x630 JPG sa CDN-a */}
                <img src={photo} alt="" fetchPriority="high" />
                <span className="ah-360" aria-hidden="true">360°</span>
                <span className="ah-open">
                  <IconPlay /> Kliknite i prošetajte
                </span>
                <span className="ah-credit" aria-hidden="true">Kvadrat360</span>
              </span>
            </span>
          </a>
        </>
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
