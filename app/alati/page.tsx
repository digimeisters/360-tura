import type { Metadata } from 'next';
import Link from 'next/link';
import SiteTracker from '../../components/SiteTracker';
import SiteStylesheets from '../../components/SiteStylesheets';
import { SiteNav, SiteFooter } from '../../components/SiteChrome';
import { TOOLS_STYLES } from '../../components/alati/toolsStyles';
import { HOME_COPY } from '../lib/homeCopy';
import { computePlan } from '../lib/paymentPlan';
import { formatPrice } from '../lib/projectI18n';
import { SITE_NAME, SITE_URL } from '../lib/site';
import { serializeJsonLd } from '../lib/structuredData';
import { TOOLS_NAV, VALUATION_HREF, VALUATION_LIVE } from './toolsNav';

/**
 * „Alati" (/alati): ulaz u besplatne alate - kalkulator kredita i troškova
 * kupovine (za kupce) i procena vrednosti (za vlasnike). Svaki alat ima svoju
 * stranu i svoj naslov za pretragu; ovde su samo kartice sa malim primerom.
 */

const PATH = '/alati';

// Statična strana: VALUATION_LIVE (toolsNav) se proverava pri build-u.
export const dynamic = 'force-static';

// Primer na kartici kalkulatora: izmišljen stan, isti obračun kao kalkulator.
const SAMPLE = computePlan({
  price: 92_800,
  areaSqm: 58,
  deposit: 20,
  mode: 'loan',
  months: 18,
  years: 25,
  rate: 4.5,
  firstHome: true,
  members: 1
});

const COPY = {
  meta: {
    title: 'Alati za kupovinu i prodaju stana | Kvadrat360',
    description:
      'Besplatni alati za Kragujevac: kalkulator stambenog kredita i troškova kupovine sa povratom PDV-a i procena vrednosti nekretnine.'
  },
  hero: {
    chip: 'Besplatno · bez registracije',
    titleStart: 'Alati za kupovinu ',
    titleEm: 'i prodaju.',
    lede: 'Izračunajte koliko vas stan zaista košta ili koliko vredi nekretnina koju prodajete. Sa pravim taksama i cenama za Kragujevac.'
  },
  calc: {
    who: 'Za kupce',
    title: 'Kalkulator kredita i troškova kupovine',
    text: 'Mesečna rata, šta plaćate odmah i koliko vam država vraća ako kupujete prvi stan.',
    points: ['Rate investitoru ili stambeni kredit', 'Notar, katastar i banka po važećoj tarifi', 'Novogradnja i starogradnja'],
    go: 'Izračunajte'
  },
  valuation: {
    who: 'Za vlasnike',
    title: 'Procena vrednosti nekretnine',
    text: 'Prodajna cena ili mesečna kirija za vaš stan ili kuću, po naselju.',
    points: ['Raspon cene, ne izmišljena cifra', 'Prodaja i izdavanje', 'Bez ikakve obaveze'],
    go: 'Procenite',
    soon: 'Uskoro'
  },
  strip: { title: 'Prodajete nekretninu preko agencije?', text: 'Sa 360° turom kupci dolaze već odlučni, bez praznih gledanja.', link: 'Kako radi 360° tura →' },
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

export default function ToolsPage() {
  const tools = [
    { url: '/alati/kalkulator-kredita', name: COPY.calc.title },
    ...(VALUATION_LIVE ? [{ url: VALUATION_HREF, name: COPY.valuation.title }] : [])
  ];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE_URL}${PATH}`,
    url: `${SITE_URL}${PATH}`,
    name: COPY.meta.title,
    description: COPY.meta.description,
    inLanguage: 'sr',
    isPartOf: { '@type': 'WebSite', url: SITE_URL, name: SITE_NAME },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: tools.length,
      itemListElement: tools.map((tool, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}${tool.url}`, name: tool.name }))
    }
  };

  const valuationBody = (
    <>
      <span className="tl-who">{COPY.valuation.who}</span>
      <h2>{COPY.valuation.title}</h2>
      <p>{COPY.valuation.text}</p>
      {/* Ilustracija rezultata (raspon), bez izmišljenih cena. */}
      <div className="tl-preview" aria-hidden="true">
        <div className="tl-pv-row">
          <span>Najniža</span>
          <b>Procena</b>
          <span>Najviša</span>
        </div>
        <div className="tl-pv-range" />
      </div>
      <ul>
        {COPY.valuation.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <div className="tl-go">
        {VALUATION_LIVE ? COPY.valuation.go : COPY.valuation.soon} <span aria-hidden="true">→</span>
      </div>
    </>
  );

  return (
    <div lang="sr" style={{ display: 'contents' }}>
      <SiteStylesheets />
      <style dangerouslySetInnerHTML={{ __html: TOOLS_STYLES }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <SiteTracker />

      <SiteNav brandHref="/" brandAria={TOOLS_NAV.brandAria} cta={{ href: '/#kontakt', label: TOOLS_NAV.cta, track: 'cta:tools_nav' }}>
        {TOOLS_NAV.links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} aria-current={l.href === PATH ? 'page' : undefined}>
              {l.label}
            </Link>
          </li>
        ))}
      </SiteNav>

      <main>
        <div className="wrap">
          <section className="tl-hero">
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

          <section className="tl-tools">
            <Link className="tl-tool" href="/alati/kalkulator-kredita" data-track="cta:tools_card_calc">
              <span className="tl-who">{COPY.calc.who}</span>
              <h2>{COPY.calc.title}</h2>
              <p>{COPY.calc.text}</p>
              <div className="tl-preview" aria-hidden="true">
                <div className="tl-pv-big">
                  <small>25 god. · 4,5%</small>
                  <b>
                    {formatPrice(SAMPLE.monthly, 'sr')} <em>mesečno</em>
                  </b>
                </div>
                <div className="tl-pv-row">
                  <span>Odmah: učešće + troškovi</span>
                  <b>{formatPrice(SAMPLE.upfront, 'sr')}</b>
                </div>
                <div className="tl-pv-green">
                  <span>Povrat PDV-a za prvi stan</span>
                  <span>{formatPrice(SAMPLE.vatRefund, 'sr')}</span>
                </div>
              </div>
              <ul>
                {COPY.calc.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <div className="tl-go">
                {COPY.calc.go} <span aria-hidden="true">→</span>
              </div>
            </Link>

            {VALUATION_LIVE ? (
              <Link className="tl-tool" href={VALUATION_HREF} data-track="cta:tools_card_valuation">
                {valuationBody}
              </Link>
            ) : (
              <div className="tl-tool is-soon">{valuationBody}</div>
            )}
          </section>

          <div className="tl-strip">
            <span>
              <b>{COPY.strip.title}</b> {COPY.strip.text}
            </span>
            <Link href="/za-agencije" data-track="cta:tools_agencies">
              {COPY.strip.link}
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter note={COPY.footer} />
    </div>
  );
}
