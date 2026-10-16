import type { Metadata } from 'next';
import Link from 'next/link';
import SiteTracker from '../../../components/SiteTracker';
import SiteStylesheets from '../../../components/SiteStylesheets';
import { SiteFooter } from '../../../components/SiteChrome';
import AreaPriceChart from '../../../components/alati/AreaPriceChart';
import { ToolCrossLink, ToolCta, ToolExplain, ToolFaq, ToolsNav } from '../../../components/alati/ToolSections';
import { TOOLS_STYLES } from '../../../components/alati/toolsStyles';
import { accent } from '../../lib/accent';
import { HOME_COPY } from '../../lib/homeCopy';
import { SITE_NAME, SITE_URL } from '../../lib/site';
import { serializeJsonLd } from '../../lib/structuredData';
import { cityAverage, CITY_ROW, FEW_LISTINGS, getAreaPrices, type AreaPrice } from '../../lib/valuation/areaPrices';
import { VALUATION_HREF } from '../toolsNav';

/**
 * Cene nekretnina po naseljima Kragujevca (/alati/cene-nekretnina-kragujevac):
 * isti redovi iz kojih računa procena vrednosti (zone_price_baselines,
 * cene: npm run prices:refresh, broj oglasa: migracija 031). Brojevi u
 * tekstu (kartice, pitanja) se računaju iz baze, nijedan nije upisan rukom.
 * Novogradnja i starogradnja su zajedno - to strana jasno kaže.
 */

const PATH = '/alati/cene-nekretnina-kragujevac';
const CALC_HREF = '/alati/kalkulator-kredita';

// Cene se menjaju na svaka dva meseca, ali strana jednom dnevno ponovo čita
// bazu, da posle upisa novih cena ne kasni za procenom vrednosti (jedno
// čitanje baze dnevno, bez troška).
export const revalidate = 86400;

const fmt = (n: number, digits = 0) => n.toLocaleString('sr-RS', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const r10 = (n: number) => fmt(Math.round(n / 10) * 10);
const NB = ' ';

const TYPE_LABEL = { apartment: 'Stanovi', house: 'Kuće', commercial: 'Lokali' } as const;
const KIND_LABEL = { sale: 'prodaja', rent: 'izdavanje' } as const;

const COPY = {
  meta: {
    title: 'Cene stanova u Kragujevcu po naseljima (cena kvadrata) | Kvadrat360',
    description:
      'Koliko košta kvadrat stana, kuće i lokala u Centru, na Bubnju, Erdogliji, Aerodromu i ostalim naseljima Kragujevca, i kolika je kirija. Raspon iz javnih oglasa, osvežen na svaka dva meseca.'
  },
  hero: {
    crumb: 'Cene po naseljima',
    titleStart: 'Cene stanova u Kragujevcu ',
    titleEm: 'po naseljima.',
    lede: 'Koliko košta kvadrat stana, kuće i lokala u svakom naselju, i kolika je kirija. Raspon procenjenih prodajnih cena, osvežen na svaka dva meseca.',
    mixTitle: 'Novogradnja i starogradnja zajedno.',
    mixText:
      'Cene su iz svih oglasa u naselju, bez obzira na godinu gradnje. Stan u novogradnji je obično pri vrhu raspona ili iznad njega, a stariji stan za renoviranje pri dnu.',
    // Kad baza ima posebne cene (migracija 032 + osvežavanje od 16. 10. 2026).
    splitTitle: 'Stanovi: novogradnja i starogradnja posebno.',
    splitText:
      'Stan je novogradnja ako oglas kaže „Novo“ ili „U izgradnji“, ako je zgrada iz 2018. ili novija, ili ako ga prodaje investitor iz projekta. Kuće, lokali i kirije su zajedno, jer novih ima premalo za poseban raspon.'
  },
  chart: {
    eyebrow: 'Po naseljima',
    title: 'Gde je kvadrat *najskuplji?*',
    note: 'Svaka traka je raspon cene po m² u naselju: od povoljnijih do tipičnih nekretnina. Upišite veličinu i odmah vidite cenu cele nekretnine; klik na naselje otvara procenu baš za njega.'
  },
  method: {
    eyebrow: 'Kako računamo',
    title: 'Brojevi iz oglasa, *spušteni ka stvarnim.*',
    note: 'Ne izmišljamo cene. Evo kako nastaje svaka traka.',
    items: [
      {
        title: 'Javni oglasi za Kragujevac',
        text: 'Brojimo oglase po naseljima, posebno za prodaju i izdavanje stanova, kuća i lokala. Oglasi sa greškom (cena u dinarima, pogrešna kvadratura) se odbacuju.'
      },
      {
        title: 'Tražena cena nije prodajna',
        text: 'Oglasi su ono što vlasnici traže, a nekretnine se prodaju jeftinije. Zato je raspon prodaje spušten ispod oglasnih cena. Kirije su kakve su u oglasima.'
      },
      {
        title: 'Ista ulica se broji jednom',
        text: 'Kad isti prodavac oglasi više stanova ili lokala u istoj zgradi, to je jedan glas, ne pet. Naselje se prikazuje tek uz dovoljno nezavisnih oglasa: stanovi bar 5, kuće i lokali bar 10.'
      },
      {
        title: 'Novogradnja i starogradnja zajedno',
        text: 'Oglasi ne odvajaju pouzdano novogradnju od starijih zgrada, a novogradnje po naselju ima premalo za poseban raspon. U proceni vrednosti novogradnja dobija +15%, a nekretnina za renoviranje −15%.'
      }
    ],
    // Četvrta kartica kad su cene stanova razdvojene.
    splitItem: {
      title: 'Novogradnja posebno',
      text: 'Za stanove na prodaju čitamo „Stanje“ i godinu gradnje iz svakog oglasa; projekat investitora je jedan glas. Naselje dobija poseban raspon tek uz bar 8 takvih oglasa, inače važi prosek grada. Oglas bez tih podataka ne ulazi ni u jednu grupu.'
    }
  },
  cta: {
    title: 'Koliko vredi *baš vaš stan?*',
    points: ['Sprat, stanje, parking, terasa', 'Prodaja ili kirija', 'Za 90 sekundi'],
    button: 'Procenite nekretninu'
  },
  other: { title: 'Kupujete?', text: 'Izračunajte ratu, troškove notara i povrat PDV-a za prvi stan.', link: 'Kalkulator kredita →' },
  footer: HOME_COPY.sr.footer
};

export const metadata: Metadata = {
  title: { absolute: COPY.meta.title },
  description: COPY.meta.description,
  alternates: { canonical: PATH },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: PATH,
    title: COPY.meta.title,
    description: COPY.meta.description,
    locale: 'sr_RS'
  }
};

/** Naselja sa najvećom/najmanjom vrednošću - više njih kad su izjednačena. */
function extreme(rows: AreaPrice[], pick: (r: AreaPrice) => number, dir: 1 | -1) {
  const best = Math.max(...rows.map((r) => dir * pick(r))) * dir;
  return { names: rows.filter((r) => pick(r) === best).map((r) => r.neighborhood), value: best };
}

const joinNames = (names: string[]) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} i ${names[names.length - 1]}` : names[0]);

export default async function AreaPricesPage() {
  const rows = await getAreaPrices();
  // Prodaja stanova je podeljena na novo/staro kad baza ima oba (migracija 032).
  const split = rows.some((r) => r.build === 'new') && rows.some((r) => r.build === 'old');
  const hoods = rows.filter((r) => r.neighborhood !== CITY_ROW);
  const of = (t: AreaPrice['type'], k: AreaPrice['kind'], b: AreaPrice['build'] = 'any') =>
    hoods.filter((r) => r.type === t && r.kind === k && r.build === b);
  const wholeCity = (t: AreaPrice['type'], k: AreaPrice['kind'], b: AreaPrice['build']) => {
    const row = rows.find((r) => r.neighborhood === CITY_ROW && r.type === t && r.kind === k && r.build === b);
    return row ? { low: row.low, high: row.high, listings: row.listings ?? 0 } : cityAverage(of(t, k, b));
  };

  const aptSale = of('apartment', 'sale', split ? 'old' : 'any');
  const aptRent = of('apartment', 'rent');
  const avg = wholeCity('apartment', 'sale', split ? 'old' : 'any');
  const avgNew = split ? wholeCity('apartment', 'sale', 'new') : null;
  const top = aptSale.length ? extreme(aptSale, (r) => r.high, 1) : null;
  const low = aptSale.length ? extreme(aptSale, (r) => r.low, -1) : null;
  const centerRent = aptRent.find((r) => r.neighborhood === 'Centar') ?? null;
  // Red "Ceo grad" ponavlja oglase naselja, pa se ne broji.
  const listings = hoods.filter((r) => r.source === 'ads').reduce((s, r) => s + (r.listings ?? 0), 0);
  const latest = rows.reduce((d, r) => (r.updatedAt > d ? r.updatedAt : d), '');
  const updated = latest ? new Date(latest).toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const month = latest ? new Date(latest).toLocaleDateString('sr-Latn-RS', { month: 'long', year: 'numeric' }) : null;

  // Pitanja sa odgovorima iz baze (i za Google, FAQ JSON-LD).
  const faq = [
    ...(avg && top && low
      ? [
          {
            q: 'Koliko košta kvadrat stana u Kragujevcu?',
            a: avgNew
              ? `Stan u starogradnji u proseku oko ${r10(avg.low)}–${r10(avg.high)} € po m², u novogradnji oko ${r10(avgNew.low)}–${r10(avgNew.high)} €. Najskuplja starogradnja je ${joinNames(top.names)} (do ${fmt(top.value)}${NB}€/m²), a najpovoljnija ${joinNames(low.names)} (od ${fmt(low.value)}${NB}€/m²). To su procenjene prodajne cene, malo ispod traženih u oglasima.`
              : `Prosek grada je oko ${r10(avg.low)}–${r10(avg.high)} € po m². Najskuplje je ${joinNames(top.names)} (do ${fmt(top.value)}${NB}€/m²), a najpovoljnije ${joinNames(low.names)} (od ${fmt(low.value)}${NB}€/m²). To su procenjene prodajne cene, malo ispod traženih u oglasima.`
          }
        ]
      : []),
    ...(centerRent
      ? [
          {
            q: 'Kolika je kirija za stan u Kragujevcu?',
            a: `U Centru oko ${fmt(centerRent.low, 1)}–${fmt(centerRent.high, 1)} € po m² mesečno za namešten stan, što je za stan od 50${NB}m² oko ${fmt(Math.round(centerRent.low * 50))}–${fmt(Math.round(centerRent.high * 50))} € mesečno. U ostalim naseljima pogledajte grafikon (Izdavanje).`
          }
        ]
      : []),
    {
      q: 'Da li su ovo cene novogradnje ili starogradnje?',
      a: split
        ? `Za stanove na prodaju posebno: prekidač Starogradnja / Novogradnja iznad grafikona. ${COPY.hero.splitText}`
        : 'Obe zajedno. Cene su iz svih oglasa u naselju, bez obzira na godinu gradnje. Stan u novogradnji je obično pri vrhu raspona ili iznad njega, a stariji stan za renoviranje pri dnu.'
    },
    {
      q: 'Zašto mog naselja nema?',
      a: 'Naselje se prikazuje tek uz dovoljno nezavisnih oglasa (stanovi bar 5, kuće i lokali bar 10). Sa manje oglasa raspon bi bio nagađanje. Procena vrednosti za takvo naselje računa iz proseka grada.'
    },
    {
      q: 'Koliko često se cene osvežavaju?',
      a: `Na svaka dva meseca, iz novih oglasa.${updated ? ` Poslednje osvežavanje: ${updated}.` : ''}`
    }
  ];

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'Cene nekretnina po naseljima Kragujevca',
      description: COPY.meta.description,
      url: `${SITE_URL}${PATH}`,
      inLanguage: 'sr',
      isAccessibleForFree: true,
      spatialCoverage: { '@type': 'Place', name: 'Kragujevac, Srbija' },
      ...(latest ? { dateModified: latest } : {}),
      creator: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      variableMeasured: ['Cena po m² (€)', 'Kirija po m² mesečno (€)']
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Alati', item: `${SITE_URL}/alati` },
        { '@type': 'ListItem', position: 2, name: COPY.hero.crumb, item: `${SITE_URL}${PATH}` }
      ]
    }
  ];

  const BUILD_LABEL = { new: ', novogradnja', old: ', starogradnja', any: '' } as const;
  const groups = (['apartment', 'house', 'commercial'] as const).flatMap((t) =>
    (['sale', 'rent'] as const).flatMap((k) =>
      (split && t === 'apartment' && k === 'sale' ? (['old', 'new'] as const) : (['any'] as const))
        .map((b) => ({ t, k, b, list: of(t, k, b).sort((x, y) => y.low + y.high - (x.low + x.high)) }))
        .filter((g) => g.list.length)
    )
  );

  return (
    <div lang="sr" style={{ display: 'contents' }}>
      <SiteStylesheets />
      <style dangerouslySetInnerHTML={{ __html: TOOLS_STYLES + PAGE_STYLES }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <SiteTracker />

      <ToolsNav />

      <main>
        <div className="wrap">
          <section className="tl-hero">
            <p className="tl-crumb">
              <Link href="/alati">Alati</Link> › {COPY.hero.crumb}
            </p>
            <span className="chip">
              <span className="dot" />
              {[month ? month[0].toUpperCase() + month.slice(1) : null, listings ? `iz ${fmt(listings)} javnih oglasa` : null].filter(Boolean).join(' · ')}
            </span>
            <h1>
              {COPY.hero.titleStart}
              <em>{COPY.hero.titleEm}</em>
            </h1>
            <p className="lede">{COPY.hero.lede}</p>
            <p className="ap-mix">
              <b>{split ? COPY.hero.splitTitle : COPY.hero.mixTitle}</b> {split ? COPY.hero.splitText : COPY.hero.mixText}
            </p>
          </section>

          {avg && top && low && (
            <div className="ap-tiles">
              <div className="ap-tile">
                <small>{avgNew ? 'Starogradnja, prosek grada' : 'Stan, prosek grada'}</small>
                <b>
                  {r10(avg.low)}–{r10(avg.high)} €
                </b>
                <span>po m², iz {fmt(avg.listings)} oglasa</span>
              </div>
              {avgNew && (
                <div className="ap-tile">
                  <small>Novogradnja, prosek grada</small>
                  <b>
                    {r10(avgNew.low)}–{r10(avgNew.high)} €
                  </b>
                  <span>po m², iz {fmt(avgNew.listings)} oglasa</span>
                </div>
              )}
              <div className="ap-tile">
                <small>{avgNew ? 'Najskuplja starogradnja' : 'Najskuplje naselje'}</small>
                <b>{joinNames(top.names)}</b>
                <span>do {fmt(top.value)} € po m²</span>
              </div>
              {!avgNew && (
                <div className="ap-tile">
                  <small>Najpovoljnije naselje</small>
                  <b>{joinNames(low.names)}</b>
                  <span>od {fmt(low.value)} € po m²</span>
                </div>
              )}
              {centerRent && (
                <div className="ap-tile">
                  <small>Kirija, stan u Centru</small>
                  <b>
                    {fmt(centerRent.low, 1)}–{fmt(centerRent.high, 1)} €
                  </b>
                  <span>po m² mesečno, namešten</span>
                </div>
              )}
            </div>
          )}
        </div>

        <section className="band" id="naselja">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{COPY.chart.eyebrow}</span>
              <h2>{accent(COPY.chart.title)}</h2>
              <p className="note">{COPY.chart.note}</p>
            </div>
            {rows.length ? (
              <AreaPriceChart rows={rows} valuationHref={VALUATION_HREF} />
            ) : (
              <p className="ap-empty card">Cene se trenutno osvežavaju. Pokušajte ponovo za nekoliko minuta.</p>
            )}

            {groups.length > 0 && (
              <details className="card ap-table">
                <summary>Sve cene u tabeli</summary>
                {groups.map((g) => (
                  <table key={`${g.t}-${g.k}-${g.b}`}>
                    <caption>
                      {TYPE_LABEL[g.t]}, {KIND_LABEL[g.k]}
                      {BUILD_LABEL[g.b]}
                      {g.k === 'rent' ? ' (€ po m² mesečno)' : ' (€ po m²)'}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Naselje</th>
                        <th scope="col">Od</th>
                        <th scope="col">Do</th>
                        <th scope="col">Oglasa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.list.map((r) => (
                        <tr key={r.neighborhood}>
                          <th scope="row">{r.neighborhood}</th>
                          <td>{g.k === 'rent' ? fmt(r.low, 1) : fmt(r.low)}</td>
                          <td>{g.k === 'rent' ? fmt(r.high, 1) : fmt(r.high)}</td>
                          <td>
                            {r.source === 'projects' ? `${r.listings} stanova, cenovnici` : (r.listings ?? '—')}
                            {r.source === 'ads' && r.independent !== null && r.independent < FEW_LISTINGS ? ' (okvirno)' : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ))}
              </details>
            )}
          </div>
        </section>

        <ToolExplain id="kako-racunamo" eyebrow={COPY.method.eyebrow} title={COPY.method.title} note={COPY.method.note} items={split ? [...COPY.method.items.slice(0, 3), COPY.method.splitItem] : COPY.method.items} columns={4} band={false} />

        <ToolCta
          id="procena"
          title={COPY.cta.title}
          points={COPY.cta.points}
          primary={{ href: VALUATION_HREF, label: COPY.cta.button, track: 'cta:prices_valuation' }}
        />

        <ToolFaq eyebrow="Pitanja" title="Cene u Kragujevcu, *ukratko.*" note="Odgovori se računaju iz istih podataka kao grafikon." items={faq} />

        <ToolCrossLink title={COPY.other.title} text={COPY.other.text} link={{ href: CALC_HREF, label: COPY.other.link, track: 'cta:prices_calc' }} />
      </main>

      <SiteFooter note={COPY.footer} />
    </div>
  );
}

// Samo za ovu stranu: kartice u vrhu, grafikon, tabela.
const PAGE_STYLES = `
  /* Naslov: "Cene stanova u Kragujevcu" u jednom redu, akcenat u svom (bez "u" na kraju reda). */
  .tl-hero h1{max-width:none;}
  .tl-hero h1 em{display:block;}
  .ap-mix{margin:16px 0 0; max-width:62ch; background:var(--surface); border:1px solid var(--line); border-left:4px solid var(--accent); border-radius:12px; padding:12px 14px; font-size:.94rem; line-height:1.55; color:var(--ink-soft);}
  .ap-mix b{color:var(--ink);}
  .ap-tiles{display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin:0 0 clamp(32px,5vw,56px);}
  .ap-tile{background:var(--surface); border:1px solid var(--line); border-radius:20px; padding:16px; box-shadow:var(--shadow);}
  .ap-tile small{display:block; font-size:.76rem; font-weight:700; color:var(--ink-faint);}
  .ap-tile b{display:block; font-family:var(--font-display); font-size:1.6rem; letter-spacing:-.02em; margin-top:4px; font-variant-numeric:tabular-nums; line-height:1.15;}
  .ap-tile span{display:block; font-size:.84rem; color:var(--ink-soft); margin-top:2px;}

  .ap-card{padding:clamp(16px,2.4vw,24px);}
  .ap-filters{display:flex; flex-wrap:wrap; gap:10px 18px; align-items:center; justify-content:space-between; margin-bottom:18px;}
  .ap-segs{display:flex; gap:10px; flex-wrap:wrap;}
  .ap-seg{display:inline-flex; gap:3px; background:var(--surface-2); border-radius:12px; padding:3px;}
  .ap-seg button{border:0; background:transparent; border-radius:9px; padding:8px 14px; font:inherit; font-size:.9rem; font-weight:700; color:var(--ink-soft); min-height:40px; cursor:pointer;}
  .ap-seg button[aria-pressed="true"]{background:var(--surface); color:var(--accent); box-shadow:0 1px 4px rgba(0,0,0,.08);}
  .ap-seg button:disabled{opacity:.4; cursor:not-allowed;}
  .ap-size{display:flex; align-items:center; gap:8px; font-size:.9rem; font-weight:600; color:var(--ink-soft);}
  .ap-size input{width:72px; border:1.5px solid var(--line-strong); border-radius:10px; padding:8px 10px; font:inherit; font-weight:700; text-align:right; font-family:var(--font-display); color:var(--ink); background:var(--surface);}
  .ap-empty{padding:24px; text-align:center; color:var(--ink-soft); margin:0;}

  .ap-chart{position:relative; --lab:190px; --val:160px;}
  .ap-axis{display:grid; grid-template-columns:var(--lab) 1fr var(--val); gap:12px; font-size:.75rem; color:var(--ink-faint); margin-bottom:6px; padding:0 4px;}
  .ap-ticks{position:relative; height:16px;}
  .ap-ticks span{position:absolute; transform:translateX(-50%); font-variant-numeric:tabular-nums; white-space:nowrap;}
  .ap-rows{position:relative;}
  .ap-grid{position:absolute; top:0; bottom:0; left:calc(var(--lab) + 16px); right:calc(var(--val) + 16px); pointer-events:none;}
  .ap-grid i{position:absolute; top:0; bottom:0; width:1px; background:var(--line);}
  .ap-city{position:absolute; top:-6px; bottom:-6px; width:0; border-left:2px dashed var(--ink-faint); opacity:.6;}
  .ap-row{display:grid; grid-template-columns:var(--lab) 1fr var(--val); gap:12px; align-items:center; min-height:46px; border-radius:12px; padding:0 4px; position:relative; text-decoration:none; color:inherit;}
  .ap-row:hover, .ap-row:focus-visible{background:var(--accent-soft);}
  .ap-lab{line-height:1.25;}
  .ap-lab b{display:block; font-size:.92rem; font-weight:700;}
  .ap-lab small{font-size:.76rem; color:var(--ink-faint);}
  .ap-lab small.is-few{color:#8A5A00;}
  .ap-track{position:relative; height:14px;}
  .ap-bar{position:absolute; top:0; height:14px; border-radius:4px; background:#1E5AA8;}
  .ap-bar.is-few, .ap-sw.is-few{background:repeating-linear-gradient(135deg,#1E5AA8 0 4px,#7FA6D8 4px 7px);}
  .ap-val{font-family:var(--font-display); font-weight:700; font-size:.9rem; text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap;}
  .ap-val small{display:block; font-family:var(--font-body); font-weight:500; font-size:.76rem; color:var(--ink-faint);}
  .ap-legend{display:flex; flex-wrap:wrap; gap:8px 20px; margin-top:16px; padding-top:14px; border-top:1px solid var(--line); font-size:.8rem; color:var(--ink-soft);}
  .ap-legend span{display:inline-flex; align-items:center; gap:7px;}
  .ap-sw{width:22px; height:10px; border-radius:3px; background:#1E5AA8;}
  .ap-sw.is-city{height:0; border-top:2px dashed var(--ink-faint); border-radius:0; background:none;}
  .ap-note{font-size:.8rem; color:var(--ink-faint); margin:12px 0 0; line-height:1.5;}
  .ap-tip{position:absolute; z-index:5; pointer-events:none; background:#111113; color:#FFFFFF; border-radius:12px; padding:10px 12px; font-size:.82rem; line-height:1.45; width:280px; box-shadow:0 10px 30px rgba(0,0,0,.25);}
  .ap-tip b{font-family:var(--font-display);}
  .ap-tip-n{display:block; opacity:.75;}
  .ap-tip-go{display:block; color:#A5C8F2; font-weight:700; margin-top:4px;}

  .ap-table{margin-top:16px; padding:0;}
  .ap-table summary{cursor:pointer; padding:14px 18px; font-family:var(--font-display); font-weight:700;}
  .ap-table table{width:calc(100% - 36px); margin:0 18px 18px; border-collapse:collapse; font-size:.88rem;}
  .ap-table caption{text-align:left; font-weight:700; padding:8px 0; color:var(--ink);}
  .ap-table th, .ap-table td{padding:7px 8px; border-bottom:1px solid var(--line); text-align:right; font-variant-numeric:tabular-nums;}
  .ap-table th:first-child{text-align:left;}
  .ap-table thead th{font-size:.76rem; color:var(--ink-faint); font-weight:700;}

  @media (max-width:900px){ .ap-tiles{grid-template-columns:1fr 1fr;} }
  /* Telefon: ime i cena u redu, traka ispod preko cele širine. */
  @media (max-width:640px){
    .ap-chart{--lab:0px; --val:0px;}
    .ap-axis{grid-template-columns:1fr; gap:0;}
    .ap-axis > span{display:none;}
    .ap-grid{left:4px; right:4px;}
    .ap-row{grid-template-columns:1fr auto; grid-template-areas:'lab val' 'track track'; row-gap:6px; padding:8px 4px;}
    .ap-lab{grid-area:lab;} .ap-val{grid-area:val;} .ap-track{grid-area:track;}
    .ap-lab b, .ap-lab small{display:inline;}
    .ap-lab small::before{content:' · ';}
    .ap-val small{display:none;}
    .ap-tip{display:none;}
    .ap-tile b{font-size:1.3rem;}
  }
`;
