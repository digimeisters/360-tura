import type { Metadata } from 'next';
import Link from 'next/link';
import SiteTracker from '../../components/SiteTracker';
import TourList from '../../components/TourList';
import { SiteNav, SiteFooter } from '../../components/SiteChrome';

import { Logo } from '../tour/[slug]/Logo';
import { SITE_STYLES } from '../lib/siteStyles';
import { getShowcaseTours } from '../lib/showcaseTours';
import { HOME_COPY } from '../lib/homeCopy';
import { SITE_NAME, SITE_URL } from '../lib/site';
import { serializeJsonLd } from '../lib/structuredData';

/**
 * Javni spisak objavljenih tura (/ture). Sve ture su u HTML-u sa servera
 * (zbog Google-a), a filteri u pregledaču samo skrivaju kartice - vidi
 * components/TourList.tsx. Filteri se pamte u adresi, pa agencija može da
 * podeli link samo sa svojim turama: /ture?agencija=Ime
 *
 * Za sada samo srpski; engleska verzija ide istim putem kad zatreba.
 */

const PATH = '/ture';

// Ture se dodaju i objavljuju bez novog deploy-a, pa se strana osvežava
// na svakih sat vremena, isto kao sitemap.
export const revalidate = 3600;

const COPY = {
  meta: {
    title: 'Virtuelne ture — Kvadrat360',
    description:
      'Sve objavljene 360° virtuelne ture nekretnina: prodaja, izdavanje i kratkoročni smeštaj. Prošetajte kroz stan iz pretraživača, bez instaliranja aplikacije.'
  },
  nav: { brandAria: 'Kvadrat360, početna strana', home: 'Početna', agencies: 'Za agencije', cta: 'Zakažite snimanje' },
  hero: {
    chip: 'Objavljene ture',
    titleStart: 'Prošetajte kroz ',
    titleEm: 'svaku turu.',
    lede:
      'Sve ture koje su trenutno objavljene. Otvaraju se u pretraživaču, na telefonu ili računaru, bez instaliranja aplikacije — a svaka ima audio vodič i kontakt agenta.'
  },
  // Natpisi filtera i kartica su u components/TourList.tsx - između servera
  // i pregledača ne mogu da pređu funkcije, pa tamo i stoje.
  emptyTitle: 'Još nema objavljenih tura',
  emptyNote: 'Prve ture stižu uskoro. U međuvremenu nam se javite ako želite da vaša nekretnina bude među njima.',
  cta: { title: 'Želite svoju turu ovde?', note: 'Snimamo, pripremamo i objavljujemo — tura stiže za 48h.', button: 'Zakažite snimanje' },
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

export default async function ToursPage() {
  const tours = await getShowcaseTours('sr');


  // Spisak stavki za Google: svaka tura sa svojim linkom, redom kojim stoje.
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
      numberOfItems: tours.length,
      itemListElement: tours.map((tour, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/tour/${tour.slug}`,
        name: tour.title
      }))
    }
  };

  return (
    <div lang="sr" style={{ display: 'contents' }}>
      <style dangerouslySetInnerHTML={{ __html: SITE_STYLES }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <SiteTracker />

      <SiteNav
        brandHref="/"
        brandAria={COPY.nav.brandAria}
        cta={{ href: '/#kontakt', label: COPY.nav.cta, track: 'cta:tours_nav' }}
      >
        <li><Link href="/">{COPY.nav.home}</Link></li>
        <li><Link href="/za-agencije">{COPY.nav.agencies}</Link></li>
      </SiteNav>

      <main>
        <section className="hero hero-solo" id="pocetna">
          <div className="wrap">
            <div>
              <span className="chip"><span className="dot" />{COPY.hero.chip}</span>
              <h1>{COPY.hero.titleStart}<em>{COPY.hero.titleEm}</em></h1>
              <p className="lede">{COPY.hero.lede}</p>
            </div>
          </div>
        </section>

        <section className="band" id="spisak">
          <div className="wrap">
            {tours.length > 0 ? (
              <TourList tours={tours} lang="sr" />
            ) : (
              <div className="section-head">
                <h2>{COPY.emptyTitle}</h2>
                <p className="note">{COPY.emptyNote}</p>
              </div>
            )}
          </div>
        </section>

        <section id="poziv">
          <div className="wrap">
            <div className="section-head">
              <h2>{COPY.cta.title}</h2>
              <p className="note">{COPY.cta.note}</p>
              <p style={{ marginTop: '1.2rem' }}>
                <Link className="btn btn-primary" href="/#kontakt" data-track="cta:tours_bottom">{COPY.cta.button}</Link>
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter note={COPY.footer} />
    </div>
  );
}
