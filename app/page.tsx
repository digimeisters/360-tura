import type { Metadata } from 'next';
import HeroDevice from '../components/HeroDevice';
import ContactForm from '../components/ContactForm';
import { Logo } from './tour/[slug]/Logo';
import { getShowcaseTours, pickHeroTour, type ShowcaseTour } from './lib/showcaseTours';
import { SITE_URL } from './lib/site';

export const metadata: Metadata = {
  title: 'Kvadrat360 — Virtuelne ture i HDR fotografija nekretnina',
  description:
    'Profesionalne 360° virtuelne ture i HDR fotografije za agencije za nekretnine i vlasnike koji prodaju ili izdaju. Audio vodič na srpskom, engleskom, nemačkom i ruskom.',
};

// Objavljene ture se na početnoj pojavljuju same. Strana je statična i
// osvežava se najkasnije na sat - a odmah kad se tura objavi, skine ili joj
// se promeni panorama (revalidatePath u /api/admin/tours i upload-panorama).
export const revalidate = 3600;

const CATEGORY_LABEL: Record<string, string> = {
  sale: 'Prodaja',
  rent: 'Izdavanje',
  booking: 'Smeštaj'
};

// Broj kolona prati broj tura, da nijedna kartica ne ostane sama u redu.
function gridClass(count: number): string {
  if (count === 1) return 'n-1';
  if (count === 2 || count === 4) return 'n-2';
  return 'n-3';
}

// Oblici komponenti su preuzeti iz aplikacije (ture, /unos, admin): pun
// zaobljen oblik dugmadi, kartice od 20px sa mekom senkom, polja od 10px
// na blago sivoj podlozi, čipovi i stakleni tretman preko fotografija.
const styles = `
  :root{
    --bg:#FAFAF7;
    --surface:#FFFFFF;
    --surface-2:#F1F1EC;
    --ink:#111113;
    --ink-soft:#5B5D63;
    --ink-faint:#8C8E93;
    --line:#E4E4DE;
    --line-strong:#D3D3CB;
    --accent:#1E5AA8;
    --accent-strong:#17447E;
    --accent-soft:#E9EFF6;
    --on-accent:#FFFFFF;
    --accent-glow:rgba(30,90,168,.35);
    --danger:#dc2626;
    --dark-bg:#0E0E10;
    --dark-surface:#1A1A1E;
    --dark-ink:#F5F5F3;
    --dark-ink-soft:#A8A9AE;
    --dark-line:#2C2C30;
    --shadow:0 2px 8px rgba(17,17,19,.08);
    --shadow-lg:0 10px 30px rgba(17,17,19,.13);
  }
  @media (prefers-color-scheme: dark){
    :root:not([data-theme="light"]){
      --bg:#101012;
      --surface:#17171A;
      --surface-2:#1D1D21;
      --ink:#F2F2EF;
      --ink-soft:#AEB0B6;
      --ink-faint:#797B81;
      --line:#2A2A2E;
      --line-strong:#38383D;
      --accent:#5B92D6;
      --accent-strong:#7FADE4;
      --accent-soft:#1A2433;
      --on-accent:#0B0E1A;
      --accent-glow:rgba(91,146,214,.32);
      --danger:#f87171;
      --shadow:0 2px 8px rgba(0,0,0,.4);
      --shadow-lg:0 14px 34px rgba(0,0,0,.5);
    }
  }
  :root[data-theme="dark"]{
    --bg:#101012;
    --surface:#17171A;
    --surface-2:#1D1D21;
    --ink:#F2F2EF;
    --ink-soft:#AEB0B6;
    --ink-faint:#797B81;
    --line:#2A2A2E;
    --line-strong:#38383D;
    --accent:#5B92D6;
    --accent-strong:#7FADE4;
    --accent-soft:#1A2433;
    --on-accent:#0B0E1A;
    --accent-glow:rgba(91,146,214,.32);
    --danger:#f87171;
    --shadow:0 2px 8px rgba(0,0,0,.4);
    --shadow-lg:0 14px 34px rgba(0,0,0,.5);
  }

  *{box-sizing:border-box;}
  html{scroll-behavior:smooth;}
  body{
    margin:0;
    background:var(--bg);
    color:var(--ink);
    font-family:'Inter',system-ui,-apple-system,sans-serif;
    font-size:16.5px;
    line-height:1.62;
    -webkit-font-smoothing:antialiased;
  }
  img{max-width:100%;}
  a{color:inherit;}
  [hidden]{display:none !important;}
  .wrap{width:100%; max-width:1180px; margin:0 auto; padding-inline:1.25rem;}
  h1,h2,h3{
    font-family:'Plus Jakarta Sans',system-ui,sans-serif;
    font-weight:800;
    text-wrap:balance;
    margin:0;
    color:var(--ink);
    letter-spacing:-0.01em;
  }
  em{font-style:normal; color:var(--accent);}
  p{margin:0;}
  .eyebrow{
    font-family:'Plus Jakarta Sans',system-ui,sans-serif;
    font-size:.76rem;
    font-weight:700;
    letter-spacing:.09em;
    text-transform:uppercase;
    color:var(--accent);
  }
  :focus-visible{outline:2px solid var(--accent); outline-offset:3px; border-radius:6px;}
  @media (prefers-reduced-motion: reduce){ *{animation-duration:.001ms !important; animation-iteration-count:1 !important; transition-duration:.001ms !important;} html{scroll-behavior:auto;} }

  /* ---------- KOMPONENTE ---------- */
  .btn{
    font-family:'Plus Jakarta Sans',sans-serif; font-weight:700; font-size:.9rem; border-radius:999px; padding:.72rem 1.35rem;
    border:1px solid transparent; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; gap:.5rem;
    transition:transform .15s ease, background .15s ease, color .15s ease, border-color .15s ease, box-shadow .15s ease; white-space:nowrap;
  }
  .btn-primary{background:var(--accent); color:var(--on-accent); box-shadow:0 4px 14px var(--accent-glow);}
  .btn-primary:hover{background:var(--accent-strong);}
  .btn-secondary{background:var(--surface); color:var(--ink); border-color:var(--line); box-shadow:var(--shadow);}
  .btn-secondary:hover{border-color:var(--accent); color:var(--accent);}
  .btn-sm{font-size:.82rem; padding:.5rem .95rem;}
  .btn:disabled{opacity:.6; cursor:default;}
  @media (hover:hover){ .btn:not(:disabled):hover{transform:translateY(-1px);} }

  .chip{display:inline-flex; align-items:center; gap:.45rem; font-size:.84rem; font-weight:600; border-radius:16px; padding:.35rem .85rem; background:var(--surface); color:var(--ink-soft); border:1px solid var(--line); box-shadow:var(--shadow); white-space:nowrap;}
  .chip .dot{width:6px; height:6px; border-radius:50%; background:var(--accent); flex:none;}

  /* Isti tretman kao hotspotovi soba u panorami. */
  .glass{display:inline-flex; align-items:center; gap:5px; background:rgba(15,23,42,.34); -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px); border:1px solid rgba(255,255,255,.7); color:#fff; text-shadow:0 1px 2px rgba(0,0,0,.45); border-radius:999px; padding:4px 10px; font-family:'Plus Jakarta Sans',sans-serif; font-size:.72rem; font-weight:700; box-shadow:0 2px 8px rgba(0,0,0,.2); white-space:nowrap;}
  .glass .dot{width:5px; height:5px; border-radius:50%; background:#5B92D6; box-shadow:0 0 0 2px rgba(255,255,255,.25); flex:none;}

  .card{background:var(--surface); border:1px solid var(--line); border-radius:20px; box-shadow:var(--shadow);}

  .field{display:flex; flex-direction:column; gap:.4rem;}
  .field label{font-size:.8rem; font-weight:600; color:var(--ink-soft);}
  .input{
    font-family:'Inter',sans-serif; font-size:.95rem; color:var(--ink); width:100%;
    background:var(--surface-2); border:1px solid var(--line-strong); border-radius:10px; padding:.72rem .85rem;
    transition:border-color .15s ease, box-shadow .15s ease, background .15s ease;
  }
  .input::placeholder{color:var(--ink-faint);}
  .input:focus{outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-soft); background:var(--surface);}
  textarea.input{resize:vertical; min-height:96px;}
  select.input{
    appearance:none; padding-right:2.2rem;
    background-image:linear-gradient(45deg,transparent 50%,var(--ink-faint) 50%),linear-gradient(135deg,var(--ink-faint) 50%,transparent 50%);
    background-position:calc(100% - 18px) 52%,calc(100% - 13px) 52%; background-size:5px 5px,5px 5px; background-repeat:no-repeat;
  }
  .row2{display:grid; grid-template-columns:1fr 1fr; gap:1rem;}
  @media (max-width:540px){ .row2{grid-template-columns:1fr;} }

  .toast{display:inline-flex; align-items:center; gap:.4rem; font-size:.85rem; font-weight:600; border-radius:999px; padding:.4rem .85rem;}
  .toast-ok{color:var(--accent); background:var(--accent-soft);}
  .toast-error{color:var(--danger); background:color-mix(in srgb, var(--danger) 12%, transparent);}

  /* ---------- MENI ---------- */
  /* Kartica koja lebdi pri vrhu - isti oblik kao gornja traka u turi. */
  .nav{position:sticky; top:0; z-index:40; padding-block:10px;}
  .nav-bar{
    display:flex; align-items:center; justify-content:space-between; gap:1rem;
    background:color-mix(in srgb, var(--surface) 90%, transparent); -webkit-backdrop-filter:saturate(140%) blur(10px); backdrop-filter:saturate(140%) blur(10px);
    border:1px solid var(--line); border-radius:16px; box-shadow:var(--shadow); padding:.45rem .45rem .45rem .85rem;
  }
  .brand{text-decoration:none; display:inline-flex;}
  .navlinks{display:flex; align-items:center; gap:.2rem; list-style:none; margin:0; padding:0;}
  .navlinks a{display:block; text-decoration:none; font-size:.88rem; font-weight:600; color:var(--ink-soft); padding:.45rem .85rem; border-radius:999px; transition:background .15s ease, color .15s ease;}
  .navlinks a:hover{background:var(--surface-2); color:var(--ink);}
  @media (max-width:860px){ .navlinks{display:none;} }

  section{padding-block:clamp(3rem,7vw,5.2rem); scroll-margin-top:76px;}
  .band{background:var(--surface-2);}
  .section-head{display:flex; flex-direction:column; align-items:center; text-align:center; gap:.65rem; margin-bottom:clamp(2.2rem,4vw,3rem);}
  .section-head h2{font-size:clamp(1.8rem,2.8vw,2.5rem); max-width:22ch;}
  .section-head .note{max-width:52ch; color:var(--ink-soft); font-size:.98rem;}
  .section-head.left{align-items:flex-start; text-align:left; margin-bottom:0;}
  .section-head.left .note{max-width:40ch;}

  /* ---------- HERO ---------- */
  .hero{padding-block:clamp(1.4rem,4vw,2.6rem) clamp(2.6rem,6vw,4.4rem);}
  .hero .wrap{display:grid; grid-template-columns:1fr 1.08fr; gap:clamp(2rem,5vw,3.2rem); align-items:center;}
  .hero h1{font-size:clamp(2.5rem,4.6vw,3.9rem); line-height:1.06; margin-top:1rem;}
  .hero .lede{margin-top:1.15rem; max-width:42ch; color:var(--ink-soft); font-size:1.06rem;}
  .hero-ctas{display:flex; align-items:center; gap:.7rem; margin-top:1.8rem; flex-wrap:wrap;}
  .trust{display:flex; flex-wrap:wrap; gap:.5rem; margin-top:1.4rem;}
  @media (max-width:940px){ .hero .wrap{grid-template-columns:1fr;} }

  /* ---------- KADAR IZ TURE ---------- */
  /* Delovi aplikacije preko fotografije su uvek svetli, kao u samoj turi. */
  .device{position:relative; border-radius:20px; overflow:hidden; box-shadow:var(--shadow-lg); border:1px solid var(--line); aspect-ratio:16/11; background:var(--surface-2);}
  .device-img{position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block;}
  .device::after{content:""; position:absolute; inset:0; background:linear-gradient(180deg,rgba(0,0,0,.1) 0%,transparent 32%,transparent 60%,rgba(0,0,0,.2) 100%); pointer-events:none; z-index:1;}
  .device-empty{display:flex; align-items:center; justify-content:center; color:var(--ink-faint); font-weight:600;}
  .device-empty::after{display:none;}
  .d-top{position:absolute; top:10px; left:10px; right:10px; display:flex; justify-content:space-between; align-items:flex-start; gap:8px; z-index:2;}
  .d-title{background:#fff; border:1px solid #E4E4DE; border-radius:12px; box-shadow:0 2px 8px rgba(17,17,19,.08); padding:5px 11px; min-width:0; max-width:62%;}
  .d-title small{display:block; color:#1E5AA8; font-family:'Plus Jakarta Sans',sans-serif; font-size:.6rem; font-weight:800; letter-spacing:.5px; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
  .d-title strong{display:block; color:#111113; font-size:.78rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
  .d-langs{display:flex; gap:2px; background:#fff; border:1px solid #E4E4DE; border-radius:12px; padding:3px; box-shadow:0 2px 8px rgba(17,17,19,.08); flex:none;}
  .d-langs span{font-size:.66rem; font-weight:700; color:#5B5D63; padding:3px 8px; border-radius:999px;}
  .d-langs span.on{background:#1E5AA8; color:#fff;}
  .d-rooms{position:absolute; top:54px; left:10px; right:10px; display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; z-index:2; padding-bottom:4px;}
  .d-rooms::-webkit-scrollbar{display:none;}
  .d-rooms button{flex:none; font-family:'Inter',sans-serif; font-size:.72rem; font-weight:500; background:#fff; color:#111113; border:1px solid #E4E4DE; border-radius:16px; padding:4px 10px; box-shadow:0 2px 8px rgba(17,17,19,.08); white-space:nowrap; cursor:pointer; transition:opacity .15s ease;}
  .d-rooms button[aria-pressed="true"]{background:#1E5AA8; color:#fff; border-color:#1E5AA8; font-weight:600;}
  .d-rooms button[aria-busy="true"]{opacity:.55;}
  .d-info{position:absolute; left:12px; right:12px; bottom:12px; margin-inline:auto; max-width:420px; background:#fff; border:1px solid #E4E4DE; border-radius:16px; box-shadow:0 10px 30px rgba(17,17,19,.15); padding:.7rem .8rem .7rem .95rem; z-index:2; display:grid; grid-template-columns:1fr auto; column-gap:.8rem; align-items:center;}
  .d-info h4{margin:0; color:#1E5AA8; font-family:'Inter',sans-serif; font-size:.86rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
  .d-info p{grid-column:1; color:#111113; font-size:.74rem; line-height:1.45; margin-top:.15rem;}
  .d-open{grid-column:2; grid-row:1 / span 2; background:#1E5AA8; color:#fff; border-radius:999px; padding:.5rem .85rem; font-family:'Plus Jakarta Sans',sans-serif; font-size:.76rem; font-weight:700; text-decoration:none; white-space:nowrap; box-shadow:0 4px 14px rgba(30,90,168,.35);}
  .d-open:hover{background:#17447E;}
  @media (max-width:520px){ .d-info p, .d-langs span:not(.on){display:none;} }

  /* ---------- BENEFITI ---------- */
  .feat-grid{display:grid; grid-template-columns:repeat(4,1fr); gap:1rem;}
  .feat{padding:1.4rem 1.35rem; display:flex; flex-direction:column; gap:.55rem;}
  .feat h3{font-size:1.02rem; font-weight:700;}
  .feat p{color:var(--ink-soft); font-size:.9rem;}
  @media (max-width:1000px){ .feat-grid{grid-template-columns:1fr 1fr;} }
  @media (max-width:560px){ .feat-grid{grid-template-columns:1fr;} }

  /* ---------- KORACI ---------- */
  .steps-row{display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; margin-bottom:1.3rem;}
  @media (max-width:900px){ .steps-row{grid-template-columns:1fr 1fr;} }
  @media (max-width:520px){ .steps-row{grid-template-columns:1fr;} }
  .step{padding:1.35rem 1.35rem 1.45rem;}
  .step .num{display:inline-flex; align-items:center; justify-content:center; height:1.75rem; padding-inline:.7rem; border-radius:999px; background:var(--accent-soft); color:var(--accent); font-family:'Plus Jakarta Sans',sans-serif; font-weight:800; font-size:.82rem; font-variant-numeric:tabular-nums;}
  .step h3{font-size:1.02rem; font-weight:700; margin-top:.85rem;}
  .step p{margin-top:.45rem; font-size:.9rem; color:var(--ink-soft);}

  .deliver-card{padding:1.6rem 1.8rem;}
  .deliver-card h3{font-size:1.05rem; font-weight:700; margin-bottom:1rem;}
  .deliver-list{display:grid; grid-template-columns:1fr 1fr; gap:.7rem 2rem; list-style:none; margin:0; padding:0;}
  @media (max-width:640px){ .deliver-list{grid-template-columns:1fr;} }
  .deliver-list li{display:flex; gap:.6rem; font-size:.92rem; color:var(--ink);}
  .deliver-list li::before{content:"✓"; color:var(--accent); font-weight:700; flex:none;}

  /* ---------- TIPOVI OGLASA ---------- */
  .cat-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:1rem;}
  @media (max-width:880px){ .cat-grid{grid-template-columns:1fr;} }
  .cat-card{padding:1.6rem; display:flex; flex-direction:column; gap:.7rem;}
  .cat-card .eyebrow{font-size:.72rem;}
  .cat-card h3{font-size:1.2rem;}
  .cat-card .focus{font-size:.9rem; color:var(--ink-soft);}
  .cat-faq{background:var(--surface-2); border-radius:12px; padding:.8rem .95rem; margin-top:.4rem;}
  .cat-faq span{display:block; font-family:'Plus Jakarta Sans',sans-serif; font-size:.68rem; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--ink-faint); margin-bottom:.3rem;}
  .cat-faq p{font-size:.9rem; color:var(--ink); font-style:italic;}

  /* ---------- PAKETI ---------- */
  .price-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:1.1rem; align-items:stretch;}
  @media (max-width:920px){ .price-grid{grid-template-columns:1fr;} }
  .price-card{position:relative; padding:1.7rem 1.6rem; display:flex; flex-direction:column; gap:1.1rem;}
  .price-card.featured{border:2px solid var(--accent); box-shadow:0 12px 32px -10px var(--accent-glow);}
  .price-badge{position:absolute; top:-.8rem; left:1.5rem; background:var(--accent); color:var(--on-accent); font-family:'Plus Jakarta Sans',sans-serif; font-size:.66rem; font-weight:700; letter-spacing:.05em; text-transform:uppercase; padding:.35rem .75rem; border-radius:999px; box-shadow:0 4px 12px var(--accent-glow);}
  .price-audience{font-family:'Plus Jakarta Sans',sans-serif; font-size:.7rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-faint);}
  .price-card h3{font-size:1.4rem;}
  .price-value{display:flex; align-items:baseline; gap:.35rem; font-size:.92rem; color:var(--ink-soft);}
  .price-value b{font-family:'Plus Jakarta Sans',sans-serif; font-size:2.2rem; font-weight:800; color:var(--ink); font-variant-numeric:tabular-nums;}
  .price-list{list-style:none; margin:0; padding:1rem 0 0; border-top:1px solid var(--line); display:flex; flex-direction:column; gap:.6rem; flex:1;}
  .price-list li{font-size:.88rem; color:var(--ink-soft); display:flex; gap:.6rem;}
  .price-list li::before{content:"✓"; color:var(--accent); font-weight:700; flex:none;}
  .price-cta{width:100%;}
  .fine-print{margin-top:1.4rem; font-size:.85rem; color:var(--ink-faint); text-align:center;}

  /* ---------- PRIMERI TURA ---------- */
  .tours-grid{display:grid; gap:1.2rem;}
  .tours-grid.n-1{grid-template-columns:minmax(0,560px); justify-content:center;}
  .tours-grid.n-2{grid-template-columns:repeat(2,1fr);}
  .tours-grid.n-3{grid-template-columns:repeat(3,1fr);}
  @media (max-width:900px){ .tours-grid.n-3{grid-template-columns:1fr 1fr;} }
  @media (max-width:620px){ .tours-grid.n-2, .tours-grid.n-3{grid-template-columns:1fr;} }
  .tour-card{overflow:hidden; display:flex; flex-direction:column; text-decoration:none; color:inherit; transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease;}
  @media (hover:hover){ .tour-card:hover{transform:translateY(-3px); box-shadow:var(--shadow-lg);} .tour-card:hover .tour-open{border-color:var(--accent); color:var(--accent);} }
  .tour-photo{position:relative; aspect-ratio:1200/630; background:var(--surface-2);}
  .tour-photo img{position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block;}
  .tour-photo .glass.tag{position:absolute; top:.75rem; left:.75rem;}
  .tour-langs{position:absolute; bottom:.75rem; right:.75rem; display:flex; gap:.3rem;}
  .tour-body{padding:1rem 1.15rem 1.2rem; display:flex; flex-direction:column; gap:.7rem; flex:1;}
  .tour-body h3{font-size:1.02rem; font-weight:700; line-height:1.3;}
  .tour-meta{font-size:.86rem; color:var(--ink-soft);}
  .tour-open{margin-top:auto; align-self:flex-start;}

  /* ---------- INTEGRACIJA ---------- */
  .integration{background:var(--dark-bg); color:var(--dark-ink);}
  .integration .wrap{display:grid; grid-template-columns:1fr 1.1fr; gap:clamp(2rem,5vw,3.5rem); align-items:center;}
  @media (max-width:880px){ .integration .wrap{grid-template-columns:1fr;} }
  .integration .eyebrow{color:#5B92D6;}
  .integration h2{color:var(--dark-ink); font-size:clamp(1.7rem,2.6vw,2.2rem); margin-top:.6rem;}
  .integration p.desc{margin-top:1rem; color:var(--dark-ink-soft); font-size:1rem; max-width:38ch;}
  .code-block{background:var(--dark-surface); border:1px solid var(--dark-line); border-radius:16px; padding:1.5rem 1.6rem; font-family:'Menlo','Consolas',monospace; font-size:.86rem; line-height:1.7; color:#C7C9D1; overflow-x:auto;}
  .code-block .tag{color:#5B92D6;}
  .code-block .attr{color:#E3B6E0;}
  .code-block .str{color:#9FD6A8;}

  /* ---------- KONTAKT ---------- */
  .contact .wrap{display:grid; grid-template-columns:1.1fr .9fr; gap:clamp(2rem,5vw,3.4rem); align-items:start;}
  @media (max-width:880px){ .contact .wrap{grid-template-columns:1fr;} }
  .contact h2{font-size:clamp(1.8rem,2.8vw,2.5rem); margin-top:.6rem; margin-bottom:.3rem;}
  .contact-form{display:flex; flex-direction:column; gap:1rem; margin-top:1.5rem; padding:1.4rem;}
  .form-foot{display:flex; flex-wrap:wrap; align-items:center; gap:.9rem;}
  .info-list{display:flex; flex-direction:column; gap:.7rem; margin:0;}
  @media (min-width:881px){ .info-list{margin-top:6.2rem;} }
  .info-list > div{padding:.95rem 1.15rem;}
  .info-list dt{font-family:'Plus Jakarta Sans',sans-serif; font-size:.7rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-faint); margin:0;}
  .info-list dd{margin:.25rem 0 0; font-size:1rem; font-weight:600; color:var(--ink);}

  footer{border-top:1px solid var(--line); padding-block:1.6rem;}
  footer .wrap{display:flex; flex-wrap:wrap; justify-content:space-between; gap:1rem; align-items:center;}
  footer p{font-size:.85rem; color:var(--ink-soft);}
`;

function TourCard({ tour }: { tour: ShowcaseTour }) {
  const category = tour.category ? CATEGORY_LABEL[tour.category] : null;
  const rooms = tour.roomCount === 1 ? '1 prostorija' : `${tour.roomCount} prostorija`;

  return (
    <a className="card tour-card" href={`/tour/${tour.slug}`}>
      <div className="tour-photo">
        {tour.coverUrl && (
          /* eslint-disable-next-line @next/next/no-img-element -- sličica je
             već 1200x630 JPG sa CDN-a, next/image nema šta da doda */
          <img src={tour.coverUrl} alt="" loading="lazy" decoding="async" />
        )}
        {category && (
          <span className="glass tag">
            <span className="dot" />
            {category}
          </span>
        )}
        <span className="tour-langs">
          {tour.languages.map((l) => (
            <span key={l} className="glass">
              {l.toUpperCase()}
            </span>
          ))}
        </span>
      </div>
      <div className="tour-body">
        <h3>{tour.title}</h3>
        <p className="tour-meta">{[tour.agency, rooms].filter(Boolean).join(' · ')}</p>
        <span className="btn btn-secondary btn-sm tour-open">Otvori turu →</span>
      </div>
    </a>
  );
}

export default async function Home() {
  const tours = await getShowcaseTours();
  const heroTour = pickHeroTour(tours);
  const exampleSlug = heroTour?.slug ?? tours[0]?.slug ?? 'naziv-ture';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <header className="nav">
        <div className="wrap">
          <div className="nav-bar">
            <a className="brand" href="#pocetna" aria-label="Kvadrat360, početak strane">
              <Logo />
            </a>
            <ul className="navlinks">
              {tours.length > 0 && <li><a href="#primeri">Primeri tura</a></li>}
              <li><a href="#kako-radimo">Kako radimo</a></li>
              <li><a href="#benefiti">Benefiti</a></li>
              <li><a href="#paketi">Paketi</a></li>
            </ul>
            <a className="btn btn-primary btn-sm" href="#kontakt">Zakažite snimanje</a>
          </div>
        </div>
      </header>

      <main>
        <section className="hero" id="pocetna">
          <div className="wrap">
            <div>
              <span className="chip"><span className="dot" />Prodaja · Izdavanje · Smeštaj</span>
              <h1>Svaki kvadrat iz <em>svakog ugla.</em></h1>
              <p className="lede">
                Virtuelna 360° tura i HDR fotografije pokazuju svaki ugao unapred, za ceo portfolio
                agencije ili pojedinačan oglas — dolaze samo ozbiljno zainteresovani kupci i zakupci,
                spremni da brzo donesu odluku.
              </p>
              <div className="hero-ctas">
                <a className="btn btn-primary" href={heroTour ? `/tour/${heroTour.slug}` : '#primeri'}>▶ Pogledajte primer ture</a>
                <a className="btn btn-secondary" href="#paketi">Paketi za agencije</a>
              </div>
              <div className="trust">
                <span className="chip">🎧 Audio vodič SR · EN · DE · RU</span>
                <span className="chip">⏱ Isporuka za 48h</span>
              </div>
            </div>

            <HeroDevice tour={heroTour} />
          </div>
        </section>

        {tours.length > 0 && (
          <section className="band" id="primeri">
            <div className="wrap">
              <div className="section-head">
                <span className="eyebrow">Primeri tura</span>
                <h2>Prošetajte kroz pravu turu</h2>
                <p className="note">Ture koje su trenutno objavljene — otvaraju se u pretraživaču, na telefonu ili računaru, bez preuzimanja aplikacije.</p>
              </div>
              <div className={`tours-grid ${gridClass(tours.length)}`}>
                {tours.map((tour) => (
                  <TourCard key={tour.slug} tour={tour} />
                ))}
              </div>
            </div>
          </section>
        )}

        <section id="benefiti">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Benefiti</span>
              <h2>Zašto virtuelna tura prodaje bolje</h2>
              <p className="note">Ono što tura i HDR fotografije donose vama i vašim klijentima — ne tehnologija iza toga.</p>
            </div>
            <div className="feat-grid">
              <div className="card feat">
                <h3>Manje uzaludnih poseta</h3>
                <p>Kupci i zakupci prvo „prošetaju“ kroz stan online — na razgledanje dolaze samo ozbiljno zainteresovani.</p>
              </div>
              <div className="card feat">
                <h3>Oglas koji se izdvaja</h3>
                <p>360° tura i HDR fotografije privlače više pregleda i upita nego obične slike telefonom.</p>
              </div>
              <div className="card feat">
                <h3>Doseg do inostranih kupaca</h3>
                <p>Audio vodič je dostupan na srpskom, engleskom, nemačkom i ruskom — bez potrebe za prevodiocem.</p>
              </div>
              <div className="card feat">
                <h3>Dostupno 24 sata</h3>
                <p>Nekretnina je „otvorena“ za razgledanje u svakom trenutku, bez usklađivanja termina.</p>
              </div>
              <div className="card feat">
                <h3>Brža prodaja i izdavanje</h3>
                <p>Nekretnine predstavljene turom i HDR fotografijama prosečno brže nalaze kupca ili zakupca.</p>
              </div>
              <div className="card feat">
                <h3>Sve na jednom mestu</h3>
                <p>Plan stana, lokacija i vaš kontakt dostupni su unutar iste ture — bez dodatnih poziva i mejlova.</p>
              </div>
              <div className="card feat">
                <h3>Profesionalan prvi utisak</h3>
                <p>Kvalitetna fotografija i uređena tura grade poverenje pre prvog kontakta.</p>
              </div>
              <div className="card feat">
                <h3>Radi na svakom uređaju</h3>
                <p>Tura se otvara direktno u pretraživaču, na telefonu ili računaru — bez preuzimanja aplikacije.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="band" id="kako-radimo">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Kako radimo</span>
              <h2>Od poziva do gotove ture</h2>
              <p className="note">Jednostavan proces sa vaše strane — mi vodimo računa o ostatku.</p>
            </div>

            <div className="steps-row">
              <div className="card step">
                <span className="num">01</span>
                <h3>Zakazivanje</h3>
                <p>Dogovorite termin telefonom ili preko forme — dolazimo sa opremom u ugovoreno vreme, bez ometanja stanara ili zakupaca.</p>
              </div>
              <div className="card step">
                <span className="num">02</span>
                <h3>Snimanje</h3>
                <p>30–60 minuta po nekretnini: 360° panorame svake prostorije i HDR fotografije za oglas.</p>
              </div>
              <div className="card step">
                <span className="num">03</span>
                <h3>Obrada</h3>
                <p>Spajanje panorame, kalibracija boja i priprema audio vodiča na jezicima koji su vam potrebni.</p>
              </div>
              <div className="card step">
                <span className="num">04</span>
                <h3>Isporuka</h3>
                <p>Link za gotovu turu i fotografije stiže za 48h — spremno za postavljanje na oglas istog dana.</p>
              </div>
            </div>

            <div className="card deliver-card">
              <h3>Šta dobijate</h3>
              <ul className="deliver-list">
                <li>Interaktivnu 360° turu sa navigacijom kroz sve prostorije</li>
                <li>HDR fotografije spremne za oglas i društvene mreže</li>
                <li>Audio vodič na srpskom, engleskom, nemačkom i ruskom</li>
                <li>Plan stana i lokaciju integrisane u turu</li>
                <li>Vašu kontakt karticu, vidljivu tokom cele ture</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="tipovi">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Tipovi oglasa</span>
              <h2>Ista tura, drugačiji fokus</h2>
              <p className="note">Bilo da agencija vodi ceo portfolio ili vlasnik oglašava jednu nekretninu, naglasak i pitanja u turi prate namenu oglasa.</p>
            </div>
            <div className="cat-grid">
              <div className="card cat-card">
                <span className="eyebrow">Prodaja</span>
                <h3>Dugoročna vrednost</h3>
                <p className="focus">Fokus na kvadraturu, stanje objekta i vlasništvo — informacije koje su bitne za odluku o kupovini.</p>
                <div className="cat-faq"><span>Tipično pitanje</span><p>„Da li je nekretnina uknjižena i kakvo je vlasništvo?“</p></div>
              </div>
              <div className="card cat-card">
                <span className="eyebrow">Izdavanje</span>
                <h3>Svakodnevna praktičnost</h3>
                <p className="focus">Fokus na mesečne troškove, uslove ugovora i datum useljenja — ono što zanima budućeg stanara.</p>
                <div className="cat-faq"><span>Tipično pitanje</span><p>„Koliki su prosečni mesečni troškovi i kakvo je grejanje?“</p></div>
              </div>
              <div className="card cat-card">
                <span className="eyebrow">Kratkoročni smeštaj</span>
                <h3>Utisak gosta</h3>
                <p className="focus">Fokus na atmosferu, kapacitet i uslove boravka — ono što gost proverava pre rezervacije.</p>
                <div className="cat-faq"><span>Tipično pitanje</span><p>„Koje je tačno vreme za check-in i check-out?“</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="band" id="paketi">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Paketi</span>
              <h2>Osmišljeno za agencije, otvoreno i za pojedince</h2>
              <p className="note">Mesečni paketi su zamišljeni za agencije sa stalnim prilivom oglasa; vlasnici koji prodaju ili izdaju samostalno biraju pojedinačnu turu.</p>
            </div>
            <div className="price-grid">
              <div className="card price-card">
                <span className="price-audience">Za pojedinačne vlasnike</span>
                <h3>Pojedinačna tura</h3>
                <div className="price-value">od <b>60€</b><span>/ nekretnina</span></div>
                <ul className="price-list">
                  <li>1 virtuelna 360° tura</li>
                  <li>HDR fotografije za oglas</li>
                  <li>Audio vodič na srpskom</li>
                  <li>Isporuka za 48h</li>
                </ul>
                <a className="btn btn-secondary price-cta" href="#kontakt">Zatražite ponudu</a>
              </div>

              <div className="card price-card featured">
                <span className="price-badge">Preporučeno za agencije</span>
                <span className="price-audience">Za agencije · 5 tura mesečno</span>
                <h3>Agencija Premium</h3>
                <div className="price-value">od <b>220€</b><span>/ mesečno</span></div>
                <ul className="price-list">
                  <li>5 virtuelnih tura mesečno</li>
                  <li>HDR fotografije uz svaku turu</li>
                  <li>Audio vodič na sva 4 jezika (SR/EN/DE/RU)</li>
                  <li>Plan stana i lokacija uz svaku turu</li>
                  <li>Prioritetno zakazivanje termina</li>
                  <li>Stalni kontakt za agenciju</li>
                </ul>
                <a className="btn btn-primary price-cta" href="#kontakt">Zatražite ponudu</a>
              </div>

              <div className="card price-card">
                <span className="price-audience">Za agencije · 3 ture mesečno</span>
                <h3>Agencija Osnovni</h3>
                <div className="price-value">od <b>150€</b><span>/ mesečno</span></div>
                <ul className="price-list">
                  <li>3 virtuelne ture mesečno</li>
                  <li>HDR fotografije uz svaku turu</li>
                  <li>Audio vodič na srpskom i engleskom</li>
                  <li>Plan stana uz svaku turu</li>
                  <li>Isporuka za 48h</li>
                </ul>
                <a className="btn btn-secondary price-cta" href="#kontakt">Zatražite ponudu</a>
              </div>
            </div>
            <p className="fine-print">* Cene i broj tura su orijentacioni — prilagodite ih pre objave. Za više od 5 tura mesečno pravimo poseban predlog po dogovoru.</p>
          </div>
        </section>

        <section className="integration">
          <div className="wrap">
            <div>
              <span className="eyebrow">Integracija</span>
              <h2>Ugradnja na vaš sajt u jednom koraku</h2>
              <p className="desc">Isporučujemo gotov iframe kod. Ubacite ga na stranicu nekretnine i tura je odmah dostupna posetiocima — bez dodatnog razvoja.</p>
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

        <section className="contact" id="kontakt">
          <div className="wrap">
            <div>
              <div className="section-head left">
                <span className="eyebrow">Kontakt</span>
                <h2>Zakažite snimanje</h2>
                <p className="note">Odgovaramo u roku od 24h radnim danima.</p>
              </div>
              <ContactForm />
            </div>
            <dl className="info-list">
              <div className="card"><dt>Telefon</dt><dd>+381 64 936 7339</dd></div>
              <div className="card"><dt>E-mail</dt><dd>info@kvadrat360.com</dd></div>
              <div className="card"><dt>Adresa</dt><dd>Janka Katića 17, Kragujevac</dd></div>
              <div className="card"><dt>Radno vreme</dt><dd>Pon–Sub, 08–20h</dd></div>
            </dl>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <Logo />
          <p>© 2026 Kvadrat360 · Virtuelne ture za nekretnine, ključ u ruke.</p>
        </div>
      </footer>
    </>
  );
}
