import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { SiteNav, SiteFooter } from '../../components/SiteChrome';
import ContactForm from '../../components/ContactForm';
import InvestorDemo from '../../components/InvestorDemo';
import InvestorHeroDevice from '../../components/InvestorHeroDevice';
import InvestorHeroPhoto, { type HeroUnit } from '../../components/InvestorHeroPhoto';
import ProjectSelector from '../../components/projekat/ProjectSelector';
import { selectorProject } from '../../components/projekat/ProjectView';
import { getPublicProject, type ProjectPageData } from '../lib/projectData';
import { floorLabel, formatArea, formatPrice, statusLabel, structureText } from '../lib/projectI18n';
import type { UnitStatus } from '../lib/projects';
import SiteTracker from '../../components/SiteTracker';
import NavScrollSpy from '../../components/NavScrollSpy';
import SiteReveal from '../../components/SiteReveal';
import InvestorStory from '../../components/InvestorStory';
import { buildInvestorStory } from '../lib/investorStory';
import { IconPhone } from '../../components/SiteIcons';
import { INVESTOR_COPY } from '../lib/investorCopy';
import { accent } from '../lib/accent';
import { CONTACT, CONTACT_LINKS, SITE_NAME, whatsappLink } from '../lib/site';
import { tourHref } from '../lib/tourHref';
import { getShowcaseTours, pickHeroTour } from '../lib/showcaseTours';
import SiteStylesheets from '../../components/SiteStylesheets';

/**
 * Prodajna strana za investitore novogradnje (/za-investitore). Raspored i
 * elementi prate /za-agencije (vlasnik, 2. 10. 2026: „uskladi se sa stilom
 * celog sajta"):
 *   vrh (prava fotografija zgrade primera, InvestorHeroPhoto) -> 01 prodaja
 *   danas / sa nama -> 02 pravi izbor stana (ProjectSelector projekta
 *   DEMO_SLUG, sa dugmetom za ceo ekran) -> 03 kupac (četiri ekrana
 *   telefona) -> 04 vaša prodaja (tamna sekcija + kartica) -> plava traka ->
 *   05 postavljanje (mi unosimo cenovnik, osnove, fasadu) -> 06 paket ->
 *   07 kako radimo -> 08 pitanja -> kontakt.
 * Bez projekta primera (nije objavljen) vrh i primer padaju na stari crtež
 * izmišljenog projekta (InvestorHeroDevice, InvestorDemo).
 *
 * Javna od 15. 10. 2026 (vlasnik): u glavnom meniju (Usluge), podnožju i
 * sitemap-u, i Google je indeksira. Strane samih projekata (/novogradnja/...)
 * i dalje imaju svoja pravila.
 */

const PATH = '/za-investitore';
const copy = INVESTOR_COPY;
// Primer na strani: projekat sa našeg sajta (slug) - samo izmišljen ili projekat
// investitora koji je to dozvolio, nikad tuđi pravi projekat sa izmišljenim podacima.
// Od 14. 10. 2026: projekat klijenta Garić Invest (vlasnik). null = neimenovan crtež.
const DEMO_SLUG: string | null = 'jadranska-garic-invest';

/** Slika fasade sa najviše iscrtanih stanova i ti stanovi, za fotografiju u vrhu strane. */
function heroFromProject(data: ProjectPageData | null): { imageUrl: string; units: HeroUnit[] } | null {
  if (!data) return null;
  const best = data.views
    .filter((v) => v.kind === 'building')
    .map((v) => ({ v, n: v.shapes.filter((s) => s.target === 'unit').length }))
    .sort((a, b) => b.n - a.n)[0];
  if (!best || best.n < 3) return null;
  const floorById = new Map(data.floors.map((f) => [f.id, f]));
  const units = best.v.shapes.flatMap((s) => {
    const u = s.target === 'unit' ? data.units.find((x) => x.id === s.id) : null;
    const f = u ? floorById.get(u.floorId) : null;
    if (!u || !f) return [];
    return [
      {
        id: u.id,
        code: u.code,
        floor: floorLabel(f.level, f.label, 'sr'),
        structure: structureText(u.structure, 'sr'),
        area: u.areaSqm ? formatArea(u.areaSqm, 'sr') : null,
        price: u.status !== 'sold' && u.price ? formatPrice(u.price, 'sr') : null,
        status: u.status,
        polygon: s.polygon
      }
    ];
  });
  // Smanjena slika kroz /_next/image (original fasade ima ~3 MB i sam je usporavao
  // vrh strane na telefonu ~10 s; merenje 22. 10. 2026). Oblici stanova su u
  // delovima slike (0-1), pa ne zavise od njene veličine.
  const imageUrl = `/_next/image?url=${encodeURIComponent(best.v.imageUrl)}&w=2048&q=75`;
  return units.length >= 3 ? { imageUrl, units } : null;
}

// Dugme "Prošetajte kroz stan" u primeru vodi na pravu turu iz vrha sajta.
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
  .report-head span{font-size:.75rem; color:#686A70;}
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

  /* Vrh: prava fotografija zgrade primera, stanovi obojeni po statusu (InvestorHeroPhoto). */
  .inv-hero-photo{background:#0B0F17;}
  .inv-hero-photo::after{display:none;}
  .inv-hp-svg{position:absolute; inset:0; width:100%; height:100%; display:block;}
  .inv-hp-poly{transition:fill .35s, fill-opacity .35s;}
  .inv-hp-legend{display:flex; flex-direction:column; gap:3px; border-radius:12px; padding:6px 10px; font-size:.66rem; font-weight:700; color:#fff;}
  .inv-hp-legend span{display:flex; align-items:center; gap:6px; white-space:nowrap;}
  .inv-hp-legend i{width:9px; height:9px; border-radius:50%; flex:none;}
  .inv-hp-meta{margin:.15rem 0 0; font-size:.74rem; color:rgba(255,255,255,.82);}
  @media (max-width:480px){ .inv-hp-legend{display:none;} }
  /* Novi vrh (16. 10. 2026), isti okvir kao tura na početnoj (.hero-tour).
     Zgrada je uspravna, pa preko cele širine bude previše uvećana: na
     računaru zauzima desnih 58 % do ivice ekrana, a tekst stoji levo. */
  .inv-hero-full .ht-media{background:#0B0F17;}
  .inv-hero-full .device{position:absolute; inset:0; width:auto; height:auto; aspect-ratio:auto; border-radius:0; box-shadow:none;}
  @media (min-width:1101px){
    .inv-hero-full .ht-media{background:var(--bg);}
    .inv-hero-full .device{left:46%;}
    .inv-hero-full .ht-copy{top:50%; bottom:auto; transform:translateY(-50%); max-width:min(600px, 42%); padding:0; background:none; box-shadow:none; border-radius:0;}
    .inv-hero-full .ht-copy h1{font-size:clamp(2.2rem,3.4vw,3.4rem);}
  }

  /* 02 Primer: pravi izbor stana + traka sa dugmetom za ceo ekran. */
  .inv-demo-bar{display:flex; flex-wrap:wrap; align-items:center; gap:.6rem 1rem; margin:0 0 1rem;}
  .inv-demo-fullnote{display:none;}
  @media (min-width:961px){ .inv-demo-fullnote{display:inline; color:var(--ink-soft); font-size:.92rem;} }
  .inv-demo-open{margin-left:auto; font-weight:700; font-size:.92rem; color:var(--accent); text-decoration:none;}
  .inv-demo-open:hover{text-decoration:underline;}

  /* 03 Kupac: kartice stana na trećem telefonu. */
  .ph-tabs{display:flex; gap:3px; background:#EEF2F8; border-radius:8px; padding:2px;}
  .ph-tabs i{flex:1; font-style:normal; text-align:center; font-size:.56rem; font-weight:700; color:#5B5D63; padding:3px 0; border-radius:6px;}
  .ph-tabs i.on{background:#FFFFFF; color:#1E5AA8;}

  /* 05 Postavljanje: ulaz -> šta mi složimo. */
  .setup-grid{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:1.2rem;}
  @media (max-width:900px){ .setup-grid{grid-template-columns:1fr;} }
  /* Bez kartica, kao prednosti (.feat): red sa linijom iznad. */
  .setup-grid .setup-card{padding:1.5rem 0 1.7rem; display:flex; flex-direction:column; gap:.6rem; background:none; border:0; border-top:1px solid var(--line-strong); border-radius:0; box-shadow:none;}
  .setup-grid{column-gap:clamp(1.5rem,4vw,3.5rem);}
  .setup-flow{display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; margin-bottom:.5rem;}
  .setup-in{font-size:.8rem; font-weight:700; color:var(--ink-soft); background:var(--surface-2); border:1px dashed var(--line-strong); border-radius:10px; padding:.4rem .65rem;}
  .setup-arrow{color:var(--accent); font-weight:800;}
  .setup-out{font-size:.8rem; font-weight:800; color:#FFFFFF; background:#1E5AA8; border-radius:10px; padding:.4rem .65rem;}
  .setup-card h3{font-size:1.15rem;}
  .setup-card p{color:var(--ink-soft); font-size:.95rem; line-height:1.6; margin:0;}
  .setup-foot{margin:1.4rem 0 0; padding:1rem 1.3rem; border-radius:18px; background:var(--accent-soft); color:var(--ink); font-weight:600;}

  .contact-line{display:flex; flex-wrap:wrap; gap:.4rem 1.6rem; font-size:.95rem; color:var(--ink-soft); grid-column:1 / -1;}
  #kontakt .contact-form{grid-column:1 / -1;}
  .contact-line a{color:inherit; text-decoration:none;}

  /* ---------- "Od zgrade do upita" (components/InvestorStory + InvestorStoryPlayer) ----------
     Bez JS-a: fasada + lista koraka. Sa JS-om (.is-armed): visoka sekcija i kadrovi po skrolu. */
  .inv-stage{max-width:1180px; margin:0 auto; padding:0 clamp(1rem,4vw,2.5rem); display:grid; grid-template-columns:minmax(260px,1fr) 1.6fr; gap:clamp(1.5rem,4vw,3rem); align-items:center;}
  .inv-steps{list-style:none; margin:1rem 0 0; padding:0; display:grid; gap:1.1rem;}
  .inv-kicker{display:block; font-size:.72rem; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:var(--accent); margin-bottom:.35rem;}
  .inv-step h3{font-size:clamp(1.15rem,1.6vw,1.35rem); letter-spacing:-.02em; margin:0 0 .3rem;}
  .inv-step p{margin:0; color:var(--ink-soft); line-height:1.5;}
  .inv-cta{margin-top:1rem;}
  .inv-progress{display:none;}
  .inv-view{position:relative; width:100%; overflow:hidden; border-radius:18px; background:#eef1f5;}
  .inv-layer{position:relative;}
  .inv-fit{position:relative;}
  .inv-fit img{display:block; width:100%; height:auto;}
  .inv-fit svg{position:absolute; inset:0; width:100%; height:100%; overflow:visible;}
  .inv-fl{fill:rgba(46,158,91,.28); stroke:#fff; stroke-width:2.5px; vector-effect:non-scaling-stroke; stroke-linejoin:round;}
  .inv-plan, .inv-3d, .inv-ui{display:none;}

  .inv-story.is-armed{height:700vh; padding:0;}
  .inv-story.is-armed .inv-stage{position:sticky; top:0; height:100vh; height:100svh;}
  .inv-story.is-armed .inv-text{position:relative;}
  .inv-story.is-armed .inv-steps{position:relative; height:250px; margin:0; display:block;}
  .inv-story.is-armed .inv-step{position:absolute; inset:0; opacity:0; visibility:hidden; transform:translateY(14px); pointer-events:none; transition:opacity .45s ease, transform .45s ease, visibility 0s linear .45s;}
  .inv-story.is-armed .inv-step.on{opacity:1; visibility:visible; transform:none; pointer-events:auto; transition-delay:0s;}
  .inv-story.is-armed .inv-step h3{font-size:clamp(1.5rem,3vw,2.35rem); line-height:1.12; margin-bottom:.6rem;}
  .inv-story.is-armed .inv-step p{font-size:1.02rem; max-width:36ch;}
  .inv-story.is-armed .inv-progress{display:flex; gap:5px; margin-top:1.2rem;}
  .inv-progress i{height:3px; flex:1; max-width:34px; border-radius:3px; background:var(--line); overflow:hidden; position:relative;}
  .inv-progress b{position:absolute; inset:0; background:var(--accent); transform-origin:left; transform:scaleX(0);}
  .inv-story.is-armed .inv-view{max-height:82vh; aspect-ratio:4/3;}
  .inv-story.is-armed .inv-layer{position:absolute; inset:0; transform-origin:0 0;}
  .inv-story.is-armed .inv-facade .inv-fit{position:absolute; inset:0;}
  .inv-story.is-armed .inv-facade img{height:100%; object-fit:cover;}
  .inv-story.is-armed .inv-fl{fill:rgba(46,158,91,0);}
  .inv-story.is-armed .inv-plan{display:block; background:#fff; opacity:0;}
  .inv-story.is-armed .inv-plan .inv-fit{position:absolute; left:4%; right:4%; top:50%; transform:translateY(-50%);}
  .inv-un{fill:rgba(46,158,91,0); stroke:#2E9E5B; stroke-width:2px; vector-effect:non-scaling-stroke; stroke-linejoin:round;}
  .inv-code{position:absolute; transform:translate(-50%,-50%); font:800 clamp(10px,1.1vw,14px)/1 var(--font-display),sans-serif; color:#1F7A45; background:rgba(255,255,255,.85); padding:2px 5px; border-radius:6px; pointer-events:none; opacity:0;}
  .inv-story.is-armed .inv-3d{display:block; background:#000; opacity:0; z-index:2;}
  .inv-3d-img{position:absolute; left:50%; top:50%; height:104%; width:auto; aspect-ratio:1; translate:-50% -50%;}
  .inv-tag{position:absolute; z-index:3; background:rgba(17,17,19,.72); color:#fff; font-size:13px; font-weight:600; padding:7px 11px; border-radius:999px;}
  .inv-3d .inv-tag{left:14px; top:14px;}
  .inv-floor-tag{right:14px; top:14px; opacity:0;}
  .inv-story.is-armed .inv-ui{display:block; position:absolute; inset:0; z-index:3; pointer-events:none;}
  .inv-legend{position:absolute; left:14px; top:14px; display:flex; gap:6px; flex-wrap:wrap; opacity:0;}
  .inv-legend span{font-size:12px; font-weight:700; padding:5px 9px; border-radius:999px; background:rgba(255,255,255,.94); color:#111113;}
  .inv-legend i{display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:5px; vertical-align:-1px;}
  .inv-card{position:absolute; right:14px; bottom:14px; width:min(290px,58%); background:#fff; color:#111113; border-radius:16px; padding:14px; box-shadow:0 22px 50px -18px rgba(15,23,42,.5); z-index:4; opacity:0; transform:translateY(16px); transition:opacity .4s, transform .45s cubic-bezier(.22,.8,.24,1);}
  .inv-card.on{opacity:1; transform:none;}
  .inv-card-head{display:flex; justify-content:space-between; align-items:center;}
  .inv-card h4{margin:0; font-size:18px;}
  .inv-badge{font-size:11px; font-weight:800; padding:4px 9px; border-radius:999px; background:#DCF3E4; color:#1F7A45; transition:background .4s, color .4s;}
  .inv-badge.res{background:#FCEFD3; color:#9A6A0B;}
  .inv-tabs{display:flex; gap:4px; margin:10px 0; background:#F1F4F8; border-radius:10px; padding:3px;}
  .inv-tabs i{flex:1; text-align:center; font-style:normal; font-size:11px; font-weight:700; color:#5B5D63; padding:5px 0; border-radius:8px;}
  .inv-tabs i.on{background:#fff; color:#1e5aa8;}
  .inv-facts{display:grid; grid-template-columns:1fr 1fr; gap:6px;}
  .inv-facts span{background:#F7F8FA; border-radius:10px; padding:7px 9px; font-size:11px; color:#5B5D63;}
  .inv-facts b{display:block; font-size:15px; color:#111113;}
  .inv-price{display:flex; flex-wrap:wrap; justify-content:space-between; align-items:baseline; gap:2px 8px; margin-top:8px; font-size:12px; color:#6B7280;}
  .inv-price b{font-family:var(--font-display); font-size:18px; color:#111113;}
  .inv-price small{flex-basis:100%; font-size:10.5px; color:#9A6A0B;}
  .inv-form{display:grid; gap:6px; margin-top:9px; max-height:0; overflow:hidden; transition:max-height .4s;}
  .inv-card.asking .inv-form{max-height:120px;}
  .inv-field{border:1.5px solid #D5DEEB; border-radius:10px; padding:7px 10px; font-size:12px; display:flex; justify-content:space-between;}
  .inv-field span{color:#6B7280;} .inv-field b{min-height:1em;}
  .inv-cbtn{display:block; margin-top:9px; text-align:center; font-size:13px; font-weight:700; border-radius:999px; padding:10px; background:#1e5aa8; color:#fff; transition:background .3s;}
  .inv-cbtn.ok{background:#1E7A4C;}
  .inv-card.in3d .inv-facts, .inv-card.in3d .inv-price, .inv-card.in3d .inv-cbtn{display:none;}
  .inv-toast{position:absolute; left:14px; bottom:14px; z-index:5; max-width:56%; background:#111113; color:#fff; border-radius:14px; padding:10px 12px; font-size:13px; box-shadow:0 16px 40px -14px rgba(0,0,0,.6); opacity:0; transform:translateY(12px); transition:opacity .35s, transform .35s;}
  .inv-toast.on{opacity:1; transform:none;}
  .inv-toast small{display:block; color:#9aa3b2; font-size:11px; margin-bottom:3px;}
  .inv-toast b{color:#F2C46D;}
  @media (max-width:760px){
    .inv-stage{grid-template-columns:minmax(0,1fr);}
    .inv-view{order:-1;}
    .inv-story.is-armed{height:570vh;}
    .inv-story.is-armed .inv-stage{align-content:center; gap:24px;}
    .inv-story.is-armed .inv-view{max-height:none; border-radius:14px;}
    .inv-story.is-armed .inv-steps{height:180px;}
    .inv-story.is-armed .inv-step h3{font-size:1.45rem;}
    .inv-story.is-armed .inv-step p{font-size:.95rem;}
    .inv-story.is-armed .inv-progress{position:absolute; top:-14px; left:0; right:0; margin:0;}
    .inv-card{width:74%; padding:10px; right:10px; bottom:10px;} .inv-card h4{font-size:15px;} .inv-facts b{font-size:13px;}
    .inv-card .inv-tabs{display:none;}
    .inv-card.asking .inv-facts, .inv-card.asking .inv-price{display:none;}
    .inv-facts{margin-top:8px;}
    .inv-toast{max-width:60%; font-size:12px;}
  }

  /* ---------- Animacije ostatka strane (maketa public/mockup/AnimacijeInvestitori.html) ----------
     Opšti efekti su u siteStyles (data-reveal, .rv-page); ovde su samo filmovi ove strane. */
  html.rv-armed .week-day[data-reveal]{transition-delay:calc(var(--row,0) * 220ms + var(--side,0) * 110ms);}
  html.rv-armed .week-card.is-dark[data-reveal]{transition-delay:140ms;}
  /* V1 Prodaja: upit uleti, statusi stanova se upale redom, trake porastu. */
  html.rv-armed .sc-inq{transform:translateX(24px); opacity:0; transition:transform .6s cubic-bezier(.22,.8,.24,1) .4s, opacity .4s .4s;}
  html.rv-armed .report-card.is-in .sc-inq{transform:none; opacity:1;}
  html.rv-armed .sc-seg i{transition:background .4s, color .4s;}
  html.rv-armed .report-card:not(.is-in) .sc-seg i{background:transparent; color:#5B5D63;}
  html.rv-armed .sc-unit:nth-of-type(2) .sc-seg i{transition-delay:.8s;}
  html.rv-armed .sc-unit:nth-of-type(3) .sc-seg i{transition-delay:1s;}
  html.rv-armed .sc-unit:nth-of-type(4) .sc-seg i{transition-delay:1.2s;}
  html.rv-armed .room-bar span i{transform:scaleX(0); transform-origin:left; transition:transform 1.1s cubic-bezier(.22,.8,.24,1) .5s;}
  html.rv-armed .room-bar + .room-bar span i{transition-delay:.66s;}
  html.rv-armed .room-bar + .room-bar + .room-bar span i{transition-delay:.82s;}
  html.rv-armed .report-card.is-in .room-bar span i{transform:none;}
  /* S1 Postavljanje: vaš materijal -> strelica -> gotovo kod nas. */
  html.rv-armed .setup-in, html.rv-armed .setup-arrow, html.rv-armed .setup-out{display:inline-block; opacity:0; transition:opacity .4s, transform .5s cubic-bezier(.22,.8,.24,1);}
  html.rv-armed .setup-in{transform:translateX(-10px);} html.rv-armed .setup-arrow{transform:translateX(-14px);} html.rv-armed .setup-out{transform:scale(.85);}
  html.rv-armed .setup-card.is-in .setup-in{opacity:1; transform:none; transition-delay:calc(var(--i,0) * 90ms + .3s);}
  html.rv-armed .setup-card.is-in .setup-arrow{opacity:1; transform:none; transition-delay:calc(var(--i,0) * 90ms + .7s);}
  html.rv-armed .setup-card.is-in .setup-out{opacity:1; transform:none; transition-delay:calc(var(--i,0) * 90ms + 1.1s);}
`;

export default async function InvestorPage() {
  const { nav, hero, compare, demo, buyer, sales, midCta, setup, offer, steps, faq, contact } = copy;
  const address = [CONTACT.street, CONTACT.city].filter(Boolean).join(', ');

  const demoData = DEMO_SLUG ? await getPublicProject(DEMO_SLUG) : null;
  const heroPhoto = heroFromProject(demoData);
  const liveDemo = demoData && demoData.floors.length > 0 && demoData.units.length > 0 ? demoData : null;
  const story = buildInvestorStory(demoData);
  const statusLabels = Object.fromEntries((['available', 'reserved', 'sold'] as UnitStatus[]).map((s) => [s, statusLabel(s, 'sr')])) as Record<UnitStatus, string>;

  const tours = await getShowcaseTours('sr');
  const heroTour = pickHeroTour(tours, 'sr');
  const tourUrl = heroTour ? tourHref(heroTour.slug, heroTour.languages, 'sr') : null;
  const tourPreview = heroTour?.rooms[0]?.previewUrl ?? heroTour?.coverUrl ?? null;

  return (
    <div lang="sr" style={{ display: 'contents' }}>
      <SiteStylesheets selector />
      <style dangerouslySetInnerHTML={{ __html: INVESTOR_STYLES }} />
      <SiteTracker />
      <NavScrollSpy />
      <SiteReveal />

      <SiteNav brandHref="/" brandAria={nav.brandAria} cta={{ href: '#kontakt', label: nav.cta, track: 'cta:investor_nav' }} mainMenu={{}} />

      {/* .rv-page: animacije iz siteStyles (kao na početnoj) važe i ovde. */}
      <main className="rv-page">
        {/* Vrh: živa zgrada preko cele širine (isti raspored kao tura na
            početnoj), obećanje na pločici preko nje. */}
        <section className="hero-tour inv-hero-full" id="pocetna">
          <div className="ht-media">
            {heroPhoto ? (
              <InvestorHeroPhoto
                imageUrl={heroPhoto.imageUrl}
                units={heroPhoto.units}
                project={liveDemo ? liveDemo.project.title : hero.device.fallbackProject}
                kicker={hero.device.kicker}
                unitLabel={hero.device.unitLabel}
                statusLabels={statusLabels}
              />
            ) : (
              <InvestorHeroDevice project={hero.device.fallbackProject} freeLabel={hero.device.floorCard} unitLabel={hero.device.unitLabel} />
            )}
          </div>
          <div className="ht-copy">
            <h1>{accent(hero.title)}</h1>
            <p className="lede">{hero.lede}</p>
            <div className="hero-ctas">
              <a className="btn btn-primary" href="#kontakt" data-track="cta:investor_hero_contact">{hero.ctaContact}</a>
              <a className="btn btn-secondary" href="#primer" data-track="cta:investor_hero_demo">{hero.ctaDemo}</a>
            </div>
            <ul className="ht-facts">
              {hero.trust.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* 01 Prodaja danas i sa Kvadrat360. */}
        <section className="band" id="danas">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow" data-reveal="up">{compare.eyebrow}</span>
              <h2 data-reveal="blur">{accent(compare.title)}</h2>
              <p className="note" data-reveal="up">{compare.note}</p>
            </div>
            <div className="week-grid">
              {[compare.without, compare.with].map((side, i) => (
                <div key={side.title} className={i === 1 ? 'week-card is-dark' : 'week-card'} data-reveal="scale">
                  <div className="week-head">
                    <h3>{side.title}</h3>
                    <span className="week-tag">{side.tag}</span>
                  </div>
                  <div className="week-days">
                    {side.rows.map((d, row) => (
                      // --row/--side: redovi obe strane ulaze u paru (INVESTOR_STYLES).
                      <div key={d.day} className="week-day" data-reveal="up" style={{ ['--row' as string]: row, ['--side' as string]: i } as CSSProperties}>
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
              <span className="eyebrow" data-reveal="up">{demo.eyebrow}</span>
              <h2 data-reveal="blur">{accent(demo.title)}</h2>
              <p className="note" data-reveal="up">{liveDemo ? demo.note : demo.noteIllustration}</p>
              <span className="inv-badge-note">{liveDemo ? `${demo.badgeLive} ${liveDemo.project.title}` : demo.badge}</span>
            </div>
            {liveDemo ? (
              <>
                {/* Na računaru izbor ima svoje dugme „Ceo ekran" - ovde samo napomena i link na celu stranu. */}
                <div className="inv-demo-bar">
<span className="inv-demo-fullnote">{demo.fullNote}</span>
                  <a className="inv-demo-open" href={`/novogradnja/${DEMO_SLUG}`} target="_blank" rel="noopener" data-track="cta:investor_demo_open">
                    {demo.open} ↗
                  </a>
                </div>
                <div className="inv-demo-wrap">
                  <ProjectSelector
                    lang="sr"
                    project={selectorProject(liveDemo, 'sr')}
                    floors={liveDemo.floors}
                    units={liveDemo.units}
                    buildings={liveDemo.buildings}
                    views={liveDemo.views}
                    demoMedia={liveDemo.demoMedia}
                    letakBase={`/novogradnja/${DEMO_SLUG}/stan`}
                  />
                </div>
              </>
            ) : (
              <div className="inv-demo-wrap">
                <InvestorDemo tourUrl={tourUrl} tourPreview={tourPreview} />
              </div>
            )}
          </div>
        </section>

        {/* 03 Kupac: priča na skrol od zgrade do upita (vlasnik, 21. 10. 2026) -
            zamenila je četiri telefona; bez podataka projekta se ne prikazuje. */}
        {story && <InvestorStory data={story} copy={buyer} />}

        {/* 04 Vaša prodaja: link za prodaju, upiti, izveštaj (primer). */}
        <section className="owner is-dark" id="prodaja">
          <div className="wrap">
            <div>
              <div className="section-head left">
                <span className="eyebrow" data-reveal="up">{sales.eyebrow}</span>
                <h2 data-reveal="blur">{accent(sales.title)}</h2>
                <p className="note" data-reveal="up">{sales.text}</p>
              </div>
              <ul className="owner-points">
                {sales.points.map((point) => <li key={point} data-reveal="list">{point}</li>)}
              </ul>
            </div>
            <div className="report-card" aria-label={sales.card.title} data-reveal="scale">
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
                  <small data-count>{row.views}</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Poziv na sredini - kao plava traka na /za-agencije. */}
        <section id="razgovor" className="mid-cta-sec">
          <div className="wrap mid-cta">
            <div className="mid-cta-text" data-reveal="up">
              <h2>{accent(midCta.title)}</h2>
              <ul>
                {midCta.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            </div>
            <div className="mid-cta-actions" data-reveal="up">
              <a className="btn btn-primary" href="#kontakt" data-track="cta:investor_mid">{midCta.button}</a>
              <a className="btn btn-secondary" href={CONTACT_LINKS.phone} data-track="contact:phone"><IconPhone /> {midCta.call}</a>
            </div>
          </div>
        </section>

        {/* 05 Postavljanje: mi unosimo i proveravamo materijal investitora - odgovor na „koliko posla je na nama". */}
        <section id="postavljanje">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow" data-reveal="up">{setup.eyebrow}</span>
              <h2 data-reveal="blur">{accent(setup.title)}</h2>
              <p className="note" data-reveal="up">{setup.note}</p>
            </div>
            <div className="setup-grid">
              {setup.items.map((item) => (
                <div key={item.title} className="card setup-card" data-reveal="up">
                  <div className="setup-flow" aria-hidden="true">
                    <span className="setup-in">{item.from}</span>
                    <span className="setup-arrow">→</span>
                    <span className="setup-out" data-count>{item.to}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
            <p className="setup-foot">{setup.foot}</p>
          </div>
        </section>

        {/* 06 Paket. */}
        <section className="band" id="paket">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow" data-reveal="up">{offer.eyebrow}</span>
              <h2 data-reveal="blur">{accent(offer.title)}</h2>
              <p className="note" data-reveal="up">{offer.note}</p>
            </div>
            <div className="feat-grid n-3">
              {offer.items.map((item) => (
                <div key={item.title} className="card feat" data-reveal="up">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 07 Kako radimo + šta nam treba. */}
        <section id="kako-radi">
          <div className="wrap steps-split">
            <div className="section-head left">
              <span className="eyebrow" data-reveal="up">{steps.eyebrow}</span>
              <h2 data-reveal="blur">{accent(steps.title)}</h2>
              <p className="note" data-reveal="up">{steps.note}</p>
            </div>
            <div className="steps-row" data-reveal-steps>
              {steps.items.map((item, i) => (
                <div key={item.title} className="card step" data-reveal="up">
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
            <div className="card inv-needs" data-reveal="up">
              <h3>{steps.needs.title}</h3>
              <ul>
                {steps.needs.items.map((item) => <li key={item} data-reveal="list">{item}</li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* 08 Pitanja. */}
        <section className="band" id="pitanja">
          <div className="wrap faq-split">
            <div className="section-head left">
              <span className="eyebrow" data-reveal="up">{faq.eyebrow}</span>
              <h2 data-reveal="blur">{accent(faq.title)}</h2>
              <p className="note" data-reveal="up">{faq.note}</p>
            </div>
            <div className="faq-list">
              {faq.items.map((item) => (
                <details key={item.question} className="card faq-item" data-reveal="up">
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
