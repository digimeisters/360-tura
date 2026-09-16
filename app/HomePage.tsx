import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav, SiteFooter } from '../components/SiteChrome';
import HeroDevice from '../components/HeroDevice';
import ContactForm from '../components/ContactForm';
import SiteTracker from '../components/SiteTracker';
import PriceCalculator from '../components/PriceCalculator';
import PromoBanner from '../components/PromoBanner';
import { getShowcaseTours, pickHeroTour } from './lib/showcaseTours';
import { SITE_NAME, SITE_URL, CONTACT, CONTACT_LINKS, whatsappLink } from './lib/site';
import { HOME_COPY, type HomeLang } from './lib/homeCopy';
import { HOME_FAQ } from './lib/homeFaq';
import { homeJsonLd, serializeJsonLd } from './lib/structuredData';
import { SITE_STYLES } from './lib/siteStyles';
import TourCard, { tourCardLabels } from '../components/TourCard';
import { getPublicOpenCount } from './lib/tourStats';
import { tourHref } from './lib/tourHref';

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

// Broj kolona prati broj tura, da nijedna kartica ne ostane sama u redu.
function gridClass(count: number): string {
  if (count === 1) return 'n-1';
  if (count === 2 || count === 4) return 'n-2';
  return 'n-3';
}



export default async function HomePage({ lang }: { lang: HomeLang }) {
  const copy = HOME_COPY[lang];
  const faq = HOME_FAQ[lang];
  const { nav, hero, contact } = copy;

  const [tours, openCount] = await Promise.all([getShowcaseTours(lang), getPublicOpenCount()]);
  const heroTour = pickHeroTour(tours, lang);
  const exampleSlug = heroTour?.slug ?? tours[0]?.slug ?? 'naziv-ture';
  const address = [CONTACT.street, CONTACT.city, contact.country].filter(Boolean).join(', ');

  return (
    // <html lang="sr"> dolazi iz root layout-a za ceo sajt; omotač kaže
    // čitaču ekrana (i pregledaču pri deljenju reči) na kom je jeziku strana.
    // display: contents - omotač ne menja raspored.
    <div lang={lang} style={{ display: 'contents' }}>
      <style dangerouslySetInnerHTML={{ __html: SITE_STYLES }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(homeJsonLd(faq, lang)) }}
      />
      <SiteTracker />

      <SiteNav
        brandHref="#pocetna"
        brandAria={nav.brandAria}
        cta={{ href: '#kontakt', label: nav.cta, track: 'cta:nav_book' }}
        logoSpin
      >
        {tours.length > 0 && <li><a href="#primeri">{nav.examples}</a></li>}
        <li><a href="#kako-radimo">{nav.how}</a></li>
        <li><a href="#benefiti">{nav.benefits}</a></li>
        <li><a href="#paketi">{nav.packages}</a></li>
        <li><a href="#pitanja">{nav.faq}</a></li>
        {nav.agencies && (
          <li><Link href="/za-agencije" data-track="cta:nav_agencies">{nav.agencies}</Link></li>
        )}
        <li className="nav-lang">
          <a href={nav.switchHref} hrefLang={nav.switchLang} lang={nav.switchLang} aria-label={nav.switchAria}>
            {nav.switchLabel}
          </a>
        </li>
      </SiteNav>

      <main>
        <section className="hero" id="pocetna">
          <div className="wrap">
            <div>
              <span className="chip"><span className="dot" />{hero.chip}</span>
              <h1>{hero.titleStart}<em>{hero.titleEm}</em></h1>
              <p className="lede">{hero.lede}</p>
              <div className="hero-ctas">
                <a
                  className="btn btn-primary"
                  href={heroTour ? tourHref(heroTour.slug, heroTour.languages, lang) : '#primeri'}
                  data-track="cta:hero_tour"
                >
                  {hero.ctaTour}
                </a>
                <a className="btn btn-secondary" href="#paketi" data-track="cta:hero_packages">{hero.ctaPackages}</a>
              </div>
              <div className="trust">
                {hero.trust.map((item) => (
                  <span key={item} className="chip">{item}</span>
                ))}
                {openCount !== null && (
                  <span className="chip">{hero.opens(new Intl.NumberFormat(copy.locale).format(openCount))}</span>
                )}
              </div>
            </div>

            <HeroDevice tour={heroTour} lang={lang} />
          </div>
        </section>

        {tours.length > 0 && (
          <section className="band" id="primeri">
            <div className="wrap">
              <div className="section-head">
                <span className="eyebrow">{copy.examples.eyebrow}</span>
                <h2>{copy.examples.title}</h2>
                <p className="note">{copy.examples.note}</p>
              </div>
              <div className={`tours-grid ${gridClass(tours.length)}`}>
                {tours.map((tour) => (
                  <TourCard key={tour.slug} tour={tour} labels={tourCardLabels(copy)} lang={lang} />
                ))}
              </div>
              {copy.examples.allTours && (
                <p className="fine-print" style={{ textAlign: 'center' }}>
                  <Link className="btn btn-secondary btn-sm" href="/ture" data-track="cta:all_tours">
                    {copy.examples.allTours}
                  </Link>
                </p>
              )}
            </div>
          </section>
        )}

        <section id="benefiti">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{copy.benefits.eyebrow}</span>
              <h2>{copy.benefits.title}</h2>
              <p className="note">{copy.benefits.note}</p>
            </div>
            <div className="feat-grid">
              {copy.benefits.items.map((item) => (
                <div key={item.title} className="card feat">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="band" id="kako-radimo">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{copy.steps.eyebrow}</span>
              <h2>{copy.steps.title}</h2>
              <p className="note">{copy.steps.note}</p>
            </div>

            <div className="steps-row">
              {copy.steps.items.map((item, i) => (
                <div key={item.title} className="card step">
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>

            <div className="card deliver-card">
              <h3>{copy.steps.deliverTitle}</h3>
              <ul className="deliver-list">
                {copy.steps.deliver.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="tipovi">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{copy.types.eyebrow}</span>
              <h2>{copy.types.title}</h2>
              <p className="note">{copy.types.note}</p>
            </div>
            <div className="cat-grid">
              {copy.types.items.map((item) => (
                <div key={item.eyebrow} className="card cat-card">
                  <span className="eyebrow">{item.eyebrow}</span>
                  <h3>{item.title}</h3>
                  <p className="focus">{item.focus}</p>
                  <div className="cat-faq"><span>{copy.types.faqLabel}</span><p>{item.faq}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="band" id="paketi">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{copy.pricing.eyebrow}</span>
              <h2>{copy.pricing.title}</h2>
              <p className="note">{copy.pricing.note}</p>
            </div>
            <PromoBanner lang={lang} />
            <div className="price-grid">
              {copy.pricing.plans.map((plan) => (
                <div key={plan.track} className={`card price-card${plan.badge ? ' featured' : ''}`}>
                  {plan.badge && <span className="price-badge">{plan.badge}</span>}
                  <span className="price-audience">{plan.audience}</span>
                  <h3>{plan.title}</h3>
                  <div className="price-value">{plan.from} <b>{plan.amount}</b><span>{plan.unit}</span></div>
                  <ul className="price-list">
                    {plan.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <a
                    className={`btn ${plan.badge ? 'btn-primary' : 'btn-secondary'} price-cta`}
                    href="#kontakt"
                    data-track={`cta:${plan.track}`}
                  >
                    {plan.cta}
                  </a>
                </div>
              ))}
            </div>
            <p className="fine-print">{copy.pricing.fine}</p>
            <PriceCalculator lang={lang} />
          </div>
        </section>

        <section className="integration">
          <div className="wrap">
            <div>
              <span className="eyebrow">{copy.integration.eyebrow}</span>
              <h2>{copy.integration.title}</h2>
              <p className="desc">{copy.integration.desc}</p>
            </div>
            <div className="code-block">
              &lt;<span className="tag">iframe</span>
              <br />
              &nbsp;&nbsp;<span className="attr">src</span>=<span className="str">&quot;{SITE_URL}/tour/{exampleSlug}&quot;</span>
              <br />
              &nbsp;&nbsp;<span className="attr">width</span>=<span className="str">&quot;100%&quot;</span> <span className="attr">height</span>=<span className="str">&quot;600&quot;</span>
              <br />
              &nbsp;&nbsp;<span className="attr">frameborder</span>=<span className="str">&quot;0&quot;</span> <span className="attr">allowfullscreen</span>&gt;
              <br />
              &lt;/<span className="tag">iframe</span>&gt;
            </div>
          </div>
        </section>

        <section className="band" id="pitanja">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{copy.faq.eyebrow}</span>
              <h2>{copy.faq.title}</h2>
              <p className="note">{copy.faq.note}</p>
            </div>
            <div className="faq-list">
              {faq.map((item) => (
                <details key={item.question} className="card faq-item">
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
                <span className="eyebrow">{contact.eyebrow}</span>
                <h2>{contact.title}</h2>
                <p className="note">{contact.note}</p>
              </div>
              <div className="quick-contact">
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
            <dl className="info-list">
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

      <SiteFooter note={copy.footer} />
    </div>
  );
}
