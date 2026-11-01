import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SITE_URL, CONTACT } from '../../../lib/site';
import { currentMonthKey, monthLabel, parseMonthKey, shiftMonth, type MonthKey } from '../../../lib/agencyReport';
import { buildProjectReport, projectIdFromToken, type ProjectReport, type SaleLine } from '../../../lib/projectReport';
import { formatPrice, srPlural, statusLabel } from '../../../lib/projectI18n';
import type { UnitStatus } from '../../../lib/projects';
import { PrintButton } from '../../[token]/PrintButton';

/**
 * Mesečni izveštaj za investitora: /izvestaj/projekat/<token>?mesec=2026-10
 *
 * Investitor dobija potpisan link (admin projekta → "Izveštaj i upiti" →
 * "Mesečni izveštaj investitoru"), bez prijave. Čita se uživo iz baze, pa
 * tekući mesec pokazuje stanje do danas. Maketa:
 * public/mockup/IzvestajInvestitor.html. Nije za Google.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Izveštaj projekta',
  robots: { index: false, follow: false }
};

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ mesec?: string }>;
};

const MONTH_IN = ['januaru', 'februaru', 'martu', 'aprilu', 'maju', 'junu', 'julu', 'avgustu', 'septembru', 'oktobru', 'novembru', 'decembru'];
const MONTH_OF = ['januara', 'februara', 'marta', 'aprila', 'maja', 'juna', 'jula', 'avgusta', 'septembra', 'oktobra', 'novembra', 'decembra'];
const MONTH_SHORT = ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun', 'jul', 'avg.', 'sep.', 'okt.', 'nov.', 'dec.'];
const MAX_CHIPS = 6;
const TOP_UNITS = 12;
const PILL: Record<UnitStatus, string> = { available: 'free', reserved: 'res', sold: 'sold' };

const monthIndex = (key: MonthKey) => Number(key.split('-')[1]) - 1;
const num = (n: number) => n.toLocaleString('sr-RS');

function UpDown({ now, before, prevOf, kind }: { now: number; before: number | undefined; prevOf: string; kind: 'pct' | 'diff' }) {
  if (before === undefined) return null;
  if (kind === 'pct') {
    if (before === 0) return null;
    const pct = Math.round(((now - before) / before) * 100);
    if (pct === 0) return <div className="ip-d">isto kao prošlog meseca</div>;
    return <div className={`ip-d ${pct > 0 ? 'up' : 'down'}`}>{pct > 0 ? `▲ ${pct}% od ${prevOf}` : `▼ ${-pct}% od ${prevOf}`}</div>;
  }
  const diff = now - before;
  if (diff === 0) return <div className="ip-d">isto kao prošlog meseca</div>;
  return <div className={`ip-d ${diff > 0 ? 'up' : 'down'}`}>{diff > 0 ? `▲ ${diff} više` : `▼ ${-diff} manje`}</div>;
}

function Pill({ status }: { status: UnitStatus }) {
  return <span className={`ip-pill ${PILL[status]}`}>{statusLabel(status, 'sr').toLowerCase()}</span>;
}

const unitLine = (structure: string | null, area: number | null, floor: string | null) =>
  [structure ? `${structure.toLowerCase()}${area ? ` ${num(area)} m²` : ''}` : area ? `${num(area)} m²` : null, floor].filter(Boolean).join(', ');

function SaleItem({ s }: { s: SaleLine }) {
  const d = new Date(s.at);
  const date = `${d.toLocaleString('sr-RS', { timeZone: 'Europe/Belgrade', day: 'numeric' })}. ${MONTH_SHORT[Number(d.toLocaleString('en-US', { timeZone: 'Europe/Belgrade', month: 'numeric' })) - 1]}`;
  const desc = unitLine(s.structure, null, s.floor);
  if (s.kind === 'price') {
    const from = Number(s.from);
    const to = Number(s.to);
    const pct = from > 0 && to > 0 ? Math.round(((to - from) / from) * 100) : null;
    return (
      <li>
        <span>
          <b>{s.code}</b> {desc} · cena promenjena {Number.isFinite(from) ? formatPrice(from, 'sr') : '—'} → {Number.isFinite(to) ? formatPrice(to, 'sr') : '—'} ·{' '}
          {date}
          {s.actor ? ` (${s.actor})` : ''}
        </span>
        <span className="v">{pct !== null && pct !== 0 ? `${pct > 0 ? '+' : '−'}${Math.abs(pct)}%` : ''}</span>
      </li>
    );
  }
  const to = (s.to ?? '') as UnitStatus;
  return (
    <li>
      <span>
        <b>{s.code}</b> {desc} → {PILL[to] ? <Pill status={to} /> : s.to} · {date}
        {s.actor ? ` (${s.actor})` : ''}
      </span>
      <span className="v">{s.price ? formatPrice(s.price, 'sr') : ''}</span>
    </li>
  );
}

function Report({ r, token }: { r: ProjectReport; token: string }) {
  const now = currentMonthKey();
  const m = monthIndex(r.month);
  const prevOf = MONTH_OF[(m + 11) % 12];
  const t = r.totals;

  const chips: MonthKey[] = [];
  for (let k = now; k >= r.firstMonth && chips.length < MAX_CHIPS; k = shiftMonth(k, -1)) chips.unshift(k);
  if (!chips.includes(r.month)) chips.unshift(r.month);

  const maxViews = Math.max(1, ...r.units.map((u) => u.views));
  const structViews = r.structures.reduce((a, s) => a + s.views, 0);
  const maxStruct = Math.max(1, ...r.structures.map((s) => s.views));
  const srcTotal = r.sources.reduce((a, s) => a + s.visitors, 0);
  const maxSrc = Math.max(1, ...r.sources.map((s) => s.visitors));
  const asked = r.structures.filter((s) => s.inquiries > 0);

  return (
    <main className="ip">
      <header className="ip-top">
        <div className="ip-logo">
          {r.logoUrl ? (
            <span className={`ip-dev${r.logoDark ? ' dark' : ''}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- logo investitora sa CDN-a, bilo kog formata */}
              <img src={r.logoUrl} alt={r.developer ?? r.title} />
            </span>
          ) : (
            r.developer && <span className="ip-dev">{r.developer}</span>
          )}
          <small>· izveštaj priprema Kvadrat360</small>
        </div>
        <PrintButton label="Sačuvaj kao PDF" />
      </header>

      <h1>
        {r.title} u <em>{MONTH_IN[m]}</em>
      </h1>
      <p className="ip-sub">
        {t.units} {srPlural(t.units, 'stan', 'stana', 'stanova')} · {t.available} {srPlural(t.available, 'slobodan', 'slobodna', 'slobodnih')} ·{' '}
        <a href={`${SITE_URL}/novogradnja/${r.slug}`} target="_blank" rel="noreferrer">
          strana projekta
        </a>
      </p>
      <nav className="ip-months" aria-label="Mesec">
        {chips.map((k) => (
          <a key={k} href={`/izvestaj/projekat/${token}?mesec=${k}`} className={k === r.month ? 'on' : undefined} aria-current={k === r.month ? 'page' : undefined}>
            {monthLabel(k).replace(/ \d{4}\.$/, '')}
            {k === now ? ' (do danas)' : ''}
          </a>
        ))}
      </nav>

      <section className="ip-kpis">
        <div className="ip-kpi">
          <small>Posetioci projekta</small>
          <b>{num(t.visitors)}</b>
          <UpDown now={t.visitors} before={r.previous?.visitors} prevOf={prevOf} kind="pct" />
        </div>
        <div className="ip-kpi">
          <small>Otvorili karticu stana</small>
          <b>{num(t.unitViews)}</b>
          {t.visitors > 0 && (
            <div className="ip-d">{(t.unitViews / t.visitors).toLocaleString('sr-RS', { maximumFractionDigits: 1 })} stana po posetiocu</div>
          )}
        </div>
        <div className="ip-kpi hl">
          <small>Upiti za stanove</small>
          <b>{num(t.inquiries)}</b>
          <UpDown now={t.inquiries} before={r.previous?.inquiries} prevOf={prevOf} kind="diff" />
        </div>
        <div className="ip-kpi">
          <small>Prodato / rezervisano</small>
          <b>
            {t.sold} / {t.reserved}
          </b>
          <div className="ip-d">iz prodajne table</div>
        </div>
      </section>

      {r.watch.length > 0 && (
        <section className="ip-alert">
          <h2>Gledaju, a ne pitaju</h2>
          <p>
            Ovi stanovi su među najgledanijima, a nisu dobili nijedan upit. Najčešći razlog je cena u odnosu na slične stanove u projektu, ili
            nedostaje tlocrt.
          </p>
          <ul>
            {r.watch.map((u) => (
              <li key={u.code}>
                <b>{u.code}</b> · {unitLine(u.structure, u.areaSqm, u.floor)} · {u.views} {srPlural(u.views, 'pregled', 'pregleda', 'pregleda')}, 0 upita
                {u.reason && <span className="ip-muted"> · {u.reason}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>Najgledaniji stanovi</h2>
        {r.units.length === 0 ? (
          <p className="ip-empty">Ovog meseca nijedan stan nije otvaran.</p>
        ) : (
          <div className="ip-card ip-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Stan</th>
                  <th scope="col">Struktura</th>
                  <th scope="col">Sprat</th>
                  <th scope="col" className="n">
                    Cena
                  </th>
                  <th scope="col">Pregledi</th>
                  <th scope="col" className="n">
                    Upiti
                  </th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {r.units.slice(0, TOP_UNITS).map((u) => (
                  <tr key={u.code}>
                    <td>
                      <b>{u.code}</b>
                    </td>
                    <td>{[u.structure, u.areaSqm ? `${num(u.areaSqm)} m²` : null].filter(Boolean).join(', ') || '—'}</td>
                    <td>{u.floor ?? '—'}</td>
                    <td className="n">{formatPrice(u.price, 'sr')}</td>
                    <td className="ip-views">
                      <span className="ip-bar" style={{ width: `${Math.max(4, Math.round((u.views / maxViews) * 110))}px` }} aria-hidden="true" />
                      {u.views}
                    </td>
                    <td className="n">{u.inquiries}</td>
                    <td>
                      <Pill status={u.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {r.units.length > TOP_UNITS && <p className="ip-hint">Prikazano {TOP_UNITS} najgledanijih od {r.units.length} otvaranih stanova.</p>}
      </section>

      {(r.structures.length > 0 || r.sources.length > 0) && (
        <section className="ip-two">
          {r.structures.length > 0 && (
            <div>
              <h2>Šta kupci traže</h2>
              <div className="ip-card">
                <ul className="ip-bars">
                  {r.structures.map((s, i) => (
                    <li key={s.structure}>
                      <span>{s.structure}</span>
                      <span className="t" aria-hidden="true">
                        <i style={{ width: `${Math.round((s.views / maxStruct) * 100)}%` }} />
                      </span>
                      <span className="v">
                        {structViews ? Math.round((s.views / structViews) * 100) : 0}%{i === 0 && <small> pregleda</small>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              {asked.length > 0 && <p className="ip-hint">Upiti: {asked.map((s) => `${s.structure.toLowerCase()} ${s.inquiries}`).join(', ')}.</p>}
            </div>
          )}
          {r.sources.length > 0 && (
            <div>
              <h2>Odakle dolaze</h2>
              <div className="ip-card">
                <ul className="ip-bars">
                  {r.sources.slice(0, 6).map((s) => (
                    <li key={s.key}>
                      <span>{s.key === 'direktno' ? 'Direktan link' : s.label}</span>
                      <span className="t" aria-hidden="true">
                        <i style={{ width: `${Math.round((s.visitors / maxSrc) * 100)}%` }} />
                      </span>
                      <span className="v">{srcTotal ? Math.round((s.visitors / srcTotal) * 100) : 0}%</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="ip-hint">„Vaš sajt“ = izbor stana ugrađen na sajt investitora.</p>
            </div>
          )}
        </section>
      )}

      <section>
        <h2>Prodaja u {MONTH_IN[m]}</h2>
        {r.sales.length === 0 ? (
          <p className="ip-empty">Ovog meseca na prodajnoj tabli nije bilo promena statusa ni cena.</p>
        ) : (
          <div className="ip-card">
            <ul className="ip-bars ip-sales">
              {r.sales.map((s, i) => (
                <SaleItem key={`${s.code}-${s.at}-${i}`} s={s} />
              ))}
            </ul>
          </div>
        )}
        <p className="ip-hint">Iz prodajne table: svaka promena statusa i cene sa datumom i prodavcem.</p>
      </section>

      <footer className="ip-foot">
        <p>
          <b>Kako se broji:</b> posetilac je jedan otvoren pregledač; „pregled“ je otvaranje kartice stana na izboru stana (i na vašem sajtu). Posete
          investitora, prodavaca i naše se ne broje. Ne beležimo lične podatke posetilaca.
        </p>
        <p>
          Kvadrat360 · {CONTACT.phoneDisplay} · {CONTACT.email}
        </p>
      </footer>
    </main>
  );
}

const STYLES = `
  body{background:#F7F7F4;}
  .ip{--accent:#1E5AA8;--soft:#EAF1FB;--muted:#5B5D63;--faint:#8C8E93;--line:#E4E4DE;max-width:960px;margin:0 auto;padding:28px 20px 60px;font-family:var(--font-body);color:#111113;}
  .ip-top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;}
  .ip-logo{display:flex;align-items:center;gap:10px;font-weight:800;}
  .ip-dev{display:inline-flex;align-items:center;background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 12px;font-family:var(--font-display);font-size:15px;}
  .ip-dev.dark{background:#111113;border-color:#111113;}
  .ip-dev img{display:block;height:28px;width:auto;max-width:160px;object-fit:contain;}
  .ip-logo small{color:var(--faint);font-weight:600;}
  .rep-btn{border:1px solid #D3D3CB;background:#fff;border-radius:999px;padding:8px 16px;font:inherit;font-size:13.5px;font-weight:700;cursor:pointer;}
  .rep-btn:hover{border-color:var(--accent);color:var(--accent);}
  .ip h1{font-family:var(--font-display);font-size:clamp(26px,5vw,32px);line-height:1.1;margin:18px 0 4px;letter-spacing:-.02em;}
  .ip h1 em{font-family:var(--font-serif);font-style:italic;font-weight:500;color:var(--accent);white-space:nowrap;}
  .ip-sub{color:var(--muted);margin:0 0 6px;}
  .ip-sub a{color:inherit;}
  .ip-months{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0 22px;}
  .ip-months a{border:1px solid var(--line);border-radius:999px;padding:5px 12px;font-size:13px;font-weight:600;background:#fff;color:var(--muted);text-decoration:none;}
  .ip-months a:hover{border-color:var(--accent);color:var(--accent);}
  .ip-months a.on{background:#111113;color:#fff;border-color:#111113;}
  .ip-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:28px;}
  .ip-kpi{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px;}
  .ip-kpi small{display:block;color:var(--muted);font-weight:700;font-size:12.5px;}
  .ip-kpi b{display:block;font-size:34px;line-height:1.1;margin-top:4px;font-family:var(--font-display);font-variant-numeric:tabular-nums;}
  .ip-kpi.hl{background:var(--soft);border-color:#cfe0f5;}
  .ip-kpi.hl b{color:var(--accent);}
  .ip-d{font-size:12.5px;font-weight:700;margin-top:4px;color:var(--muted);}
  .ip-d.up{color:#15803d;}
  .ip-d.down{color:#b91c1c;}
  .ip h2{font-family:var(--font-display);font-size:21px;margin:0 0 12px;}
  .ip section{margin-bottom:30px;}
  .ip-card{background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden;}
  .ip-scroll{overflow-x:auto;}
  .ip table{width:100%;border-collapse:collapse;font-size:14px;}
  .ip th{text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);padding:10px 12px;border-bottom:1px solid var(--line);white-space:nowrap;}
  .ip td{padding:11px 12px;border-bottom:1px solid var(--line);white-space:nowrap;}
  .ip tbody tr:last-child td{border-bottom:0;}
  .ip td.n,.ip th.n{text-align:right;font-variant-numeric:tabular-nums;}
  .ip-views{font-variant-numeric:tabular-nums;}
  .ip-bar{display:inline-block;height:8px;border-radius:99px;background:var(--accent);vertical-align:middle;margin-right:8px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .ip-pill{font-size:11.5px;font-weight:700;border-radius:99px;padding:2px 9px;white-space:nowrap;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .ip-pill.free{background:#DCFCE7;color:#15803d;}
  .ip-pill.res{background:#FEF3C7;color:#92400e;}
  .ip-pill.sold{background:#F1F1F3;color:#6B6D72;}
  .ip-alert{background:#FFF7ED;border:1px solid #FED7AA;border-radius:16px;padding:16px;}
  .ip-alert h2{color:#9a3412;}
  .ip-alert p{margin:0 0 10px;color:#7c2d12;font-size:14px;line-height:1.55;}
  .ip-alert ul{margin:0;padding-left:18px;font-size:14px;line-height:1.7;}
  .ip-muted{color:var(--muted);}
  .ip-two{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
  @media (max-width:720px){.ip-two{grid-template-columns:1fr;}}
  .ip-bars{list-style:none;margin:0;padding:14px;display:grid;gap:9px;}
  .ip-bars li{display:grid;grid-template-columns:minmax(90px,120px) 1fr 74px;gap:10px;align-items:center;font-size:13.5px;}
  .ip-bars .t{height:10px;border-radius:99px;background:#EEF0F3;overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .ip-bars .t i{display:block;height:100%;background:var(--accent);border-radius:99px;}
  .ip-bars .v{text-align:right;font-weight:700;white-space:nowrap;}
  .ip-bars .v small{color:var(--faint);font-weight:500;}
  .ip-sales li{grid-template-columns:1fr auto;line-height:1.5;}
  .ip-hint{font-size:12.5px;color:var(--muted);margin:8px 0 0;line-height:1.5;}
  .ip-empty{font-size:14px;color:var(--faint);margin:0;}
  .ip-foot{font-size:12.5px;color:var(--muted);line-height:1.6;border-top:1px solid var(--line);padding-top:14px;}
  .ip-foot p{margin:0 0 6px;}
  @media print{
    .rep-btn,.ip-months a:not(.on){display:none;}
    .ip{padding:0;}
    .ip-card,.ip-alert,section{break-inside:avoid;}
  }
`;

export default async function ProjectReportPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { mesec } = await searchParams;

  const projectId = projectIdFromToken(token);
  if (!projectId) notFound();

  const now = currentMonthKey();
  const requested = parseMonthKey(mesec);
  const month = requested && requested <= now ? requested : now;

  const report = await buildProjectReport(projectId, month);
  if (!report) notFound();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <Report r={report} token={token} />
    </>
  );
}
