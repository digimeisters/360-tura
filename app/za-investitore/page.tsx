import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav, SiteFooter } from '../../components/SiteChrome';
import ContactForm from '../../components/ContactForm';
import InvestorDemo, { Building } from '../../components/InvestorDemo';
import InvestorHeroDevice from '../../components/InvestorHeroDevice';
import SiteTracker from '../../components/SiteTracker';
import NavScrollSpy from '../../components/NavScrollSpy';
import { IconPhone } from '../../components/SiteIcons';
import { SITE_STYLES } from '../lib/siteStyles';
import { SELECTOR_STYLES } from '../../components/projekat/selectorStyles';
import { INVESTOR_COPY } from '../lib/investorCopy';
import { accent } from '../lib/accent';
import { CONTACT, CONTACT_LINKS, SITE_NAME, whatsappLink } from '../lib/site';
import { tourHref } from '../lib/tourHref';
import { getShowcaseTours, pickHeroTour } from '../lib/showcaseTours';

/**
 * Prodajna strana za investitore novogradnje (/za-investitore). Raspored i
 * elementi prate /za-agencije (vlasnik, 2. 10. 2026: „uskladi se sa stilom
 * celog sajta"):
 *   vrh (živa zgrada u okviru .device) -> 01 prodaja danas / sa nama (dve
 *   kolone kao „nedelja") -> 02 klikabilan primer -> 03 kupac (četiri
 *   ekrana telefona) -> 04 vaša prodaja (tamna sekcija + kartica) -> plava
 *   traka -> 05 paket (.feat-grid) -> 06 kako radimo -> 07 pitanja -> kontakt.
 *
 * Za sada SKRIVENA: noindex, nema je u meniju, podnožju ni sitemap-u.
 * Vlasnik link šalje investitorima direktno.
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
  /* Vrh: živa zgrada u okviru uređaja (.device iz SITE_STYLES). */
  .inv-hero-device{background:linear-gradient(180deg,#DCE8F7 0%,#F6F8FC 100%);}
  .inv-hero-device::after{display:none;}
  .inv-hero-art{position:absolute; inset:52px 0 92px; display:flex; align-items:flex-end; justify-content:center;}
  .inv-hero-art svg{display:block; height:100%; width:auto; max-width:100%;}
  /* Nebo crta sam okvir - nebo iz crteža zgrade bi bilo vidljiv svetliji pravougaonik. */
  .inv-hero-art svg > rect:first-of-type, .ph-building svg > rect:first-of-type{fill:none;}
  .inv-hero-art .inv-hl{transition:y .55s cubic-bezier(.2,.8,.2,1);}
  .inv-hero-info{grid-template-columns:1fr auto;}
  .inv-hero-units{display:flex; gap:4px; margin-top:.35rem;}
  .inv-hero-units i{font-style:normal; font-family:var(--font-display); font-size:.62rem; font-weight:800; color:#fff; border-radius:6px; padding:2px 6px;}
  .inv-hero-price{text-align:right;}
  .inv-hero-price small{display:block; font-size:.66rem; color:rgba(255,255,255,.8); white-space:nowrap;}
  .inv-hero-price b{display:block; font-family:var(--font-display); font-size:1.05rem; color:#fff; white-space:nowrap;}

  /* 01 Prodaja danas / sa Kvadrat360: dve kolone, levo siva, desno tamna (kao „nedelja" na /za-agencije). */
  .week-grid{display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1.6rem;}
  @media (max-width:880px){ .week-grid{grid-template-columns:1fr;} }
  .week-card{border-radius:30px; padding:clamp(1.4rem,3vw,2.5rem); background:color-mix(in srgb, var(--surface-2) 70%, var(--line-strong)); border:0;}
  .week-card.is-dark{background:#111113; box-shadow:0 30px 60px -20px rgba(17,17,19,.4);}
  .week-head{display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap;}
  .week-head h3{font-size:1.5rem; color:var(--ink-soft);}
  .week-card.is-dark .week-head h3{color:var(--ink);}
  .week-tag{font-size:.8rem; font-weight:700; color:var(--ink-faint); background:var(--surface); border-radius:999px; padding:.35rem .8rem;}
  .week-card.is-dark .week-tag{background:#1E5AA8; color:#FFFFFF;}
  .week-days{display:flex; flex-direction:column; gap:.85rem; margin-top:1.8rem;}
  .week-day{display:grid; grid-template-columns:3.6rem 1fr; gap:.9rem; background:var(--surface); border-radius:18px; padding:1.1rem 1.3rem;}
  .week-card.is-dark .week-day{background:#1C1C20; border:1px solid var(--line);}
  .week-day > b{font-family:var(--font-display); font-weight:800; color:var(--ink-faint);}
  .week-card.is-dark .week-day > b{color:var(--accent);}
  .week-day strong{display:block; font-weight:600; font-size:1rem; line-height:1.4;}
  .week-day span{display:block; font-size:.95rem; color:var(--ink-soft); margin-top:.25rem; line-height:1.5;}

  /* 02 Primer */
  .inv-demo-wrap{margin-top:.4rem;}

  /* 03 Kupac: četiri ekrana telefona duž vremenske linije. */
  .path{position:relative; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:1.6rem;}
  .path::before{content:""; position:absolute; left:8%; right:8%; top:1.25rem; height:2px; background:var(--line-strong);}
  @media (max-width:1100px){ .path{grid-template-columns:repeat(2,minmax(0,1fr)); row-gap:3rem;} .path::before{display:none;} }
  @media (max-width:560px){ .path{grid-template-columns:1fr;} }
  .path-step{position:relative; display:flex; flex-direction:column; align-items:center; gap:.9rem; text-align:center;}
  .path-time{background:#1E5AA8; color:#FFFFFF; font-family:var(--font-display); font-weight:800; font-size:.95rem; padding:.55rem 1.1rem; border-radius:999px;}
  .path-step:last-child .path-time{background:#111113;}
  .phone{width:min(100%,230px); aspect-ratio:4/3.4; border-radius:26px; background:#111113; padding:7px; box-shadow:0 16px 34px rgba(17,17,19,.18);}
  .phone-screen{width:100%; height:100%; border-radius:20px; overflow:hidden; position:relative; background:#FFFFFF; color:#111113; text-align:left;}
  .path-step h3{font-size:1.15rem;}
  .path-step h3 + p{font-size:.95rem; color:var(--ink-soft); max-width:26ch; margin:.4rem auto 0;}
  .ph-building{background:linear-gradient(180deg,#DCE8F7,#F6F8FC); display:flex; align-items:flex-end; justify-content:center;}
  /* Crtež ne sme da rastegne telefon - stoji apsolutno u ekranu fiksnih proporcija. */
  .ph-building svg{position:absolute; left:50%; bottom:0; transform:translateX(-50%); height:100%; width:auto;}
  .ph-plan{padding:.7rem; display:flex; flex-direction:column; gap:.45rem;}
  .ph-plan h4, .ph-unit h4, .ph-ask h4{margin:0; font-family:var(--font-display); font-size:.9rem;}
  .ph-units{flex:1; display:grid; grid-template-columns:1.1fr 1fr; grid-template-rows:1fr 1fr; gap:4px; border:3px solid #2B2D33; border-radius:4px; padding:3px; background:#F7F7F4;}
  .ph-units span{border-radius:3px; display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-weight:800; font-size:.8rem; border:2px solid;}
  .ph-units .s{background:#DCF3E4; border-color:#2E9E5B; color:#1F7A45;}
  .ph-units .r{background:#FCEFD3; border-color:#D99A1E; color:#9A6A0B;}
  .ph-units .p{background:#EFEFEF; border-color:#BDBDBD; color:#8A8A8A;}
  .ph-units .on{box-shadow:0 0 0 2px #1E5AA8 inset; outline:2px solid #1E5AA8;}
  .ph-unit{padding:.6rem .7rem; display:flex; flex-direction:column; gap:.35rem;}
  .ph-unit-head{display:flex; justify-content:space-between; align-items:center; gap:.4rem;}
  .ph-unit .ph-badge{font-size:.62rem; font-weight:800; background:#DCF3E4; color:#1F7A45; border-radius:999px; padding:2px 7px;}
  .ph-facts{display:grid; grid-template-columns:1fr 1fr; gap:4px;}
  .ph-facts span{background:#F6F8FC; border-radius:8px; padding:4px 6px; font-size:.62rem; color:#6B7280;}
  .ph-facts b{display:block; font-family:var(--font-display); font-size:.78rem; color:#111113;}
  .ph-price{display:flex; justify-content:space-between; align-items:baseline; font-size:.62rem; color:#6B7280;}
  .ph-price b{font-family:var(--font-display); font-size:1rem; color:#111113;}
  .ph-btn{display:block; text-align:center; border-radius:999px; padding:.5rem; font-size:.7rem; font-weight:700; background:#1E5AA8; color:#FFFFFF;}
  .ph-ask{padding:.75rem; display:flex; flex-direction:column; gap:.45rem;}
  .ph-field{border:1.5px solid #D5DEEB; border-radius:9px; padding:.4rem .55rem; font-size:.68rem; color:#6B7280;}
  .ph-ok{margin-top:auto; background:#DCF3E4; color:#1F7A45; border-radius:10px; padding:.5rem .6rem; font-size:.7rem; font-weight:700; text-align:center;}
  .path-end{display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:.8rem 1.2rem; margin-top:2rem; padding:1rem 1.3rem; border-radius:18px; background:var(--accent-soft); color:var(--ink); font-weight:600;}

  /* 04 Vaša prodaja: tamna sekcija, kartica prodaje u beloj kartici (kao „vlasnik" na /za-agencije). */
  .owner .wrap{display:grid; grid-template-columns:1fr 1fr; gap:clamp(2rem,5vw,4.5rem); align-items:center;}
  @media (max-width:900px){ .owner .wrap{grid-template-columns:1fr;} }
  .owner-points{list-style:none; margin:2rem 0 0; padding:0; display:flex; flex-direction:column; gap:.85rem;}
  .owner-points li{display:flex; gap:.75rem; font-size:1.05rem;}
  .owner-points li::before{content:"✓"; color:var(--accent); font-weight:700; flex:none;}
  .report-card{background:#FFFFFF; color:#111113; border-radius:28px; padding:clamp(1.3rem,3vw,2rem); box-shadow:0 30px 70px rgba(0,0,0,.5);}
  .report-head{display:flex; justify-content:space-between; align-items:baseline; gap:1rem;}
  .report-head strong{font-family:var(--font-display); font-size:1.15rem;}
  .report-head span{font-size:.75rem; color:#8C8E93;}
  .sc-inq{margin-top:1rem; background:#FFFBEB; border:1.5px solid #F2C46D; border-radius:16px; padding:.75rem .9rem; display:flex; justify-content:space-between; align-items:center; gap:.8rem;}
  .sc-inq b{display:block; font-size:.85rem; color:#B45309;}
  .sc-inq small{font-size:.8rem; color:#374151;}
  .sc-inq span{font-size:.72rem; font-weight:700; background:#1E5AA8; color:#fff; border-radius:999px; padding:.35rem .7rem; white-space:nowrap;}
  .sc-unit{display:flex; justify-content:space-between; align-items:center; gap:.8rem; margin-top:.6rem; padding:.6rem .7rem; border:1px solid #E3E8F1; border-radius:14px;}
  .sc-unit b{font-family:var(--font-display); font-size:.95rem;}
  .sc-seg{display:flex; gap:3px; background:#EEF2F8; border-radius:10px; padding:3px;}
  .sc-seg i{font-style:normal; font-size:.68rem; font-weight:700; color:#5B5D63; padding:.3rem .5rem; border-radius:8px;}
  .sc-seg i.s{background:#2E9E5B; color:#fff;} .sc-seg i.r{background:#D99A1E; color:#fff;} .sc-seg i.p{background:#6B6B6B; color:#fff;}
  .rooms-title{font-size:.72rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#5B5D63; margin:1.3rem 0 .7rem;}
  .room-bar{display:grid; grid-template-columns:3.2rem 1fr auto; gap:.8rem; align-items:center; font-size:.85rem; margin-bottom:.55rem;}
  .room-bar > span{height:10px; border-radius:999px; background:#F1F1EC; overflow:hidden;}
  .room-bar > span i{display:block; height:100%; border-radius:999px; background:#1E5AA8;}
  .room-bar small{font-size:.75rem; color:#5B5D63; white-space:nowrap;}

  /* 06 Šta nam treba od vas. */
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
  const { nav, hero, compare, demo, buyer, sales, midCta, offer, steps, faq, contact } = copy;
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
        <li><a href="#danas">{nav.compare}</a></li>
        <li><a href="#primer">{nav.demo}</a></li>
        <li><a href="#kupac">{nav.buyer}</a></li>
        <li><a href="#prodaja">{nav.sales}</a></li>
        <li><a href="#paket">{nav.offer}</a></li>
        <li><a href="#pitanja">{nav.faq}</a></li>
        <li className="nav-lang"><Link href="/">{nav.home}</Link></li>
      </SiteNav>

      <main>
        {/* Vrh: obećanje i živa zgrada jedno pored drugog. */}
        <section className="hero" id="pocetna">
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
            <InvestorHeroDevice project={hero.device.project} freeLabel={hero.device.floorCard} unitLabel={hero.device.unitLabel} />
          </div>
        </section>

        {/* 01 Prodaja danas i sa Kvadrat360. */}
        <section className="band" id="danas">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{compare.eyebrow}</span>
              <h2>{accent(compare.title)}</h2>
              <p className="note">{compare.note}</p>
            </div>
            <div className="week-grid">
              {[compare.without, compare.with].map((side, i) => (
                <div key={side.title} className={i === 1 ? 'week-card is-dark' : 'week-card'}>
                  <div className="week-head">
                    <h3>{side.title}</h3>
                    <span className="week-tag">{side.tag}</span>
                  </div>
                  <div className="week-days">
                    {side.rows.map((d) => (
                      <div key={d.day} className="week-day">
                        <b>{d.day}</b>
                        <div>
                          <strong>{d.title}</strong>
                          <span>{d.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 02 Klikabilan primer. */}
        <section id="primer">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{demo.eyebrow}</span>
              <h2>{accent(demo.title)}</h2>
              <p className="note">{demo.note}</p>
              <span className="inv-badge-note">{demo.badge}</span>
            </div>
            <div className="inv-demo-wrap">
              <InvestorDemo tourUrl={tourUrl} tourPreview={tourPreview} />
            </div>
          </div>
        </section>

        {/* 03 Kupac: od linka do upita, ekran po ekran. */}
        <section className="band" id="kupac">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{buyer.eyebrow}</span>
              <h2>{accent(buyer.title)}</h2>
              <p className="note">{buyer.note}</p>
            </div>
            <div className="path">
              <div className="path-step">
                <span className="path-time">{buyer.steps[0].time}</span>
                <div className="phone" aria-hidden="true">
                  <div className="phone-screen ph-building">
                    <Building highlight={4} />
                  </div>
                </div>
                <div><h3>{buyer.steps[0].title}</h3><p>{buyer.steps[0].text}</p></div>
              </div>

              <div className="path-step">
                <span className="path-time">{buyer.steps[1].time}</span>
                <div className="phone" aria-hidden="true">
                  <div className="phone-screen ph-plan">
                    <h4>4. sprat</h4>
                    <div className="ph-units">
                      <span className="s on">4A</span>
                      <span className="s">4B</span>
                      <span className="r">4C</span>
                      <span className="s">4D</span>
                    </div>
                  </div>
                </div>
                <div><h3>{buyer.steps[1].title}</h3><p>{buyer.steps[1].text}</p></div>
              </div>

              <div className="path-step">
                <span className="path-time">{buyer.steps[2].time}</span>
                <div className="phone" aria-hidden="true">
                  <div className="phone-screen ph-unit">
                    <div className="ph-unit-head">
                      <h4>Stan 4A</h4>
                      <span className="ph-badge">Slobodan</span>
                    </div>
                    <div className="ph-facts">
                      <span>Površina<b>54 m²</b></span>
                      <span>Terasa<b>6 m²</b></span>
                    </div>
                    <div className="ph-price">
                      <span>1.810 €/m²</span>
                      <b>97.700 €</b>
                    </div>
                    <span className="ph-btn">360° · Prošetajte kroz stan</span>
                  </div>
                </div>
                <div><h3>{buyer.steps[2].title}</h3><p>{buyer.steps[2].text}</p></div>
              </div>

              <div className="path-step">
                <span className="path-time">{buyer.steps[3].time}</span>
                <div className="phone" aria-hidden="true">
                  <div className="phone-screen ph-ask">
                    <h4>Upit za stan 4A</h4>
                    <span className="ph-field">Marko Petrović</span>
                    <span className="ph-field">06x xxx xxxx</span>
                    <span className="ph-ok">✓ Upit je stigao prodaji</span>
                  </div>
                </div>
                <div><h3>{buyer.steps[3].title}</h3><p>{buyer.steps[3].text}</p></div>
              </div>
            </div>
            <div className="path-end">
              <span>{buyer.end.text}</span>
              <a className="btn btn-primary btn-sm" href="#kontakt" data-track="cta:investor_story_end">{buyer.end.cta}</a>
            </div>
          </div>
        </section>

        {/* 04 Vaša prodaja: link za prodaju, upiti, izveštaj (primer). */}
        <section className="owner is-dark" id="prodaja">
          <div className="wrap">
            <div>
              <div className="section-head left">
                <span className="eyebrow">{sales.eyebrow}</span>
                <h2>{accent(sales.title)}</h2>
                <p className="note">{sales.text}</p>
              </div>
              <ul className="owner-points">
                {sales.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            </div>
            <div className="report-card" aria-label={sales.card.title}>
              <div className="report-head">
                <strong>{sales.card.title}</strong>
                <span>{sales.card.badge}</span>
              </div>
              <div className="sc-inq">
                <div>
                  <b>{sales.card.inquiry}</b>
                  <small>{sales.card.inquiryWho}</small>
                </div>
                <span>Javio sam se</span>
              </div>
              {[
                { code: '6B', on: 's' },
                { code: '4C', on: 'r' },
                { code: '2A', on: 'p' }
              ].map((u) => (
                <div key={u.code} className="sc-unit">
                  <b>Stan {u.code}</b>
                  <span className="sc-seg">
                    <i className={u.on === 's' ? 's' : undefined}>Slobodan</i>
                    <i className={u.on === 'r' ? 'r' : undefined}>Rezerv.</i>
                    <i className={u.on === 'p' ? 'p' : undefined}>Prodat</i>
                  </span>
                </div>
              ))}
              <div className="rooms-title">{sales.card.topTitle}</div>
              {sales.card.top.map((row) => (
                <div key={row.code} className="room-bar">
                  <b>{row.code}</b>
                  <span><i style={{ width: `${row.pct}%` }} /></span>
                  <small>{row.views}</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Poziv na sredini - kao plava traka na /za-agencije. */}
        <section id="razgovor" className="mid-cta-sec">
          <div className="wrap mid-cta">
            <div className="mid-cta-text">
              <h2>{accent(midCta.title)}</h2>
              <ul>
                {midCta.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            </div>
            <div className="mid-cta-actions">
              <a className="btn btn-primary" href="#kontakt" data-track="cta:investor_mid">{midCta.button}</a>
              <a className="btn btn-secondary" href={CONTACT_LINKS.phone} data-track="contact:phone"><IconPhone /> {midCta.call}</a>
            </div>
          </div>
        </section>

        {/* 05 Paket. */}
        <section className="band" id="paket">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{offer.eyebrow}</span>
              <h2>{accent(offer.title)}</h2>
              <p className="note">{offer.note}</p>
            </div>
            <div className="feat-grid n-3">
              {offer.items.map((item) => (
                <div key={item.title} className="card feat">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 06 Kako radimo + šta nam treba. */}
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

        {/* 07 Pitanja. */}
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

        {/* Kontakt. */}
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
