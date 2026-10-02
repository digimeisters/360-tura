import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav, SiteFooter } from '../../components/SiteChrome';
import ContactForm from '../../components/ContactForm';
import InvestorDemo from '../../components/InvestorDemo';
import SiteTracker from '../../components/SiteTracker';
import NavScrollSpy from '../../components/NavScrollSpy';
import { SITE_STYLES } from '../lib/siteStyles';
import { SELECTOR_STYLES } from '../../components/projekat/selectorStyles';
import { INVESTOR_COPY } from '../lib/investorCopy';
import { accent } from '../lib/accent';
import { CONTACT, CONTACT_LINKS, SITE_NAME, whatsappLink } from '../lib/site';
import { tourHref } from '../lib/tourHref';
import { getShowcaseTours, pickHeroTour } from '../lib/showcaseTours';

/**
 * Prodajna strana za investitore novogradnje (/za-investitore):
 *   vrh -> 01 problem -> 02 klikabilan primer izbora stana -> 03 šta
 *   dobijate -> 04 kako radimo + šta nam treba -> 05 pitanja -> kontakt.
 *
 * Za sada SKRIVENA: noindex, nema je u meniju, podnožju ni sitemap-u.
 * Vlasnik link šalje investitorima direktno; u meni ide kad bude snimljena
 * prava tura dronom (vlasnik, 2. 10. 2026).
 *
 * Deli CSS i komponente sa ostalim stranama (SITE_STYLES, ContactForm);
 * stilovi samo za ovu stranu su u INVESTOR_STYLES, a primer (InvestorDemo)
 * koristi klase .inv-*.
 */

const PATH = '/za-investitore';
const copy = INVESTOR_COPY;

// Dugme "Prošetajte kroz stan" u primeru vodi na pravu turu iz vrha sajta.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: copy.meta.title },
  description: copy.meta.description,
  alternates: { canonical: PATH },
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: PATH,
    title: copy.meta.title,
    description: copy.meta.description,
    locale: 'sr_RS'
  }
};

const INVESTOR_STYLES = `
  /* 01 Problem: tri kartice. */
  .inv-pains{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:1.2rem;}
  @media (max-width:880px){ .inv-pains{grid-template-columns:1fr;} }
  .inv-pain{padding:clamp(1.3rem,3vw,1.9rem);}
  .inv-pain b{display:block; font-family:var(--font-display); font-size:1.2rem; line-height:1.3;}
  .inv-pain p{margin:.6rem 0 0; color:var(--ink-soft); font-size:.97rem;}

  /* 03 Šta dobijate: šest kartica. */
  .inv-offer{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:1.2rem;}
  @media (max-width:980px){ .inv-offer{grid-template-columns:repeat(2,minmax(0,1fr));} }
  @media (max-width:620px){ .inv-offer{grid-template-columns:1fr;} }
  .inv-offer .card{padding:1.5rem;}
  .inv-offer i{display:inline-grid; place-items:center; width:2.6rem; height:2.6rem; border-radius:14px; background:var(--accent-soft); color:var(--accent); font-style:normal; font-weight:800; font-size:1.15rem;}
  .inv-offer h3{font-size:1.1rem; margin-top:.9rem;}
  .inv-offer p{margin:.45rem 0 0; color:var(--ink-soft); font-size:.95rem;}

  /* 04 Šta nam treba od vas. */
  .inv-needs{grid-column:1 / -1; padding:1.4rem 1.6rem;}
  .inv-needs h3{font-size:1.1rem;}
  .inv-needs ul{list-style:none; margin:.9rem 0 0; padding:0; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.55rem 2rem;}
  @media (max-width:720px){ .inv-needs ul{grid-template-columns:1fr;} }
  .inv-needs li{display:flex; gap:.6rem; font-size:.97rem;}
  .inv-needs li::before{content:"✓"; color:var(--accent); font-weight:700; flex:none;}


  .contact-line{display:flex; flex-wrap:wrap; gap:.4rem 1.6rem; font-size:.95rem; color:var(--ink-soft); grid-column:1 / -1;}
  #kontakt .contact-form{grid-column:1 / -1;}
  .contact-line a{color:inherit; text-decoration:none;}
`;

export default async function InvestorPage() {
  const { nav, hero, problem, demo, offer, steps, faq, contact } = copy;
  const address = [CONTACT.street, CONTACT.city].filter(Boolean).join(', ');

  const tours = await getShowcaseTours('sr');
  const heroTour = pickHeroTour(tours, 'sr');
  const tourUrl = heroTour ? tourHref(heroTour.slug, heroTour.languages, 'sr') : null;
  const tourPreview = heroTour?.rooms[0]?.previewUrl ?? heroTour?.coverUrl ?? null;

  return (
    <div lang="sr" style={{ display: 'contents' }}>
      <style dangerouslySetInnerHTML={{ __html: SITE_STYLES + SELECTOR_STYLES + INVESTOR_STYLES }} />
      <SiteTracker />
      <NavScrollSpy />

      <SiteNav brandHref="/" brandAria={nav.brandAria} cta={{ href: '#kontakt', label: nav.cta, track: 'cta:investor_nav' }}>
        {/* Redosled mora da prati redosled sekcija - vidi NavScrollSpy. */}
        <li><a href="#problem">{nav.problem}</a></li>
        <li><a href="#primer">{nav.demo}</a></li>
        <li><a href="#paket">{nav.offer}</a></li>
        <li><a href="#kako-radi">{nav.steps}</a></li>
        <li><a href="#pitanja">{nav.faq}</a></li>
        <li className="nav-lang"><Link href="/">{nav.home}</Link></li>
      </SiteNav>

      <main>
        <section className="hero hero-solo" id="pocetna">
          <div className="wrap">
            <div>
              <span className="eyebrow">{hero.eyebrow}</span>
              <h1>{accent(hero.title)}</h1>
              <p className="lede">{hero.lede}</p>
              <div className="hero-ctas">
                <a className="btn btn-primary" href="#kontakt" data-track="cta:investor_hero_contact">{hero.ctaContact}</a>
                <a className="btn btn-secondary" href="#primer" data-track="cta:investor_hero_demo">{hero.ctaDemo}</a>
              </div>
              <div className="trust">
                {hero.trust.map((item) => (
                  <span key={item} className="chip">{item}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="band" id="problem">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{problem.eyebrow}</span>
              <h2>{accent(problem.title)}</h2>
              <p className="note">{problem.note}</p>
            </div>
            <div className="inv-pains">
              {problem.items.map((item) => (
                <div key={item.title} className="card inv-pain">
                  <b>{item.title}</b>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="primer">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{demo.eyebrow}</span>
              <h2>{accent(demo.title)}</h2>
              <p className="note">{demo.note}</p>
              <span className="inv-badge-note">{demo.badge}</span>
            </div>
            <InvestorDemo tourUrl={tourUrl} tourPreview={tourPreview} />
          </div>
        </section>

        <section className="band" id="paket">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{offer.eyebrow}</span>
              <h2>{accent(offer.title)}</h2>
              <p className="note">{offer.note}</p>
            </div>
            <div className="inv-offer">
              {offer.items.map((item) => (
                <div key={item.title} className="card">
                  <i aria-hidden="true">{item.icon}</i>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="kako-radi">
          <div className="wrap steps-split">
            <div className="section-head left">
              <span className="eyebrow">{steps.eyebrow}</span>
              <h2>{accent(steps.title)}</h2>
              <p className="note">{steps.note}</p>
            </div>
            <div className="steps-row">
              {steps.items.map((item, i) => (
                <div key={item.title} className={i === steps.items.length - 1 ? 'card step is-dark' : 'card step'}>
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
            <div className="card inv-needs">
              <h3>{steps.needs.title}</h3>
              <ul>
                {steps.needs.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        </section>

        <section className="band" id="pitanja">
          <div className="wrap faq-split">
            <div className="section-head left">
              <span className="eyebrow">{faq.eyebrow}</span>
              <h2>{accent(faq.title)}</h2>
              <p className="note">{faq.note}</p>
            </div>
            <div className="faq-list">
              {faq.items.map((item) => (
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
                <h2>{accent(contact.title)}</h2>
                <p className="note">{contact.note}</p>
              </div>
              <div className="quick-contact">
                <a className="btn btn-secondary btn-sm qc-phone" href={CONTACT_LINKS.phone} data-track="contact:phone">
                  <span className="qc-dot" />{contact.call}
                </a>
                <a className="btn btn-secondary btn-sm qc-viber" href={CONTACT_LINKS.viber} data-track="contact:viber">
                  <span className="qc-dot" />Viber
                </a>
                <a className="btn btn-secondary btn-sm qc-wa" href={whatsappLink('sr')} target="_blank" rel="noopener noreferrer" data-track="contact:whatsapp">
                  <span className="qc-dot" />WhatsApp
                </a>
              </div>
            </div>
            <ContactForm lang="sr" variant="investor" />
            <p className="contact-line">
              <a href={CONTACT_LINKS.phone} data-track="contact:phone">{CONTACT.phoneDisplay}</a>
              <a href={CONTACT_LINKS.email} data-track="contact:email">{CONTACT.email}</a>
              <a href={CONTACT_LINKS.map} target="_blank" rel="noopener noreferrer" data-track="contact:map">{address} ↗</a>
              <span>{contact.hours}</span>
            </p>
          </div>
        </section>
      </main>

      <SiteFooter note={copy.footer} />
    </div>
  );
}
