import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav, SiteFooter } from '../../components/SiteChrome';
import ContactForm from '../../components/ContactForm';
import HeroDevice from '../../components/HeroDevice';
import PriceCalculator from '../../components/PriceCalculator';
import PromoBanner from '../../components/PromoBanner';
import PromoTopBar from '../../components/PromoTopBar';
import FromPrice from '../../components/FromPrice';
import { PlanItemList, PlanPrice, SaleSticker } from '../../components/PromoPrice';
import SiteTracker from '../../components/SiteTracker';
import NavScrollSpy from '../../components/NavScrollSpy';
import TourModulesShowcase from '../../components/TourModulesShowcase';
import { SITE_STYLES } from '../lib/siteStyles';
import { AGENCY_COPY } from '../lib/agencyCopy';
import { HOME_COPY } from '../lib/homeCopy';
import { accent, plainAccent } from '../lib/accent';
import { CONTACT, CONTACT_LINKS, SITE_NAME, SITE_URL, whatsappLink } from '../lib/site';
import { serializeJsonLd } from '../lib/structuredData';
import { CONTACT_PACKAGES } from '../lib/pricing';
import { getShowcaseTours, pickHeroTour } from '../lib/showcaseTours';

/**
 * Prodajna strana za agencije (/za-agencije), ispričana kao jedna nedelja
 * agenta u Kragujevcu:
 *   vrh (prava tura) -> 01 nedelja bez/sa turom -> 02 kupac (četiri ekrana
 *   telefona) -> 03 vlasnik i izveštaj -> 04 šest koristi -> 05 brojke iz
 *   sveta -> 06 kako radimo -> cene -> pitanja -> kontakt.
 *
 * Deli CSS i komponente sa početnom stranom (SITE_STYLES, HeroDevice,
 * ContactForm, PriceCalculator), a cene čita iz istih paketa kao početna -
 * da se brojevi ne razdvoje. Stilovi koji postoje samo ovde su u
 * AGENCY_STYLES ispod.
 *
 * Za sada samo srpski; engleska verzija ide istim putem kad zatreba.
 */

const PATH = '/za-agencije';
const copy = AGENCY_COPY;

// Paketi za agencije su isti oni sa početne strane (jedan izvor cena);
// pojedinačna tura ovde ne pripada, ta publika je na početnoj.
const AGENCY_PLANS = HOME_COPY.sr.pricing.plans.filter((plan) => plan.track !== 'price_single');

// Strana se osvežava kao početna - tura u vrhu prati objavljene ture.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: copy.meta.title },
  description: copy.meta.description,
  alternates: { canonical: PATH },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: PATH,
    title: copy.meta.title,
    description: copy.meta.description,
    locale: 'sr_RS'
  }
};

function jsonLd() {
  const pageUrl = `${SITE_URL}${PATH}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': pageUrl,
        url: pageUrl,
        name: copy.meta.title,
        description: copy.meta.description,
        inLanguage: 'sr',
        isPartOf: { '@type': 'WebSite', url: SITE_URL, name: SITE_NAME }
      },
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#pitanja`,
        url: pageUrl,
        inLanguage: 'sr',
        name: plainAccent(copy.faq.title),
        mainEntity: copy.faq.items.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer }
        }))
      }
    ]
  };
}

const AGENCY_STYLES = `
  /* 01 Nedelja: dve kolone, levo siva, desno tamna. */
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

  /* 02 Kupac: četiri ekrana telefona duž vremenske linije. */
  .path{position:relative; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:1.6rem;}
  .path::before{content:""; position:absolute; left:8%; right:8%; top:1.25rem; height:2px; background:var(--line-strong);}
  @media (max-width:1100px){ .path{grid-template-columns:repeat(2,minmax(0,1fr)); row-gap:3rem;} .path::before{display:none;} }
  @media (max-width:560px){ .path{grid-template-columns:1fr;} }
  .path-step{position:relative; display:flex; flex-direction:column; align-items:center; gap:1.3rem; text-align:center;}
  .path-time{background:#1E5AA8; color:#FFFFFF; font-family:var(--font-display); font-weight:800; font-size:.95rem; padding:.55rem 1.1rem; border-radius:999px;}
  .path-step:last-child .path-time{background:#111113;}
  .phone{width:min(100%,250px); aspect-ratio:1/2; border-radius:38px; background:#111113; padding:10px; box-shadow:0 24px 50px rgba(17,17,19,.22);}
  .phone-screen{width:100%; height:100%; border-radius:30px; overflow:hidden; position:relative; background:#FFFFFF; color:#111113; text-align:left;}
  .phone-screen img{position:absolute; inset:0; width:100%; height:100%; object-fit:cover;}
  .path-step h3{font-size:1.15rem;}
  .path-step h3 + p{font-size:.95rem; color:var(--ink-soft); max-width:26ch; margin:.4rem auto 0;}
  .chat{background:#EDE9F7; display:flex; flex-direction:column; gap:.6rem; padding:1.1rem .85rem; font-size:.8rem; line-height:1.4;}
  .chat-app{font-weight:700; color:#5B4FB3; text-align:center; font-size:.75rem;}
  .chat-msg{align-self:flex-start; max-width:85%; background:#FFFFFF; border-radius:16px 16px 16px 4px; padding:.65rem .75rem;}
  .chat-card{display:block; align-self:flex-start; width:85%; background:#FFFFFF; border-radius:14px; overflow:hidden;}
  .chat-card-img{display:block; position:relative; height:90px; background:#E4E4DE;}
  .chat-card-text{display:block; padding:.5rem .65rem; font-size:.75rem;}
  .chat-card small{display:block; color:#8C8E93;}
  .chat-reply{align-self:flex-end; max-width:78%; background:#7360F2; color:#FFFFFF; border-radius:16px 16px 4px 16px; padding:.65rem .75rem;}
  .ph-chip{position:absolute; top:12px; left:10px; background:rgba(15,23,42,.5); color:#FFFFFF; border:1px solid rgba(255,255,255,.6); border-radius:999px; padding:3px 9px; font-size:.68rem; font-weight:700;}
  .ph-card{position:absolute; left:8px; right:8px; bottom:10px; background:rgba(15,23,42,.66); color:#FFFFFF; border-radius:14px; padding:.7rem;}
  .ph-card small{display:block; font-size:.6rem; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:#7FB0EC;}
  .ph-card b{display:block; font-family:var(--font-display); font-size:.82rem; margin-top:.2rem;}
  .ph-bar{height:4px; border-radius:999px; background:rgba(255,255,255,.2); margin-top:.55rem;}
  .ph-bar i{display:block; width:45%; height:100%; border-radius:999px; background:#5B92D6;}
  .plan-screen{padding:1.2rem .9rem; display:flex; flex-direction:column; gap:.8rem;}
  .plan-screen h4{margin:0; font-family:var(--font-display); font-size:.95rem;}
  .mini-plan{position:relative; height:52%; border:4px solid #2B2D33; background:#F7F7F4;}
  .mini-plan .wall-h{position:absolute; left:0; right:0; top:50%; border-top:4px solid #2B2D33;}
  .mini-plan .wall-v{position:absolute; left:55%; top:50%; bottom:0; border-left:4px solid #2B2D33;}
  .mini-plan em{position:absolute; font-family:var(--font-body); font-style:normal; font-size:.66rem; font-weight:700; color:#2B2D33; line-height:1;}
  .mini-plan .dot{position:absolute; width:13px; height:13px; border-radius:50%; border:3px solid #FFFFFF; background:rgba(15,23,42,.55);}
  .mini-plan .dot.seen{background:#FFFFFF; border-color:#334155;}
  .mini-plan .dot.here{background:#5B92D6; width:16px; height:16px;}
  .mini-plan .dot.here::after{content:""; position:absolute; inset:-7px; border-radius:50%; border:2px solid #5B92D6; animation:agPulse 1.8s ease-out infinite;}
  @keyframes agPulse{from{transform:scale(.6); opacity:1} to{transform:scale(1.7); opacity:0}}
  .plan-screen p{font-size:.7rem; color:#5B5D63; line-height:1.5;}
  .agent-screen{padding:1.2rem .9rem; display:flex; flex-direction:column; gap:.7rem;}
  .agent-screen h4{margin:0; font-family:var(--font-display); font-size:.95rem;}
  .agent-row{display:flex; align-items:center; gap:.6rem; background:#F1F1EC; border-radius:14px; padding:.7rem;}
  .agent-row i{width:36px; height:36px; border-radius:50%; background:#1E5AA8; color:#FFFFFF; display:grid; place-items:center; font-style:normal; font-weight:800;}
  .agent-row b{display:block; font-size:.8rem;}
  .agent-row small{font-size:.72rem; color:#5B5D63;}
  .ph-btn{display:block; text-align:center; border-radius:999px; padding:.7rem; font-size:.78rem; font-weight:700; background:#1E5AA8; color:#FFFFFF;}
  .ph-btn.alt{background:none; border:2px solid #1E5AA8; color:#1E5AA8;}
  .agent-screen p{margin-top:auto; font-size:.72rem; color:#5B5D63; text-align:center; line-height:1.5;}

  /* 03 Vlasnik: tamna sekcija, izveštaj u beloj kartici. */
  .owner .wrap{display:grid; grid-template-columns:1fr 1fr; gap:clamp(2rem,5vw,4.5rem); align-items:center;}
  @media (max-width:900px){ .owner .wrap{grid-template-columns:1fr;} }
  .owner-points{list-style:none; margin:2rem 0 0; padding:0; display:flex; flex-direction:column; gap:.85rem;}
  .owner-points li{display:flex; gap:.75rem; font-size:1.05rem;}
  .owner-points li::before{content:"✓"; color:var(--accent); font-weight:700; flex:none;}
  .report-card{background:#FFFFFF; color:#111113; border-radius:28px; padding:clamp(1.3rem,3vw,2rem); box-shadow:0 30px 70px rgba(0,0,0,.5);}
  .report-head{display:flex; justify-content:space-between; align-items:baseline; gap:1rem;}
  .report-head strong{font-family:var(--font-display); font-size:1.15rem;}
  .report-head span{font-size:.75rem; color:#8C8E93;}
  .kpi-grid{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.7rem; margin-top:1.2rem;}
  .kpi{background:#F1F1EC; border-radius:14px; padding:.9rem;}
  .kpi small{display:block; font-size:.72rem; color:#5B5D63;}
  .kpi b{display:block; font-family:var(--font-display); font-size:1.8rem; font-weight:800; line-height:1.2;}
  .kpi i{font-style:normal; font-size:.72rem; font-weight:700; color:#15803d;}
  .rooms-title{font-size:.72rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#5B5D63; margin:1.4rem 0 .7rem;}
  .room-bar{display:grid; grid-template-columns:8rem 1fr; gap:.8rem; align-items:center; font-size:.85rem; margin-bottom:.55rem;}
  .room-bar span{height:10px; border-radius:999px; background:#F1F1EC; overflow:hidden;}
  .room-bar span i{display:block; height:100%; border-radius:999px; background:#1E5AA8;}
  .report-chips{display:flex; flex-wrap:wrap; gap:.5rem; margin-top:1.3rem;}
  .report-chips span{background:#F1F1EC; border-radius:999px; padding:.4rem .8rem; font-size:.78rem; font-weight:700;}

  /* 05 Brojke iz sveta. */
  .proof-grid{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:clamp(1.5rem,4vw,3rem);}
  @media (max-width:820px){ .proof-grid{grid-template-columns:1fr;} }
  .proof-item{border-top:2px solid var(--ink); padding-top:1.4rem;}
  .proof-item b{display:block; font-family:var(--font-display); font-weight:800; font-size:clamp(3rem,6vw,4.4rem); letter-spacing:-0.03em; color:var(--accent); line-height:1.05;}
  .proof-item p{font-size:1.1rem; margin-top:.4rem;}
  .proof-item small{display:block; font-size:.82rem; color:var(--ink-faint); margin-top:.6rem;}

  .embed-details{margin-top:1.4rem; overflow:hidden;}
  .embed-details summary{cursor:pointer; padding:1.1rem 1.5rem; font-weight:600; list-style:none; display:flex; justify-content:space-between; align-items:center; gap:1rem;}
  .embed-details summary::-webkit-details-marker{display:none;}
  .embed-details summary::after{content:"+"; font-size:1.3rem; color:var(--accent); line-height:1;}
  .embed-details[open] summary::after{content:"–";}
  .embed-body{padding:0 1.5rem 1.5rem;}
  .embed-body p{font-size:.92rem; color:var(--ink-soft); margin-bottom:.8rem;}

  .calc-details{margin-top:1.6rem;}
  .calc-details > summary{cursor:pointer; list-style:none; display:flex;}
  .calc-details > summary::-webkit-details-marker{display:none;}
  .calc-details[open] > summary{margin-bottom:1rem;}
  .contact-line{display:flex; flex-wrap:wrap; gap:.4rem 1.6rem; font-size:.95rem; color:var(--ink-soft); grid-column:1 / -1;}
  /* Ovde nema kartica sa kontaktom desno od forme (kraći red ispod nje), pa forma ide preko cele širine. */
  #kontakt .contact-form{grid-column:1 / -1;}
  .contact-line a{color:inherit; text-decoration:none;}
`;

export default async function AgencyPage() {
  const { nav, hero, week, buyer, owner, benefits, proof, steps, contact } = copy;
  const address = [CONTACT.street, CONTACT.city].filter(Boolean).join(', ');

  const tours = await getShowcaseTours('sr');
  const heroTour = pickHeroTour(tours, 'sr');
  // Za primer u kodu za ugradnju i za ekrane telefona - prava, otvorena
  // tura, ne izmišljen link ni tuđa fotografija.
  const exampleSlug = heroTour?.slug ?? tours[0]?.slug ?? 'naziv-ture';
  const room = heroTour?.rooms[1] ?? heroTour?.rooms[0] ?? null;
  const roomPhoto = room?.previewUrl ?? heroTour?.coverUrl ?? null;
  // Na ekranu vodiča stoji pravi naziv te sobe, da natpis i slika ne kažu različito.
  const roomIndex = room && heroTour ? heroTour.rooms.indexOf(room) + 1 : 0;
  const guideChip = room && heroTour ? `${room.title} · ${roomIndex}/${heroTour.rooms.length}` : buyer.guide.room;
  const guideCaption = room?.title ?? buyer.guide.caption;

  return (
    <div lang="sr" style={{ display: 'contents' }}>
      <style dangerouslySetInnerHTML={{ __html: SITE_STYLES + AGENCY_STYLES }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd()) }} />
      <SiteTracker />
      <NavScrollSpy />
      <PromoTopBar lang="sr" href="#paketi" />

      <SiteNav
        brandHref="/"
        brandAria={nav.brandAria}
        cta={{ href: '#kontakt', label: nav.cta, track: 'cta:agency_nav' }}
      >
        {/* Redosled mora da prati redosled sekcija - vidi NavScrollSpy. */}
        <li><a href="#nedelja">{nav.week}</a></li>
        <li><a href="#kupac">{nav.buyer}</a></li>
        <li><a href="#vlasnik">{nav.owner}</a></li>
        <li><a href="#koristi">{nav.benefits}</a></li>
        <li><a href="#paketi">{nav.packages}</a></li>
        <li><a href="#pitanja">{nav.faq}</a></li>
        <li><Link href="/blog">Blog</Link></li>
        <li className="nav-lang"><Link href="/">{nav.home}</Link></li>
      </SiteNav>

      <main>
        {/* Vrh: obećanje i prava tura jedno pored drugog. */}
        <section className="hero" id="pocetna">
          <div className="wrap">
            <div>
              <span className="eyebrow">{hero.eyebrow}</span>
              <h1>{accent(hero.title)}</h1>
              <p className="lede">{hero.lede}</p>
              <div className="hero-ctas">
                <a className="btn btn-primary" href="#kontakt" data-track="cta:agency_hero_contact">{hero.ctaContact}</a>
                <a className="btn btn-secondary" href="#nedelja" data-track="cta:agency_hero_story">{hero.ctaStory}</a>
              </div>
              <div className="trust">
                {hero.trust.map((item) => (
                  <span key={item} className="chip">{item}</span>
                ))}
              </div>
            </div>
            <HeroDevice tour={heroTour} lang="sr" />
          </div>
        </section>

        {/* 01 Nedelja bez ture i sa turom. */}
        <section className="band" id="nedelja">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{week.eyebrow}</span>
              <h2>{accent(week.title)}</h2>
              <p className="note">{week.note}</p>
            </div>
            <div className="week-grid">
              {[week.without, week.with].map((side, i) => (
                <div key={side.title} className={i === 1 ? 'week-card is-dark' : 'week-card'}>
                  <div className="week-head">
                    <h3>{side.title}</h3>
                    <span className="week-tag">{side.tag}</span>
                  </div>
                  <div className="week-days">
                    {side.days.map((d) => (
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

        {/* 02 Kupac: od poruke do poziva, ekran po ekran. */}
        <section id="kupac">
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
                  <div className="phone-screen chat">
                    <span className="chat-app">{buyer.chat.app}</span>
                    <span className="chat-msg">{buyer.chat.message}</span>
                    <span className="chat-card">
                      <span className="chat-card-img">
                        {/* eslint-disable-next-line @next/next/no-img-element -- sličica ture sa CDN-a */}
                        {roomPhoto && <img src={roomPhoto} alt="" loading="lazy" />}
                      </span>
                      <span className="chat-card-text"><b>{buyer.chat.card}</b><small>kvadrat360.com/tour/…</small></span>
                    </span>
                    <span className="chat-reply">{buyer.chat.reply}</span>
                  </div>
                </div>
                <div><h3>{buyer.steps[0].title}</h3><p>{buyer.steps[0].text}</p></div>
              </div>

              <div className="path-step">
                <span className="path-time">{buyer.steps[1].time}</span>
                <div className="phone" aria-hidden="true">
                  <div className="phone-screen">
                    {/* eslint-disable-next-line @next/next/no-img-element -- sličica ture sa CDN-a */}
                    {roomPhoto && <img src={roomPhoto} alt="" loading="lazy" />}
                    <span className="ph-chip">{guideChip}</span>
                    <span className="ph-card">
                      <small>{buyer.guide.label}</small>
                      <b>{guideCaption}</b>
                      <span className="ph-bar"><i /></span>
                    </span>
                  </div>
                </div>
                <div><h3>{buyer.steps[1].title}</h3><p>{buyer.steps[1].text}</p></div>
              </div>

              <div className="path-step">
                <span className="path-time">{buyer.steps[2].time}</span>
                <div className="phone" aria-hidden="true">
                  <div className="phone-screen plan-screen">
                    <h4>{buyer.plan.title}</h4>
                    <div className="mini-plan">
                      <span className="wall-h" />
                      <span className="wall-v" />
                      <em style={{ left: '12%', top: '20%' }}>{buyer.plan.rooms[0]}</em>
                      <em style={{ left: '8%', top: '66%' }}>{buyer.plan.rooms[1]}</em>
                      <em style={{ left: '60%', top: '66%' }}>{buyer.plan.rooms[2]}</em>
                      <span className="dot here" style={{ left: '55%', top: '26%' }} />
                      <span className="dot seen" style={{ left: '25%', top: '80%' }} />
                      <span className="dot" style={{ left: '75%', top: '80%' }} />
                    </div>
                    <p>{buyer.plan.legend}</p>
                  </div>
                </div>
                <div><h3>{buyer.steps[2].title}</h3><p>{buyer.steps[2].text}</p></div>
              </div>

              <div className="path-step">
                <span className="path-time">{buyer.steps[3].time}</span>
                <div className="phone" aria-hidden="true">
                  <div className="phone-screen agent-screen">
                    <h4>{buyer.contact.title}</h4>
                    <span className="agent-row"><i>A</i><span><b>{buyer.contact.agent}</b><small>{buyer.contact.agency}</small></span></span>
                    <span className="ph-btn">📞 {buyer.contact.call}</span>
                    <span className="ph-btn alt">{buyer.contact.book}</span>
                    <p>{buyer.contact.note}</p>
                  </div>
                </div>
                <div><h3>{buyer.steps[3].title}</h3><p>{buyer.steps[3].text}</p></div>
              </div>
            </div>
          </div>
        </section>

        {/* 03 Vlasnik stana i mesečni izveštaj (primer). */}
        <section className="owner is-dark" id="vlasnik">
          <div className="wrap">
            <div>
              <div className="section-head left">
                <span className="eyebrow">{owner.eyebrow}</span>
                <h2>{accent(owner.title)}</h2>
                <p className="note">{owner.text}</p>
              </div>
              <ul className="owner-points">
                {owner.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            </div>
            <div className="report-card" aria-label={owner.report.title}>
              <div className="report-head">
                <strong>{owner.report.title}</strong>
                <span>{owner.report.badge}</span>
              </div>
              <div className="kpi-grid">
                {owner.report.kpis.map((kpi) => (
                  <div key={kpi.label} className="kpi">
                    <small>{kpi.label}</small>
                    <b>{kpi.value}</b>
                    <i>{kpi.delta}</i>
                  </div>
                ))}
              </div>
              <div className="rooms-title">{owner.report.roomsTitle}</div>
              {owner.report.rooms.map((room) => (
                <div key={room.name} className="room-bar">
                  {room.name}
                  <span><i style={{ width: `${room.pct}%` }} /></span>
                </div>
              ))}
              <div className="report-chips">
                {owner.report.chips.map((chip) => <span key={chip}>{chip}</span>)}
              </div>
            </div>
          </div>
        </section>

        {/* 04 Šest koristi, jedna po jedna. */}
        <section id="koristi">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{benefits.eyebrow}</span>
              <h2>{accent(benefits.title)}</h2>
            </div>
            <div className="feat-grid n-3">
              {benefits.items.map((item) => (
                <div key={item.title} className="card feat">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
            <details className="card embed-details">
              <summary>{benefits.embed.summary}</summary>
              <div className="embed-body">
                <p>{benefits.embed.text}</p>
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
            </details>
          </div>
        </section>

        {/* Donji meni ture, predstavljen kao koristi. */}
        <section id="u-turi">
          <div className="wrap">
            <TourModulesShowcase copy={HOME_COPY.sr.modules} photoUrl={heroTour?.coverUrl ?? null} />
          </div>
        </section>

        {/* 05 Brojke iz sveta, sa izvorom. */}
        <section className="band">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{proof.eyebrow}</span>
              <h2>{accent(proof.title)}</h2>
            </div>
            <div className="proof-grid">
              {proof.items.map((item) => (
                <div key={item.value} className="proof-item">
                  <b>{item.value}</b>
                  <p>{item.label}</p>
                  <small>{item.source}</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 06 Kako radimo - isti raspored kao na početnoj. */}
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
          </div>
        </section>

        {/* Cene. */}
        <section className="band" id="paketi">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{copy.pricing.eyebrow}</span>
              <h2>
                {copy.pricing.titleStart} <em><FromPrice count={3} prefix="od " /></em>
              </h2>
              <p className="note">{copy.pricing.note}</p>
            </div>
            <PromoBanner lang="sr" />
            <div className="price-grid n-2">
              {AGENCY_PLANS.map((plan) => (
                <div key={plan.track} className={`card price-card${plan.track === 'price_basic' ? ' featured' : ''}`}>
                  {plan.badge && <span className="price-badge">{plan.badge}</span>}
                  <SaleSticker count={plan.count} packageType={plan.packageType} lang="sr" />
                  <span className="price-audience">{plan.audience}</span>
                  <h3>{plan.title}</h3>
                  <PlanPrice count={plan.count} packageType={plan.packageType} from={plan.from} unit={plan.unit} lang="sr" />
                  <PlanItemList items={plan.items} count={plan.count} lang="sr" />
                  <a className="btn btn-primary price-cta" href="#kontakt" data-track={`cta:agency_${plan.track}`}>
                    {plan.cta}
                  </a>
                </div>
              ))}
            </div>
            <p className="fine-print">{copy.pricing.fine}</p>
            <PriceCalculator lang="sr" />
          </div>
        </section>

        {/* Pitanja. */}
        <section id="pitanja">
          <div className="wrap faq-split">
            <div className="section-head left">
              <span className="eyebrow">{copy.faq.eyebrow}</span>
              <h2>{accent(copy.faq.title)}</h2>
              <p className="note">{copy.faq.note}</p>
            </div>
            <div className="faq-list">
              {copy.faq.items.map((item) => (
                <details key={item.question} className="card faq-item">
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Kontakt: kraj priče. */}
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
            <ContactForm lang="sr" defaultPackage={CONTACT_PACKAGES[1]} />
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
