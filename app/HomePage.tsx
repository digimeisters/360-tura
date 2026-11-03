import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav, SiteFooter } from '../components/SiteChrome';
import HeroTour from '../components/HeroTour';
import ContactForm from '../components/ContactForm';
import SiteTracker from '../components/SiteTracker';
import CardSpotlight from '../components/CardSpotlight';
import SiteReveal from '../components/SiteReveal';
import CountUp from '../components/CountUp';
import PromoBanner from '../components/PromoBanner';
import Pricing from '../components/Pricing';
import PricingShort from '../components/PricingShort';
import NavScrollSpy from '../components/NavScrollSpy';
import { getShowcaseTours, HOME_CITY, localToursFirst, pickHeroTour } from './lib/showcaseTours';
import { SITE_NAME, CONTACT, CONTACT_LINKS, whatsappLink } from './lib/site';
import { HOME_COPY, type HomeLang } from './lib/homeCopy';
import { HOME_PAGE_FAQ } from './lib/homeFaq';
import { homeJsonLd, serializeJsonLd } from './lib/structuredData';
import TourCard, { tourCardLabels } from '../components/TourCard';
import { getPublicOpenCount } from './lib/tourStats';
import { accent } from './lib/accent';
import PromoTopBar from '../components/PromoTopBar';
import TourModulesShowcase from '../components/TourModulesShowcase';
import ChatBubble from '../components/ChatBubble';
import SiteStylesheets from '../components/SiteStylesheets';
import HtmlLang from '../components/HtmlLang';
import { preloadHeroImage } from './lib/heroPreload';

/**
 * Početna strana, jedan raspored za obe jezičke verzije: app/page.tsx (/,
 * srpski) i app/en/page.tsx (/en, engleski). Tekst je u lib/homeCopy.ts.
 */

// Obe verzije se međusobno najavljuju pretraživačima (hreflang), a srpska je
// podrazumevana za sve ostale jezike (x-default).
const LANGUAGE_ALTERNATES = { sr: '/', en: '/en', 'x-default': '/' };

export function homeMetadata(lang: HomeLang): Metadata {
  const { meta } = HOME_COPY[lang];
  const path = lang === 'sr' ? '/' : `/${lang}`;
  return {
    // absolute: /en je ispod root layout-a, pa bi mu šablon "%s | Kvadrat360"
    // dodao ime firme drugi put.
    title: { absolute: meta.title },
    description: meta.description,
    alternates: { canonical: path, languages: LANGUAGE_ALTERNATES },
    // openGraph strane zamenjuje ceo openGraph iz layout-a, pa ide sve ponovo.
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      url: path,
      title: meta.title,
      description: meta.description,
      locale: lang === 'sr' ? 'sr_RS' : 'en_GB'
    }
  };
}

// Ikone kartica u sekciji "Usluge" - iste linije kao u glavnom meniju.
const SERVICE_ICONS = {
  home: <path d="M4 11 12 4l8 7v9h-5v-6H9v6H4v-9Z" />,
  agency: <path d="M4 20V8l8-4 8 4v12M9 20v-5h6v5M8 10h.01M12 10h.01M16 10h.01" />,
  building: <path d="M6 20V4h9v16M15 9h3v11M9 8h3M9 12h3M9 16h3M4 20h16" />
};

// Broj kolona prati broj tura, da nijedna kartica ne ostane sama u redu.
function gridClass(count: number): string {
  if (count === 1) return 'n-1';
  if (count === 2) return 'n-2';
  if (count === 4) return 'n-4';
  return 'n-3';
}



export default async function HomePage({ lang }: { lang: HomeLang }) {
  const copy = HOME_COPY[lang];
  const faq = HOME_PAGE_FAQ[lang];
  const { nav, hero, contact } = copy;

  const [allTours, openCount] = await Promise.all([getShowcaseTours(lang), getPublicOpenCount()]);
  // Strana kaže "Vaš kvadrat u Kragujevcu" - primeri i kadar u vrhu kreću od tog grada.
  const tours = localToursFirst(allTours);
  const heroTour = pickHeroTour(tours, lang, HOME_CITY);
  preloadHeroImage(heroTour);
  const address = [CONTACT.street, CONTACT.city, contact.country].filter(Boolean).join(', ');

  return (
    // <html lang="sr"> dolazi iz root layout-a za ceo sajt; omotač kaže
    // čitaču ekrana (i pregledaču pri deljenju reči) na kom je jeziku strana.
    // display: contents - omotač ne menja raspored.
    <div lang={lang} style={{ display: 'contents' }}>
      {lang === 'en' && <HtmlLang lang="en" />}
      <SiteStylesheets />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(homeJsonLd(faq, lang)) }}
      />
      <SiteTracker />
      <CardSpotlight />
      <SiteReveal />
      <NavScrollSpy />
      <PromoTopBar lang={lang} href={lang === 'sr' ? '/cenovnik' : '#cenovnik'} />

      {/* Srpska početna: glavni meni sajta (isti na svim stranama). Engleska
          zadržava meni sa sekcijama ove strane - druge strane su samo na srpskom. */}
      {lang === 'sr' ? (
        <SiteNav
          brandHref="#pocetna"
          brandAria={nav.brandAria}
          cta={{ href: '#kontakt', label: nav.cta, track: 'cta:nav_book' }}
          logoSpin
          mainMenu={{ lang: { href: nav.switchHref, label: nav.switchLabel, hrefLang: nav.switchLang, aria: nav.switchAria } }}
        />
      ) : (
      <SiteNav
        brandHref="#pocetna"
        brandAria={nav.brandAria}
        cta={{ href: '#kontakt', label: nav.cta, track: 'cta:nav_book' }}
        logoSpin
      >
        {/* Redosled pilula mora da prati redosled sekcija na strani - inače
            scrollspy skače napred-nazad dok posetilac skroluje. */}
        {tours.length > 0 && (
          <li>
            {/* Vodi na spisak svih tura, ne na sekciju ovde - "primeri" na
                početnoj su i dalje samo izbor. Obeležava se dok se prolazi
                kroz tu sekciju (data-section), isto kao "Za agencije". */}
            {/* Ovaj meni je samo na engleskoj strani, a /ture je samo na srpskom -
                zato vodi na primere ovde. */}
            <Link href="#primeri" data-section="primeri" data-track="cta:nav_tours">
              {nav.examples}
            </Link>
          </li>
        )}
        <li><a href="#u-turi">{nav.modules}</a></li>
        <li><a href="#kako-radimo">{nav.how}</a></li>
        <li><a href="#cenovnik">{nav.packages}</a></li>
        {/* Ide odmah iza paketa, jer je tu i sekcija koja vodi na tu stranu. */}
        {nav.agencies && (
          <li>
            {/* Vodi na drugu stranu, ali se označava dok se prolazi kroz
                sekciju #agencije na ovoj - vidi NavScrollSpy. */}
            <Link href="/za-agencije" data-section="agencije" data-track="cta:nav_agencies">
              {nav.agencies}
            </Link>
          </li>
        )}
        {nav.blog && (
          <li>
            <Link href="/blog" data-track="cta:nav_blog">{nav.blog}</Link>
          </li>
        )}
        <li><a href="#kontakt">{nav.contact}</a></li>
        <li className="nav-lang">
          <a href={nav.switchHref} hrefLang={nav.switchLang} lang={nav.switchLang} aria-label={nav.switchAria}>
            {nav.switchLabel}
          </a>
        </li>
      </SiteNav>
      )}

      {/* .rv-page: animacije iz siteStyles važe samo na stranama koje ih imaju. */}
      <main className="rv-page">
        {/* Vrh je sama tura preko cele širine (vlasnik, 16. 10. 2026): kadar se
            vuče, tačke na tlocrtu menjaju sobu. Tekst stoji na svojoj pločici. */}
        <section className="hero-tour" id="pocetna">
          <HeroTour tour={heroTour} lang={lang} />
          <div className="ht-copy">
            <h1>{hero.titleStart}<em>{hero.titleEm}</em></h1>
            <p className="lede">{hero.lede}</p>
            <div className="hero-ctas">
              <a className="btn btn-primary" href="#kontakt" data-track="cta:hero_book">{nav.cta}</a>
              <a className="btn btn-secondary" href={lang === 'sr' ? '/cenovnik' : '#cenovnik'} data-track="cta:hero_packages">{hero.ctaPackages}</a>
            </div>
            <ul className="ht-facts">
              {hero.trust.map((item) => (
                <li key={item}>{item}</li>
              ))}
              {openCount !== null && <li><span><CountUp value={openCount} lang={lang} kind="count" />{hero.opensSuffix}</span></li>}
            </ul>
          </div>
        </section>

        {/* Putokaz po publici odmah ispod vrha - ista tri smera kao Usluge niže. */}
        {copy.audiencePick && (
          <nav className="aud-pick" aria-label={copy.audiencePick.label}>
            <div className="wrap" data-reveal="up">
              <span className="aud-pick-label">{copy.audiencePick.label}</span>
              {copy.audiencePick.items.map((item) => (
                <Link key={item.href} className="aud-pick-link" href={item.href} data-track={`cta:audience_${item.icon}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {SERVICE_ICONS[item.icon]}
                  </svg>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
        )}

        {tours.length > 0 && (
          <section className="band" id="primeri">
            <div className="wrap">
              <div className="section-head">
                <span className="eyebrow" data-reveal="up">{copy.examples.eyebrow}</span>
                <h2 data-reveal="blur">{accent(copy.examples.title)}</h2>
                <p className="note" data-reveal="up">{copy.examples.note}</p>
              </div>
              <div className={`tours-grid home-tours ${gridClass(tours.length)}`}>
                {tours.map((tour) => (
                  <TourCard key={tour.slug} tour={tour} labels={tourCardLabels(copy)} lang={lang} reveal />
                ))}
              </div>
              {/* Ranije mini-pretraga za kupce (3 padajuća menija) - na strani koja
                  prodaje vlasnicima i agencijama bila je višak (pregled 3. 11. 2026). */}
              {copy.examples.allTours && (
                <p className="tours-more">
                  <Link href="/ture" data-track="cta:all_tours">{copy.examples.allTours}</Link>
                </p>
              )}
            </div>
          </section>
        )}

        <section className="band" id="u-turi">
          <div className="wrap">
            <TourModulesShowcase copy={copy.modules} photoUrl={heroTour?.coverUrl ?? null} />
          </div>
        </section>

        {/* Priča "Od tlocrta do ture" (wow sekcija, 21. 10. 2026) je od 3. 11. 2026
            na /za-vlasnike; skinuta je sa obe početne (copy.story ostaje za tu stranu). */}

        <section id="kako-radimo">
          <div className="wrap steps-split">
            <div className="steps-side">
              <div className="section-head left">
                <span className="eyebrow" data-reveal="up">{copy.steps.eyebrow}</span>
                <h2 data-reveal="blur">{accent(copy.steps.title)}</h2>
                <p className="note" data-reveal="up">{copy.steps.note}</p>
              </div>
              <div className="card deliver-card" data-reveal="up">
                <h3>{copy.steps.deliverTitle}</h3>
                <ul className="deliver-list">
                  {copy.steps.deliver.map((item) => (
                    <li key={item} data-reveal="list">{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="steps-row" data-reveal-steps>
              {copy.steps.items.map((item, i) => (
                <div key={item.title} className="card step" data-reveal="up">
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Srpska početna: cena ukratko, ceo cenovnik je na /cenovnik (vlasnik,
            3. 11. 2026). Engleska nema tu stranu, pa ovde zadržava ceo. Id
            ostaje #cenovnik, da stari linkovi (blog, mejlovi) i dalje rade. */}
        {copy.pricingShort ? (
          <PricingShort copy={copy.pricingShort} />
        ) : (
        <section className="band" id="cenovnik">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow" data-reveal="up">{copy.pricing.eyebrow}</span>
              <h2 data-reveal="blur">{accent(copy.pricing.title)}</h2>
              <p className="note" data-reveal="up">{copy.pricing.note}</p>
            </div>
            <PromoBanner lang={lang} />
            <Pricing copy={copy.pricing} lang={lang} trackPrefix="" compact />
          </div>
        </section>
        )}

        {/* Ugradnja na sajt (iframe kod) je preseljena na /za-agencije -
            isključivo agencijska tema, a ovde je stajala baš posle putokaza
            ka toj strani, pred vlasnikom jednog stana kome ne znači ništa. */}

        <section id="pitanja">
          <div className="wrap faq-split">
            <div className="section-head left">
              <span className="eyebrow" data-reveal="up">{copy.faq.eyebrow}</span>
              <h2 data-reveal="blur">{accent(copy.faq.title)}</h2>
              <p className="note" data-reveal="up">{copy.faq.note}</p>
            </div>
            <div className="faq-list">
              {faq.map((item) => (
                <details key={item.question} className="card faq-item" data-reveal="up">
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="contact" id="kontakt">
          <div className="wrap">
            <div className="contact-head">
              <div className="section-head left">
                <span className="eyebrow" data-reveal="up">{contact.eyebrow}</span>
                <h2 data-reveal="blur">{accent(contact.title)}</h2>
                <p className="note" data-reveal="up">{contact.note}</p>
              </div>
              <div className="quick-contact" data-reveal="up">
                <a className="btn btn-secondary btn-sm qc-phone" href={CONTACT_LINKS.phone} data-track="contact:phone">
                  <span className="qc-dot" />{contact.call}
                </a>
                <a className="btn btn-secondary btn-sm qc-viber" href={CONTACT_LINKS.viber} data-track="contact:viber">
                  <span className="qc-dot" />Viber
                </a>
                <a className="btn btn-secondary btn-sm qc-wa" href={whatsappLink(lang)} target="_blank" rel="noopener noreferrer" data-track="contact:whatsapp">
                  <span className="qc-dot" />WhatsApp
                </a>
              </div>
            </div>
            <ContactForm lang={lang} />
            <dl className="info-list" data-reveal="up">
              <div className="card">
                <dt>{contact.labels.phone}</dt>
                <dd><a href={CONTACT_LINKS.phone} data-track="contact:phone">{CONTACT.phoneDisplay}</a></dd>
              </div>
              <div className="card">
                <dt>{contact.labels.email}</dt>
                <dd><a href={CONTACT_LINKS.email} data-track="contact:email">{CONTACT.email}</a></dd>
              </div>
              <div className="card">
                <dt>{contact.labels.address}</dt>
                <dd>
                  <a href={CONTACT_LINKS.map} target="_blank" rel="noopener noreferrer" data-track="contact:map">
                    {address}
                    <span className="ext" aria-hidden="true">↗</span>
                  </a>
                </dd>
              </div>
              <div className="card">
                <dt>{contact.labels.hours}</dt>
                <dd>{contact.hours}</dd>
              </div>
            </dl>
          </div>
        </section>
      </main>

      <ChatBubble lang={lang} />

      <SiteFooter note={copy.footer} lang={lang} />
    </div>
  );
}
