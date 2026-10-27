import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Logo } from '../../tour/[slug]/Logo';
import { SITE_URL, CONTACT } from '../../lib/site';
import {
  agencyFromToken,
  buildAgencyReport,
  currentMonthKey,
  monthLabel,
  parseMonthKey,
  shiftMonth,
  type AgencyReport,
  type TourReport
} from '../../lib/agencyReport';
import type { HeatInsight, RoomHeat } from '../../lib/roomHeat';
import { PrintButton } from './PrintButton';

/**
 * Mesečni izveštaj za agenciju: /izvestaj/<token>?mesec=2026-09
 *
 * Agencija dobija tajni link (admin → Ture → "Izveštaji za agencije"); vidi
 * samo svoje ture. Strana se čita uživo iz baze pri svakom otvaranju, pa
 * tekući mesec uvek pokazuje stanje do tog trenutka. Nije za Google.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Izveštaj o posetama',
  robots: { index: false, follow: false }
};

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ mesec?: string }>;
};

const STATUS_LABELS: Record<string, string> = {
  rented: 'izdato',
  sold: 'prodato',
  paused: 'pauzirano'
};

function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m} min ${String(s).padStart(2, '0')} s` : `${s} s`;
}

/** "+40% u odnosu na avgust" - samo kad je prethodni mesec imao podatke. */
function Change({ now, before, prevLabel }: { now: number; before: number | undefined; prevLabel: string }) {
  if (before === undefined) return null;
  // Iz nule nema smislenog procenta ("+∞%") - tada se poređenje ne prikazuje.
  if (before === 0) return null;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return <span className="rep-delta">isto kao {prevLabel}</span>;
  return (
    <span className={`rep-delta ${pct > 0 ? 'up' : 'down'}`}>
      {pct > 0 ? '+' : ''}
      {pct}% u odnosu na {prevLabel}
    </span>
  );
}

// Boja mrlje: malo pogledano (svetlo žuto) → svi pogledali (crveno).
const HEAT_STOPS: [number, number, number][] = [
  [253, 233, 168],
  [245, 158, 11],
  [220, 38, 38]
];

function heatColor(pct: number): string {
  const p = Math.min(Math.max(pct, 0), 100) / 100;
  const [a, b, k] = p < 0.5 ? [HEAT_STOPS[0], HEAT_STOPS[1], p * 2] : [HEAT_STOPS[1], HEAT_STOPS[2], (p - 0.5) * 2];
  return a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',');
}

function insightText(i: HeatInsight): React.ReactNode {
  if (i.kind === 'hidden-gem') {
    return (
      <>
        <b>
          {i.room}: vidi je samo {i.seenPct}% kupaca
        </b>
        , a oni koji je vide obično ostanu {formatDuration(i.typicalSeconds)}. Vredi je pokazati ranije u turi ili na
        naslovnoj slici.
      </>
    );
  }
  return (
    <>
      <b>{i.exitPct}% kupaca zatvori turu već u prvoj prostoriji</b> ({i.room}). Jači prvi kadar ili druga početna
      prostorija može da ih zadrži duže.
    </>
  );
}

/** "Kako kupci gledaju turu": tlocrt sa mrljama, tabela prostorija i zaključci. */
function RoomHeatSection({ heat, floorplanUrl }: { heat: RoomHeat; floorplanUrl: string | null }) {
  const spots = heat.rows.filter((r) => r.x !== null && r.y !== null && r.seenPct > 0);
  return (
    <section className="rep-heat">
      <div className="rep-heat-head">
        <h4>Kako kupci gledaju turu</h4>
        <span className="rep-heat-legend">
          malo <i aria-hidden="true" /> svi pogledali
        </span>
      </div>
      {heat.insights.map((i) => (
        <p key={i.kind} className="rep-insight">
          {insightText(i)}
        </p>
      ))}
      <div className={`rep-heat-body${floorplanUrl && spots.length ? '' : ' no-plan'}`}>
        {floorplanUrl && spots.length > 0 && (
          <div className="rep-plan">
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG tlocrt sa CDN-a, tačke su u % ove slike */}
            <img src={floorplanUrl} alt="Tlocrt" />
            {spots.map((r) => {
              const c = heatColor(r.seenPct);
              return (
                <div
                  key={r.id}
                  className="rep-spot"
                  style={{
                    left: `${r.x}%`,
                    top: `${r.y}%`,
                    width: `${8 + r.seenPct * 0.09}%`,
                    background: `radial-gradient(circle, rgba(${c},.85) 0%, rgba(${c},.55) 45%, rgba(${c},0) 72%)`
                  }}
                >
                  <b>{r.seenPct}%</b>
                  {r.id === heat.exitRoomId && <em>↩ ovde odustaje {r.exitPct}%</em>}
                </div>
              );
            })}
          </div>
        )}
        <table className="rep-heat-table">
          <thead>
            <tr>
              <th scope="col">Prostorija</th>
              <th scope="col">Pogledalo</th>
              <th scope="col">Prosečno</th>
              <th scope="col">Izašli tu</th>
            </tr>
          </thead>
          <tbody>
            {heat.rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.title}
                  <span className="rep-bar" aria-hidden="true">
                    <i style={{ width: `${r.seenPct}%`, background: `rgb(${heatColor(r.seenPct)})` }} />
                  </span>
                </td>
                <td>
                  <b>{r.seenPct}%</b>
                </td>
                <td>{formatDuration(r.avgSeconds)}</td>
                <td className={r.id === heat.exitRoomId ? 'exit' : undefined}>{r.exitPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="rep-heat-foot">
        Na osnovu {heat.viewers} kupaca za koje imamo podatke o prostorijama. „Pogledalo“ je deo njih koji je otvorio
        prostoriju, a „Izašli tu“ deo koji je baš tu zatvorio turu.
      </p>
    </section>
  );
}

function Kpi({ label, value, hint, children }: { label: string; value: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="rep-kpi">
      <span className="rep-kpi-label">{label}</span>
      <b className="rep-kpi-value">{value}</b>
      {hint && <span className="rep-kpi-hint">{hint}</span>}
      {children}
    </div>
  );
}

function TourCard({ tour }: { tour: TourReport }) {
  const inactive = tour.status && tour.status !== 'active' ? STATUS_LABELS[tour.status] ?? tour.status : null;
  return (
    <article className="rep-tour">
      <header className="rep-tour-head">
        <h3>
          <a href={`${SITE_URL}/tour/${tour.slug}`} target="_blank" rel="noreferrer">
            {tour.title}
          </a>
        </h3>
        {(inactive || !tour.published) && <span className="rep-badge">{inactive ?? 'nije objavljena'}</span>}
      </header>
      {tour.visitors === 0 ? (
        <p className="rep-empty">Ovog meseca tura nije otvarana.</p>
      ) : (
        <>
          <dl className="rep-stats">
            <div>
              <dt>Posetioci</dt>
              <dd>{tour.visitors}</dd>
            </div>
            <div>
              <dt>Ušli u turu</dt>
              <dd>
                {tour.entered} <small>({tour.enterRate}%)</small>
              </dd>
            </div>
            <div>
              <dt>Prosečno vreme</dt>
              <dd>{formatDuration(tour.avgSeconds)}</dd>
            </div>
            <div>
              <dt>Strani jezik</dt>
              <dd>{tour.foreignVisitors}</dd>
            </div>
            <div>
              <dt>Otvorili kontakt</dt>
              <dd>{tour.contactClicks}</dd>
            </div>
            <div>
              <dt>Zahtevi za razgledanje</dt>
              <dd>{tour.viewingRequests}</dd>
            </div>
            <div>
              <dt>Podelili link</dt>
              <dd>{tour.shares}</dd>
            </div>
          </dl>
          {tour.heat && <RoomHeatSection heat={tour.heat} floorplanUrl={tour.floorplanUrl} />}
        </>
      )}
    </article>
  );
}

function Report({ report, token }: { report: AgencyReport; token: string }) {
  const now = currentMonthKey();
  const prevKey = shiftMonth(report.month, -1);
  const nextKey = shiftMonth(report.month, 1);
  const prevLabel = monthLabel(prevKey).replace(/ \d{4}\.$/, '').toLowerCase();
  const hasPrev = prevKey >= report.firstMonth;
  const hasNext = nextKey <= now;
  const href = (key: string) => `/izvestaj/${token}?mesec=${key}`;
  const t = report.totals;

  return (
    <main className="rep">
      <header className="rep-top">
        <Logo />
        <PrintButton label="Sačuvaj kao PDF" />
      </header>

      <section className="rep-title">
        <span className="rep-eyebrow">Izveštaj o posetama virtuelnih tura</span>
        <h1>{report.agency}</h1>
        <nav className="rep-months" aria-label="Mesec">
          {hasPrev ? <a href={href(prevKey)}>← {monthLabel(prevKey)}</a> : <span />}
          <b>{monthLabel(report.month)}</b>
          {hasNext ? <a href={href(nextKey)}>{monthLabel(nextKey)} →</a> : <span />}
        </nav>
        {report.month === now && <p className="rep-note">Tekući mesec — brojevi do danas.</p>}
      </section>

      <section className="rep-kpis">
        <Kpi label="Posetioci" value={String(t.visitors)} hint="različiti ljudi koji su otvorili link">
          <Change now={t.visitors} before={report.previous?.visitors} prevLabel={prevLabel} />
        </Kpi>
        <Kpi
          label="Ušli u turu"
          value={String(t.entered)}
          hint={t.visitors ? `${Math.round((t.entered / t.visitors) * 100)}% posetilaca` : undefined}
        />
        <Kpi label="Prosečno vreme u turi" value={formatDuration(t.avgSeconds)} hint="po posetiocu koji je ušao" />
        <Kpi label="Na stranom jeziku" value={String(t.foreignVisitors)} hint="EN, DE ili RU" />
        <Kpi label="Otvorili kontakt" value={String(t.contactClicks)}>
          <Change now={t.contactClicks} before={report.previous?.contactClicks} prevLabel={prevLabel} />
        </Kpi>
        <Kpi label="Zahtevi za razgledanje" value={String(t.viewingRequests)} hint="poslati iz same ture">
          <Change now={t.viewingRequests} before={report.previous?.viewingRequests} prevLabel={prevLabel} />
        </Kpi>
      </section>

      <section className="rep-tours">
        <h2>Po turama</h2>
        {report.tours.map((tour) => (
          <TourCard key={tour.slug} tour={tour} />
        ))}
      </section>

      <footer className="rep-foot">
        <p>
          <b>Kako se broji:</b> posetilac je jedan otvoren pregledač (isti čovek na telefonu i računaru broji se
          dva puta). „Ušli u turu“ su oni koji su pokrenuli obilazak; vreme se meri samo dok je prostorija
          na ekranu, najviše 5 minuta po jednom gledanju prostorije (da ostavljen otvoren tab ne naduva
          prosek). Ne beležimo nikakve lične podatke posetilaca.
          {report.truncated && ' Ovog meseca je bilo više događaja nego što izveštaj čita odjednom - prikazani su najnoviji.'}
        </p>
        <p>
          Kvadrat360 · {CONTACT.phoneDisplay} · {CONTACT.email}
        </p>
      </footer>
    </main>
  );
}

const STYLES = `
  .rep{--ink:#111113;--accent:#1E5AA8;max-width:880px;margin:0 auto;padding:24px 20px 48px;font-family:var(--font-body);color:#111113;background:#FAFAF7;}
  body{background:#FAFAF7;}
  .rep-top{display:flex;align-items:center;justify-content:space-between;gap:12px;}
  .rep-btn{border:1px solid #D3D3CB;background:#fff;border-radius:999px;padding:8px 16px;font:inherit;font-size:13.5px;font-weight:700;cursor:pointer;}
  .rep-btn:hover{border-color:#1E5AA8;color:#1E5AA8;}
  .rep-title{margin:28px 0 20px;}
  .rep-eyebrow{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#1E5AA8;}
  .rep-title h1{font-family:var(--font-display);font-size:clamp(26px,5vw,34px);line-height:1.15;margin:6px 0 14px;}
  .rep-months{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;font-size:14px;}
  .rep-months b{font-size:16px;}
  .rep-months a{color:#5B5D63;text-decoration:none;}
  .rep-months a:hover{color:#1E5AA8;}
  .rep-months a:last-child{text-align:right;}
  .rep-note{margin:8px 0 0;font-size:13px;color:#8C8E93;text-align:center;}
  .rep-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:32px;}
  .rep-kpi{background:#fff;border:1px solid #E4E4DE;border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:3px;}
  .rep-kpi-label{font-size:12.5px;color:#5B5D63;font-weight:600;}
  .rep-kpi-value{font-family:var(--font-display);font-size:clamp(22px,6vw,28px);line-height:1.1;font-variant-numeric:tabular-nums;}
  .rep-kpi-hint{font-size:12px;color:#8C8E93;}
  .rep-delta{font-size:12px;font-weight:700;color:#5B5D63;}
  .rep-delta.up{color:#16a34a;}
  .rep-delta.down{color:#b45309;}
  .rep-tours h2{font-family:var(--font-display);font-size:20px;margin:0 0 12px;}
  .rep-tour{background:#fff;border:1px solid #E4E4DE;border-radius:14px;padding:16px 18px;margin-bottom:12px;break-inside:avoid;}
  .rep-tour-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;}
  .rep-tour-head h3{margin:0;font-size:16px;line-height:1.3;}
  .rep-tour-head a{color:inherit;text-decoration:none;}
  .rep-tour-head a:hover{color:#1E5AA8;}
  .rep-badge{font-size:11.5px;font-weight:700;color:#5B5D63;background:#F1F1EC;border-radius:999px;padding:3px 10px;}
  .rep-empty{margin:8px 0 0;font-size:14px;color:#8C8E93;}
  .rep-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:10px 16px;margin:12px 0 0;}
  .rep-stats dt{font-size:12px;color:#5B5D63;}
  .rep-stats dd{margin:2px 0 0;font-size:18px;font-weight:700;font-variant-numeric:tabular-nums;}
  .rep-stats small{font-size:12px;font-weight:600;color:#8C8E93;}
  .rep-heat{margin-top:16px;padding-top:14px;border-top:1px solid #E4E4DE;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .rep-heat-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;}
  .rep-heat-head h4{margin:0;font-family:var(--font-display);font-size:16px;}
  .rep-heat-legend{display:flex;align-items:center;gap:8px;font-size:11.5px;color:#5B5D63;}
  .rep-heat-legend i{display:block;width:80px;height:8px;border-radius:99px;background:linear-gradient(90deg,#FDE9A8,#F59E0B,#DC2626);}
  .rep-insight{margin:10px 0 0;padding:10px 12px;border-radius:10px;background:#EEF4FC;font-size:13.5px;line-height:1.5;}
  .rep-insight b{color:#1E5AA8;}
  .rep-heat-body{display:grid;grid-template-columns:1fr;gap:14px;margin-top:12px;align-items:start;}
  @media (min-width:720px){.rep-heat-body:not(.no-plan){grid-template-columns:1.05fr 1fr;}}
  .rep-plan{position:relative;border:1px solid #E4E4DE;border-radius:12px;overflow:hidden;background:#fff;}
  .rep-plan img{display:block;width:100%;height:auto;}
  .rep-spot{position:absolute;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;pointer-events:none;}
  .rep-spot b{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-family:var(--font-display);font-weight:800;font-size:12px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.45);white-space:nowrap;}
  .rep-spot em{position:absolute;left:50%;top:calc(50% + 11px);transform:translateX(-50%);font-style:normal;font-weight:700;font-size:10px;color:#fff;background:#111113;border-radius:99px;padding:1px 6px;white-space:nowrap;}
  .rep-heat-table{width:100%;border-collapse:collapse;font-size:13px;}
  .rep-heat-table th{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#8C8E93;text-align:right;padding:0 6px 6px;}
  .rep-heat-table th:first-child,.rep-heat-table td:first-child{text-align:left;}
  .rep-heat-table td{padding:7px 6px;border-top:1px solid #F0F0EA;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;}
  .rep-heat-table td:first-child{white-space:normal;}
  .rep-heat-table td.exit{color:#b45309;font-weight:700;}
  .rep-bar{display:block;position:relative;height:6px;border-radius:99px;background:#F1F1EC;margin-top:4px;}
  .rep-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:99px;}
  .rep-heat-foot{margin:10px 0 0;font-size:12px;line-height:1.5;color:#5B5D63;}
  .rep-foot{margin-top:28px;font-size:12.5px;line-height:1.55;color:#5B5D63;}
  .rep-foot p{margin:0 0 6px;}
  @media print{
    .rep-btn,.rep-months a{display:none;}
    .rep{padding:0;}
    .rep-kpi,.rep-tour{border-color:#ccc;}
  }
`;

export default async function AgencyReportPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { mesec } = await searchParams;

  const agency = agencyFromToken(token);
  if (!agency) notFound();

  const now = currentMonthKey();
  const requested = parseMonthKey(mesec);
  const month = requested && requested <= now ? requested : now;

  const report = await buildAgencyReport(agency, month);
  if (!report) notFound();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <Report report={report} token={token} />
    </>
  );
}
