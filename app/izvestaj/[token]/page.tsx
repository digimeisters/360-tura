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
          {tour.topRooms.length > 0 && (
            <p className="rep-rooms">
              <span>Najduže gledano:</span>{' '}
              {tour.topRooms.map((r, i) => (
                <span key={r.title + i}>
                  {i > 0 && ' · '}
                  {r.title} <small>({formatDuration(r.avgSeconds)})</small>
                </span>
              ))}
            </p>
          )}
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
          dva puta). „Ušli u turu" su oni koji su pokrenuli obilazak; vreme se meri samo dok je prostorija
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
  .rep-stats small,.rep-rooms small{font-size:12px;font-weight:600;color:#8C8E93;}
  .rep-rooms{margin:12px 0 0;font-size:13.5px;color:#111113;}
  .rep-rooms > span:first-child{color:#5B5D63;}
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
