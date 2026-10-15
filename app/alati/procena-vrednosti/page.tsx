import type { Metadata } from 'next';
import Link from 'next/link';
import SiteTracker from '../../../components/SiteTracker';
import SiteStylesheets from '../../../components/SiteStylesheets';
import { SiteNav, SiteFooter } from '../../../components/SiteChrome';
import ValuationForm from '../../../components/alati/ValuationForm';
import { TOOLS_STYLES } from '../../../components/alati/toolsStyles';
import { HOME_COPY } from '../../lib/homeCopy';
import { SITE_NAME, SITE_URL } from '../../lib/site';
import { serializeJsonLd } from '../../lib/structuredData';
import { HERO_TOUR_SLUG } from '../../lib/showcaseTours';
import { VALUATION_COPY as COPY } from '../../lib/valuation/valuationCopy';
import type { ValuationListingType } from '../../lib/valuation/types';
import { TOOLS_NAV, VALUATION_HREF } from '../toolsNav';

/**
 * Procena vrednosti (/alati/procena-vrednosti): lead za vlasnike koji
 * prodaju ili izdaju. Raspored kao kalkulator kredita (forma levo, rezultat
 * desno, objašnjenja, tamni blok, pitanja). Kratka adresa /procena-vrednosti
 * (za oglase) preusmerava ovde - next.config.ts.
 *
 * Raspon računa /api/valuation/estimate iz zone_price_baselines (migracije
 * 029-030; cene: npm run prices:refresh). Strana nije statična kao ostali
 * alati jer čita ?tip=izdavanje, ali ne dira bazu - samo forma to radi.
 */

const PATH = VALUATION_HREF;
const DEMO_TOUR_HREF = `/tour/${HERO_TOUR_SLUG}`;

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

// Samo za ovu stranu: polja i poruke forme koje kalkulator kredita nema.
const PAGE_STYLES = `
  .tl-num select{border:0; outline:0; padding:10px 12px; width:100%; min-width:0; font:inherit; font-weight:700; font-size:1rem; font-family:var(--font-display); color:var(--ink); background:transparent; color-scheme:light dark; cursor:pointer;}
  .tl-num input::placeholder{color:var(--ink-faint); font-weight:500;}
  .tl-tabs button:focus-visible, .tl-chips button:focus-visible, .tl-yn button:focus-visible, .vl-summary button:focus-visible{outline:2px solid var(--accent); outline-offset:2px;}
  .vl-error{margin:14px 0 0; padding:10px 14px; border-radius:12px; background:color-mix(in srgb, var(--danger) 10%, var(--surface)); color:var(--danger); font-weight:700; font-size:.9rem;}
  .vl-summary{display:flex; justify-content:space-between; align-items:center; gap:10px; margin:0 0 18px; padding:10px 14px; border-radius:14px; background:var(--surface-2); font-size:.9rem; color:var(--ink-soft);}
  .vl-summary b{color:var(--ink);}
  .vl-summary button{border:0; background:none; color:var(--accent); font:inherit; font-weight:700; cursor:pointer; padding:6px 4px; min-height:36px;}
  .vl-sent{margin:0 0 14px; color:var(--ink-soft); line-height:1.55;}
  .vl-again{width:100%;}
  .tl-btn:disabled{opacity:.6; cursor:wait;}
  .vl-locked{opacity:.55;}
  .tl-big b.vl-pending{font-size:1.35rem; line-height:1.25;}
  .vl-cta{flex-direction:column; align-items:flex-start; gap:4px;}
  .vl-cta b{font-size:1rem; white-space:normal;}
  .vl-cta small{font-weight:500; line-height:1.5;}
  .vl-upsell{margin:6px 0 0; font-size:.86rem; color:var(--ink-soft); line-height:1.5;}
  .vl-factors-head{margin:0 0 14px;}
  .vl-factors-head h2{font-family:var(--font-display); font-size:1.5rem; margin:0 0 6px;}
  .vl-factors-head p{margin:0; color:var(--ink-soft); max-width:70ch;}
  .tl-explain.vl-factors{grid-template-columns:repeat(4,1fr); margin-bottom:10px;}
  .vl-factors b{display:block; font-family:var(--font-display); font-size:1.5rem; color:var(--accent); margin:0 0 6px; white-space:nowrap; font-variant-numeric:tabular-nums;}
  .vl-factors-fine{margin:0 0 28px; font-size:.86rem; color:var(--ink-faint);}
  @media (max-width:1100px){ .tl-explain.vl-factors{grid-template-columns:repeat(2,1fr);} }
  @media (max-width:560px){ .tl-explain.vl-factors{grid-template-columns:1fr;} }
`;

type Props = { searchParams: Promise<{ tip?: string | string[] }> };

/** ?tip=izdavanje (ili rent) bira izdavanje unapred - za kampanje vlasnicima koji izdaju. */
function listingFromParam(tip: string | string[] | undefined): ValuationListingType {
  const value = (Array.isArray(tip) ? tip[0] : tip)?.toLowerCase();
  return value === 'izdavanje' || value === 'rent' ? 'rent' : 'sale';
}

export default async function ValuationPage({ searchParams }: Props) {
  const { tip } = await searchParams;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Procena vrednosti i kirije nekretnine',
      url: `${SITE_URL}${PATH}`,
      description: COPY.meta.description,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any',
      inLanguage: 'sr',
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR' },
      isPartOf: { '@type': 'WebSite', url: SITE_URL, name: SITE_NAME }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: COPY.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
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

  return (
    <div lang="sr" style={{ display: 'contents' }}>
      <SiteStylesheets />
      <style dangerouslySetInnerHTML={{ __html: TOOLS_STYLES + PAGE_STYLES }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <SiteTracker />

      <SiteNav brandHref="/" brandAria={TOOLS_NAV.brandAria} cta={{ href: '/#kontakt', label: TOOLS_NAV.cta, track: 'cta:tools_nav' }}>
        {TOOLS_NAV.links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} aria-current={l.href === '/alati' ? 'page' : undefined}>
              {l.label}
            </Link>
          </li>
        ))}
      </SiteNav>

      <main>
        <div className="wrap">
          <section className="tl-hero">
            <p className="tl-crumb">
              <Link href="/alati">Alati</Link> › {COPY.hero.crumb}
            </p>
            <span className="chip">
              <span className="dot" />
              {COPY.hero.chip}
            </span>
            <h1>
              {COPY.hero.titleStart}
              <em>{COPY.hero.titleEm}</em>
            </h1>
            <p className="lede">{COPY.hero.lede}</p>
          </section>

          <ValuationForm demoTourHref={DEMO_TOUR_HREF} initialListingType={listingFromParam(tip)} />

          <div className="vl-factors-head">
            <h2>{COPY.factors.title}</h2>
            <p>{COPY.factors.note}</p>
          </div>
          <section className="tl-explain vl-factors">
            {COPY.factors.items.map((f) => (
              <div key={f.title} className="tl-card">
                <h2>{f.title}</h2>
                <b>{f.value}</b>
                <p>{f.text}</p>
              </div>
            ))}
          </section>
          <p className="vl-factors-fine">{COPY.factors.fine}</p>

          <section className="tl-next">
            <div>
              <h2>{COPY.next.title}</h2>
              <p>{COPY.next.text}</p>
            </div>
            <Link href={DEMO_TOUR_HREF} data-track="cta:valuation_next_tour">
              {COPY.next.cta}
            </Link>
          </section>

          <section className="tl-faq">
            <h2>Česta pitanja</h2>
            {COPY.faq.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </section>

          <div className="tl-strip">
            <span>
              <b>{COPY.other.title}</b> {COPY.other.text}
            </span>
            <Link href="/alati/kalkulator-kredita" data-track="cta:valuation_loan_calc">
              {COPY.other.link}
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter note={HOME_COPY.sr.footer} />
    </div>
  );
}
