import type { Metadata } from 'next';
import Link from 'next/link';
import SiteTracker from '../../../components/SiteTracker';
import SiteStylesheets from '../../../components/SiteStylesheets';
import { SiteNav, SiteFooter } from '../../../components/SiteChrome';
import { getShowcaseTours, type ShowcaseTour } from '../../lib/showcaseTours';
import { supabase } from '../../lib/supabaseClient';
import { formatListingPrice } from '../../lib/listingPrice';
import { tourHref } from '../../lib/tourHref';
import { keepUnitsTogether } from '../../lib/typography';
import { HOME_COPY } from '../../lib/homeCopy';
import { COMPARE_MAX, parseCompareParam } from '../../lib/compare';
import { buildFactList, type FactKey } from '../../tour/[slug]/utils';
import type { Tour } from '../../tour/[slug]/types';
import { CompareActions, CompareSync, RemoveFromCompare } from './CompareActions';

/**
 * Poređenje do 4 nekretnine (/ture/uporedi?t=slug1,slug2). Izbor pravi kupac
 * na /ture ili u turi (lib/compare.ts); link sme da se pošalje dalje.
 * Ne pojavljuje se u Google-u - to je lični spisak, ne strana za pretragu.
 */

export const metadata: Metadata = {
  // "| Kvadrat360" dodaje šablon naslova iz app/layout.tsx.
  title: 'Poređenje nekretnina',
  description: 'Uporedite do 4 nekretnine jednu pored druge: cena, kvadratura, struktura, sprat i ostalo.',
  robots: { index: false, follow: true }
};

export const dynamic = 'force-dynamic';

// Redovi tabele (posle cene) - isti tekst kao u prozoru Info ture (buildFactList).
const FACT_ROWS: FactKey[] = ['area', 'structure', 'floor', 'elevator', 'heating', 'neighbourhood'];

type Column = {
  tour: ShowcaseTour;
  price: { amount: string; unit?: string | null } | null;
  perSqm: string | null;
  facts: Partial<Record<FactKey, { label: string; value: string }>>;
};

async function loadColumns(slugs: string[]): Promise<Column[]> {
  if (slugs.length === 0) return [];
  const [cards, { data: rows }] = await Promise.all([
    getShowcaseTours('sr'),
    // select('*') kao u showcaseTours - nabrajanje kolone koje na bazi nema obara upit.
    supabase.from('tours').select('*').in('slug', slugs).eq('published', true).returns<Tour[]>()
  ]);
  const columns: Column[] = [];
  for (const slug of slugs) {
    const card = cards.find((c) => c.slug === slug);
    const row = rows?.find((r) => r.slug === slug);
    if (!card || !row) continue;
    const facts: Column['facts'] = {};
    for (const f of buildFactList(row, 'sr')) facts[f.key] = { label: f.label, value: f.value };
    // card.price je već null za demo ture (isDemoTour u showcaseTours).
    const price = formatListingPrice(card.price, card.category, 'sr');
    const perSqm =
      card.category === 'sale' && card.price && card.areaSqm
        ? `${formatListingPrice(card.price / card.areaSqm, 'sale', 'sr')?.amount ?? ''}`
        : null;
    columns.push({ tour: card, price, perSqm, facts });
  }
  return columns;
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ t?: string | string[] }> }) {
  const { t } = await searchParams;
  const slugs = parseCompareParam(Array.isArray(t) ? t[0] : t);
  const columns = await loadColumns(slugs);
  const shownSlugs = columns.map((c) => c.tour.slug);

  // Red se prikazuje samo ako ga ima bar jedna nekretnina.
  const factRows = FACT_ROWS.filter((k) => columns.some((c) => c.facts[k]));
  const labelOf = (k: FactKey) => columns.find((c) => c.facts[k])?.facts[k]?.label ?? '';
  const showPrice = columns.some((c) => c.price);
  const showPerSqm = columns.some((c) => c.perSqm);
  const canAdd = columns.length > 0 && columns.length < COMPARE_MAX;

  return (
    <div lang="sr" style={{ display: 'contents' }}>
      <SiteStylesheets />
      <SiteTracker />
      <style>{CSS}</style>
      <SiteNav brandHref="/" brandAria="Kvadrat360, početna strana" cta={{ href: '/#kontakt', label: 'Zakažite snimanje', track: 'cta:compare_nav' }} mainMenu={{}} />

      <main className="cmp">
        <div className="wrap">
          <div className="cmp-head">
            <div>
              <h1>Poređenje</h1>
              {columns.length > 0 && (
                <p className="note">
                  {columns.length === 1 ? '1 nekretnina' : `${columns.length} nekretnine`} · do {COMPARE_MAX}
                </p>
              )}
            </div>
            {columns.length > 0 && <CompareActions slugs={shownSlugs} />}
          </div>

          {columns.length === 0 ? (
            <div className="cmp-empty">
              {/* Link sa samo skinutim turama: i izbor u pregledaču se čisti. */}
              {slugs.length > 0 && <CompareSync slugs={[]} />}
              <p>Još niste izabrali nekretnine za poređenje.</p>
              <Link className="btn btn-primary" href="/ture">
                Pogledajte ture
              </Link>
            </div>
          ) : (
            <>
              <div className="cmp-scroll">
                <table>
                  <thead>
                    <tr>
                      <th className="k" scope="col">
                        <span className="sr-only">Nekretnina</span>
                      </th>
                      {columns.map((c) => (
                        <th key={c.tour.slug} scope="col" className="col">
                          <div className="cmp-img" style={c.tour.coverUrl ? { backgroundImage: `url("${c.tour.coverUrl}")` } : undefined}>
                            <RemoveFromCompare slug={c.tour.slug} slugs={shownSlugs} />
                          </div>
                          <span className="cmp-title">{keepUnitsTogether(c.tour.title)}</span>
                        </th>
                      ))}
                      {canAdd && (
                        <th scope="col" className="col add-col">
                          <Link className="cmp-add" href="/ture">
                            <span aria-hidden="true">＋</span>
                            Dodaj sa liste tura
                          </Link>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {showPrice && (
                    <tr>
                      <th className="k" scope="row">Cena</th>
                      {columns.map((c) => (
                        <td key={c.tour.slug} className="big">
                          {c.price ? (
                            <>
                              {c.price.amount}
                              {c.price.unit && <small> {c.price.unit}</small>}
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                      ))}
                      {canAdd && <td className="add-col" />}
                    </tr>
                    )}
                    {showPerSqm && (
                      <tr>
                        <th className="k" scope="row">Cena po m²</th>
                        {columns.map((c) => (
                          <td key={c.tour.slug}>{c.perSqm ?? '—'}</td>
                        ))}
                        {canAdd && <td className="add-col" />}
                      </tr>
                    )}
                    {factRows.map((k) => (
                      <tr key={k}>
                        <th className="k" scope="row">{labelOf(k)}</th>
                        {columns.map((c) => (
                          <td key={c.tour.slug}>{c.facts[k]?.value ?? '—'}</td>
                        ))}
                        {canAdd && <td className="add-col" />}
                      </tr>
                    ))}
                    <tr>
                      <th className="k" scope="row">
                        <span className="sr-only">Tura</span>
                      </th>
                      {columns.map((c) => (
                        <td key={c.tour.slug}>
                          <a className="btn btn-primary btn-sm" href={tourHref(c.tour.slug, c.tour.languages, 'sr')}>
                            Otvori turu
                          </a>
                        </td>
                      ))}
                      {canAdd && <td className="add-col" />}
                    </tr>
                  </tbody>
                </table>
              </div>
              {columns.length === 1 && (
                <p className="note cmp-one">
                  <Link href="/ture">Dodajte još jednu sa liste tura</Link> da biste ih uporedili.
                </p>
              )}
            </>
          )}
        </div>
      </main>

      <SiteFooter note={HOME_COPY.sr.footer} />
    </div>
  );
}

const CSS = `
.cmp{padding:clamp(5.5rem,10vw,7rem) 0 4rem}
.cmp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.4rem}
.cmp-head h1{font-family:var(--font-display);font-size:clamp(1.8rem,4vw,2.4rem);letter-spacing:-.02em;margin:0}
.cmp-head .note{margin:.25rem 0 0}
.cmp-empty{padding:3rem 0;display:flex;flex-direction:column;align-items:flex-start;gap:1rem}
.cmp-empty p{margin:0;font-size:1.05rem}
.cmp-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 -16px;padding:0 16px}
.cmp table{border-collapse:separate;border-spacing:0;min-width:100%;font-size:.92rem}
.cmp th,.cmp td{padding:.7rem .8rem;text-align:left;vertical-align:top;border-bottom:1px solid var(--line, #E4E4DE);background:var(--surface, #fff)}
.cmp th.k{position:sticky;left:0;z-index:1;background:var(--bg, #FAFAF7);color:var(--ink-2, #5B5D63);font-weight:600;font-size:.82rem;width:7.5rem;min-width:7.5rem;padding-left:0}
.cmp thead th{border-bottom:none;font-weight:400}
.cmp .col{min-width:11rem;width:14rem}
.cmp-img{position:relative;aspect-ratio:4/3;border-radius:12px;background:var(--surface-2, #eee) center/cover no-repeat;margin-bottom:.5rem}
.cmp-title{display:block;font-family:var(--font-display);font-weight:700;font-size:.98rem;line-height:1.25}
.cmp td.big{font-family:var(--font-display);font-weight:800;font-size:1.1rem;white-space:nowrap}
.cmp td.big small{font-weight:600;font-size:.8rem;color:var(--ink-2, #5B5D63)}
.cmp .add-col{background:transparent}
.cmp-add{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.35rem;aspect-ratio:4/3;border:2px dashed #C9D7EC;border-radius:14px;color:var(--accent);font-weight:700;font-size:.9rem;text-decoration:none;text-align:center;padding:.5rem}
.cmp-add span{font-size:1.4rem}
.cmp-one{margin-top:1rem}
.cmp-remove{position:absolute;top:6px;right:6px;width:36px;height:36px;border:none;border-radius:50%;background:rgba(255,255,255,.95);box-shadow:0 1px 5px rgba(0,0,0,.2);font-size:.85rem;cursor:pointer}
.cmp-remove::before{content:"";position:absolute;inset:-4px}
.cmp-share{flex:none;min-height:44px;padding:0 1rem;border-radius:999px;border:1.5px solid #C9D7EC;background:#fff;color:var(--accent);font-weight:700;font-size:.85rem;cursor:pointer}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media (max-width:820px){.cmp .add-col{display:none}}
`;
