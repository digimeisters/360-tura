import type { Metadata } from 'next';
import HeroDevice from '../components/HeroDevice';
import ContactForm from '../components/ContactForm';

export const metadata: Metadata = {
  title: 'Kvadrat360 — Virtuelne ture i HDR fotografija nekretnina',
  description:
    'Profesionalne 360° virtuelne ture i HDR fotografije za agencije za nekretnine i vlasnike koji prodaju ili izdaju. Audio vodič na srpskom, engleskom, nemačkom i ruskom.',
};

const styles = `
  :root{
    --bg:#FAFAF7;
    --surface:#FFFFFF;
    --surface-2:#F1F1EC;
    --ink:#111113;
    --ink-soft:#5B5D63;
    --ink-faint:#8C8E93;
    --line:#E4E4DE;
    --accent:#1F5F5B;
    --accent-strong:#174744;
    --on-accent:#FFFFFF;
    --dark-bg:#0E0E10;
    --dark-surface:#1A1A1E;
    --dark-ink:#F5F5F3;
    --dark-ink-soft:#A8A9AE;
    --dark-line:#2C2C30;
    --shadow: 0 20px 45px -28px rgba(17,17,19,0.28);
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
      --accent:#4FA39D;
      --accent-strong:#6BBDB6;
      --on-accent:#0B0E1A;
      --shadow: 0 24px 50px -22px rgba(0,0,0,0.6);
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
    --accent:#4FA39D;
    --accent-strong:#6BBDB6;
    --on-accent:#0B0E1A;
    --shadow: 0 24px 50px -22px rgba(0,0,0,0.6);
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
  :focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:2px;}
  @media (prefers-reduced-motion: reduce){ *{animation-duration:.001ms !important; animation-iteration-count:1 !important; transition-duration:.001ms !important;} }

  /* ---------- NAV ---------- */
  .nav{position:sticky; top:0; z-index:40; background:color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter:saturate(140%) blur(10px); border-bottom:1px solid var(--line);}
  .nav .wrap{display:flex; align-items:center; justify-content:space-between; padding-block:.85rem; gap:1rem;}
  .brand{font-family:'Plus Jakarta Sans',sans-serif; font-weight:800; font-size:1.18rem; text-decoration:none; color:var(--ink); letter-spacing:-0.01em;}
  .navlinks{display:flex; align-items:center; gap:1.8rem; list-style:none; margin:0; padding:0;}
  .navlinks a{text-decoration:none; font-size:.9rem; color:var(--ink-soft); font-weight:600; transition:color .15s ease;}
  .navlinks a:hover{color:var(--ink);}
  .btn{
    font-family:'Plus Jakarta Sans',sans-serif; font-weight:700; font-size:.87rem; border-radius:7px; padding:.68rem 1.25rem;
    border:1px solid transparent; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; gap:.5rem;
    transition:transform .15s ease, background .15s ease, color .15s ease, border-color .15s ease; white-space:nowrap;
  }
  .btn-primary{background:var(--accent); color:var(--on-accent);}
  .btn-primary:hover{background:var(--accent-strong);}
  .btn-outline{background:var(--surface); color:var(--ink); border-color:var(--ink);}
  .btn-outline:hover{border-color:var(--accent); color:var(--accent);}
  .link-arrow{font-weight:700; font-size:.9rem; text-decoration:none; color:var(--ink); display:inline-flex; align-items:center; gap:.4rem;}
  .link-arrow:hover{color:var(--accent);}
  @media (hover:hover){ .btn:hover{transform:translateY(-1px);} }
  @media (max-width:780px){ .navlinks{display:none;} }

  section{padding-block:clamp(3rem,7vw,5.2rem);}
  .band{background:var(--surface-2);}
  .section-head{display:flex; flex-direction:column; align-items:center; text-align:center; gap:.65rem; margin-bottom:clamp(2.2rem,4vw,3rem);}
  .section-head h2{font-size:clamp(1.8rem,2.8vw,2.5rem); max-width:22ch;}
  .section-head .note{max-width:52ch; color:var(--ink-soft); font-size:.98rem;}
  .section-head.left{align-items:flex-start; text-align:left;}
  .section-head.left .note{max-width:40ch;}

  /* ---------- HERO ---------- */
  .hero .wrap{display:grid; grid-template-columns:1fr 1.02fr; gap:clamp(2rem,5vw,3.2rem); align-items:center; padding-block:clamp(2.6rem,5vw,3.8rem);}
  .pill{display:inline-flex; align-items:center; gap:.5rem; border:1px solid var(--line); border-radius:20px; padding:.4rem .85rem; font-size:.85rem; font-weight:600; color:var(--ink-soft); background:var(--surface);}
  .pill i{width:6px; height:6px; border-radius:50%; background:var(--accent); flex:none;}
  .hero h1{font-size:clamp(2.5rem,4.6vw,3.9rem); line-height:1.06; margin-top:1rem;}
  .hero .lede{margin-top:1.15rem; max-width:42ch; color:var(--ink-soft); font-size:1.06rem;}
  .hero-ctas{display:flex; align-items:center; gap:1.4rem; margin-top:1.9rem; flex-wrap:wrap;}
  @media (max-width:940px){ .hero .wrap{grid-template-columns:1fr;} }

  /* ---------- DEVICE ---------- */
  .device{border:1px solid var(--line); border-radius:12px; overflow:hidden; background:var(--surface); box-shadow:var(--shadow);}
  .viewport{position:relative; aspect-ratio:16/11; overflow:hidden;
    background-color:var(--surface-2);
    background-image: repeating-linear-gradient(135deg, color-mix(in srgb, var(--ink) 6%, transparent) 0 1px, transparent 1px 14px);
  }
  .vp-label{position:absolute; top:12px; font-family:'Plus Jakarta Sans',sans-serif; font-size:.68rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-faint);}
  .vp-label.left{left:14px;}
  .vp-label.right{right:14px;}
  .compass{position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:150px; height:150px;}
  .compass svg{width:100%; height:100%;}
  .compass circle.ring{fill:none; stroke:var(--line); stroke-width:1.4;}
  .compass circle.dot{fill:var(--accent);}
  .compass line.needle{stroke:var(--accent); stroke-width:2; stroke-linecap:round; transform-origin:75px 75px; transition:transform .5s cubic-bezier(.4,0,.2,1);}
  .device-controls{display:flex; flex-wrap:wrap; gap:1rem; justify-content:space-between; align-items:center; padding:.9rem 1.1rem; border-top:1px solid var(--line); background:var(--surface);}
  .ticker{display:flex; gap:1.1rem; overflow-x:auto; scrollbar-width:none;}
  .ticker button{font-family:'Inter',sans-serif; font-size:.85rem; font-weight:600; background:none; border:none; border-bottom:2px solid transparent; padding:.15rem 0; color:var(--ink-faint); cursor:pointer; white-space:nowrap;}
  .ticker button[aria-pressed="true"]{color:var(--ink); border-color:var(--accent);}
  .lang-tabs{display:flex; gap:.7rem;}
  .lang-tabs button{font-family:'Plus Jakarta Sans',sans-serif; font-size:.74rem; font-weight:700; padding:0; border:none; background:none; color:var(--ink-faint); cursor:pointer;}
  .lang-tabs button[aria-pressed="true"]{color:var(--accent);}

  /* ---------- BENEFITS GRID ---------- */
  .feat-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--line); border:1px solid var(--line); border-radius:10px; overflow:hidden;}
  .feat{background:var(--surface); padding:1.7rem 1.6rem; display:flex; flex-direction:column; gap:.6rem;}
  .feat h3{font-size:1.05rem; font-weight:700;}
  .feat p{color:var(--ink-soft); font-size:.9rem;}
  .feat.filler{background:var(--surface-2);}
  @media (max-width:900px){ .feat-grid{grid-template-columns:1fr 1fr;} .feat.filler{display:none;} }
  @media (max-width:580px){ .feat-grid{grid-template-columns:1fr;} }

  /* ---------- STEPS ---------- */
  .steps-row{display:grid; grid-template-columns:repeat(4,1fr); gap:1.8rem; margin-bottom:2.4rem;}
  @media (max-width:840px){ .steps-row{grid-template-columns:1fr 1fr;} }
  @media (max-width:520px){ .steps-row{grid-template-columns:1fr;} }
  .step .num{font-family:'Plus Jakarta Sans',sans-serif; font-weight:800; font-size:1.1rem; color:var(--accent);}
  .step h3{font-size:1.02rem; font-weight:700; margin-top:.5rem;}
  .step p{margin-top:.45rem; font-size:.9rem; color:var(--ink-soft);}

  .deliver-card{background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:1.6rem 1.8rem;}
  .deliver-card h3{font-size:1.05rem; font-weight:700; margin-bottom:1rem;}
  .deliver-list{display:grid; grid-template-columns:1fr 1fr; gap:.7rem 2rem; list-style:none; margin:0; padding:0;}
  @media (max-width:640px){ .deliver-list{grid-template-columns:1fr;} }
  .deliver-list li{display:flex; gap:.6rem; font-size:.92rem; color:var(--ink);}
  .deliver-list li::before{content:"✓"; color:var(--accent); font-weight:700; flex:none;}

  /* ---------- CATEGORIES ---------- */
  .cat-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:1.2rem;}
  @media (max-width:880px){ .cat-grid{grid-template-columns:1fr;} }
  .cat-card{background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:1.6rem; display:flex; flex-direction:column; gap:.7rem;}
  .cat-card .eyebrow{font-size:.72rem;}
  .cat-card h3{font-size:1.2rem;}
  .cat-card .focus{font-size:.9rem; color:var(--ink-soft);}
  .cat-faq{border-top:1px solid var(--line); padding-top:.9rem; margin-top:.4rem;}
  .cat-faq span{display:block; font-family:'Plus Jakarta Sans',sans-serif; font-size:.68rem; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--ink-faint); margin-bottom:.4rem;}
  .cat-faq p{font-size:.9rem; color:var(--ink); font-style:italic;}

  /* ---------- PRICING ---------- */
  .price-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:1.2rem; align-items:stretch;}
  @media (max-width:920px){ .price-grid{grid-template-columns:1fr;} }
  .price-card{position:relative; background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:1.7rem 1.6rem; display:flex; flex-direction:column; gap:1.1rem;}
  .price-card.featured{background:var(--dark-bg); border-color:var(--dark-bg); color:var(--dark-ink);}
  .price-badge{position:absolute; top:-.75rem; left:1.5rem; background:var(--accent); color:#fff; font-family:'Plus Jakarta Sans',sans-serif; font-size:.65rem; font-weight:700; letter-spacing:.05em; text-transform:uppercase; padding:.32rem .65rem; border-radius:20px;}
  .price-audience{font-family:'Plus Jakarta Sans',sans-serif; font-size:.7rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-faint);}
  .price-card.featured .price-audience{color:var(--dark-ink-soft);}
  .price-card h3{font-size:1.4rem;}
  .price-card.featured h3{color:var(--dark-ink);}
  .price-value{display:flex; align-items:baseline; gap:.35rem; font-size:.92rem; color:var(--ink-soft);}
  .price-card.featured .price-value{color:var(--dark-ink-soft);}
  .price-value b{font-family:'Plus Jakarta Sans',sans-serif; font-size:2.2rem; font-weight:800; color:var(--ink);}
  .price-card.featured .price-value b{color:var(--dark-ink);}
  .price-list{list-style:none; margin:0; padding:1rem 0 0; border-top:1px solid var(--line); display:flex; flex-direction:column; gap:.6rem; flex:1;}
  .price-card.featured .price-list{border-color:var(--dark-line);}
  .price-list li{font-size:.88rem; color:var(--ink-soft);}
  .price-card.featured .price-list li{color:var(--dark-ink-soft);}
  .price-cta{justify-content:center; width:100%;}

  /* ---------- DEMO TOURS ---------- */
  .tours-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:1.3rem;}
  @media (max-width:900px){ .tours-grid{grid-template-columns:1fr 1fr;} }
  @media (max-width:600px){ .tours-grid{grid-template-columns:1fr;} }
  .tour-card{background:var(--surface); border:1px solid var(--line); border-radius:10px; overflow:hidden;}
  .tour-visual{position:relative; aspect-ratio:4/3;
    background-color:var(--surface-2);
    background-image: repeating-linear-gradient(135deg, color-mix(in srgb, var(--ink) 6%, transparent) 0 1px, transparent 1px 14px);
    display:flex; align-items:center; justify-content:center;
  }
  .tour-visual .circle{width:64px; height:64px; border-radius:50%; border:1.4px solid var(--ink-faint);}
  .tour-badge{position:absolute; top:.7rem; left:.7rem; font-family:'Plus Jakarta Sans',sans-serif; font-size:.64rem; font-weight:700; letter-spacing:.04em; text-transform:uppercase; background:var(--accent); color:#fff; padding:.28rem .55rem; border-radius:5px;}
  .tour-langs{position:absolute; bottom:.7rem; right:.8rem; font-family:'Plus Jakarta Sans',sans-serif; font-size:.68rem; font-weight:700; color:var(--accent); display:flex; gap:.4rem;}
  .tour-body{padding:1rem 1.1rem 1.15rem;}
  .tour-body h3{font-size:.98rem; font-weight:700;}
  .tours-note{margin-top:1.4rem; font-size:.85rem; color:var(--ink-faint); text-align:center;}

  /* ---------- INTEGRATION ---------- */
  .integration{background:var(--dark-bg); color:var(--dark-ink);}
  .integration .wrap{display:grid; grid-template-columns:1fr 1.1fr; gap:clamp(2rem,5vw,3.5rem); align-items:center;}
  @media (max-width:880px){ .integration .wrap{grid-template-columns:1fr;} }
  .integration .eyebrow{color:var(--accent);}
  .integration h2{color:var(--dark-ink); font-size:clamp(1.7rem,2.6vw,2.2rem); margin-top:.6rem;}
  .integration p.desc{margin-top:1rem; color:var(--dark-ink-soft); font-size:1rem; max-width:38ch;}
  .code-block{background:var(--dark-surface); border-radius:10px; padding:1.5rem 1.6rem; font-family:'Menlo','Consolas',monospace; font-size:.86rem; line-height:1.7; color:#C7C9D1; overflow-x:auto;}
  .code-block .tag{color:var(--accent);}
  .code-block .attr{color:#E3B6E0;}
  .code-block .str{color:#9FD6A8;}

  /* ---------- CONTACT ---------- */
  .contact .wrap{display:grid; grid-template-columns:1.1fr .9fr; gap:clamp(2rem,5vw,3.4rem); align-items:start;}
  @media (max-width:880px){ .contact .wrap{grid-template-columns:1fr;} }
  .contact h2{font-size:clamp(1.8rem,2.8vw,2.5rem); margin-top:.6rem; margin-bottom:.3rem;}
  form{display:flex; flex-direction:column; gap:1rem; margin-top:1.5rem;}
  .field{display:flex; flex-direction:column; gap:.4rem;}
  .field label{font-size:.8rem; font-weight:600; color:var(--ink-soft);}
  .field input, .field select, .field textarea{
    font-family:'Inter',sans-serif; font-size:.95rem; color:var(--ink);
    background:var(--surface); border:1px solid var(--line); border-radius:6px; padding:.7rem .8rem; outline-offset:2px;
  }
  .field textarea{resize:vertical; min-height:88px;}
  .row2{display:grid; grid-template-columns:1fr 1fr; gap:1rem;}
  @media (max-width:540px){ .row2{grid-template-columns:1fr;} }
  .form-note{font-size:.8rem; color:var(--ink-faint); margin-top:-.2rem;}
  .info-list{display:flex; flex-direction:column; gap:1.4rem; margin-top:2.6rem;}
  .info-list dt{font-family:'Plus Jakarta Sans',sans-serif; font-size:.7rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-faint); margin:0;}
  .info-list dd{margin:.35rem 0 0; font-size:1rem; font-weight:600; color:var(--ink);}

  footer{border-top:1px solid var(--line); padding-block:1.6rem;}
  footer .wrap{display:flex; flex-wrap:wrap; justify-content:space-between; gap:1rem; align-items:center;}
  footer p{font-size:.85rem; color:var(--ink-soft);}
`;

export default function Home() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <header className="nav">
        <div className="wrap">
          <a className="brand" href="#pocetna">Kvadrat360</a>
          <ul className="navlinks">
            <li><a href="#kako-radimo">Kako radimo</a></li>
            <li><a href="#benefiti">Benefiti</a></li>
            <li><a href="#paketi">Paketi</a></li>
          </ul>
          <div><a className="btn btn-primary" href="#kontakt">Zakažite snimanje</a></div>
        </div>
      </header>

      <main>
        <section className="hero" id="pocetna">
          <div className="wrap">
            <div>
              <span className="pill"><i></i>Prodaja · Izdavanje · Smeštaj</span>
              <h1>Svaki kvadrat iz svakog ugla.</h1>
              <p className="lede">
                Virtuelna 360° tura i HDR fotografije pokazuju svaki ugao unapred, za ceo portfolio
                agencije ili pojedinačan oglas — dolaze samo ozbiljno zainteresovani kupci i zakupci,
                spremni da brzo donesu odluku.
              </p>
              <div className="hero-ctas">
                <a className="btn btn-primary" href="#paketi">Pogledajte pakete za agencije</a>
                <a className="link-arrow" href="#benefiti">Pogledajte benefite →</a>
              </div>
            </div>

            <HeroDevice />
          </div>
        </section>

        <section id="benefiti">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Benefiti</span>
              <h2>Zašto virtuelna tura prodaje bolje</h2>
              <p className="note">Ono što tura i HDR fotografije donose vama i vašim klijentima — ne tehnologija iza toga.</p>
            </div>
            <div className="feat-grid">
              <div className="feat">
                <h3>Manje uzaludnih poseta</h3>
                <p>Kupci i zakupci prvo „prošetaju“ kroz stan online — na razgledanje dolaze samo ozbiljno zainteresovani.</p>
              </div>
              <div className="feat">
                <h3>Oglas koji se izdvaja</h3>
                <p>360° tura i HDR fotografije privlače više pregleda i upita nego obične slike telefonom.</p>
              </div>
              <div className="feat">
                <h3>Doseg do inostranih kupaca</h3>
                <p>Audio vodič je dostupan na srpskom, engleskom, nemačkom i ruskom — bez potrebe za prevodiocem.</p>
              </div>
              <div className="feat">
                <h3>Dostupno 24 sata</h3>
                <p>Nekretnina je „otvorena“ za razgledanje u svakom trenutku, bez usklađivanja termina.</p>
              </div>
              <div className="feat">
                <h3>Brža prodaja i izdavanje</h3>
                <p>Nekretnine predstavljene turom i HDR fotografijama prosečno brže nalaze kupca ili zakupca.</p>
              </div>
              <div className="feat">
                <h3>Sve na jednom mestu</h3>
                <p>Plan stana, lokacija i vaš kontakt dostupni su unutar iste ture — bez dodatnih poziva i mejlova.</p>
              </div>
              <div className="feat">
                <h3>Profesionalan prvi utisak</h3>
                <p>Kvalitetna fotografija i uređena tura grade poverenje pre prvog kontakta.</p>
              </div>
              <div className="feat">
                <h3>Radi na svakom uređaju</h3>
                <p>Tura se otvara direktno u pretraživaču, na telefonu ili računaru — bez preuzimanja aplikacije.</p>
              </div>
              <div className="feat filler" aria-hidden="true"></div>
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
              <div className="step">
                <span className="num">01</span>
                <h3>Zakazivanje</h3>
                <p>Dogovorite termin telefonom ili preko forme — dolazimo sa opremom u ugovoreno vreme, bez ometanja stanara ili zakupaca.</p>
              </div>
              <div className="step">
                <span className="num">02</span>
                <h3>Snimanje</h3>
                <p>30–60 minuta po nekretnini: 360° panorame svake prostorije i HDR fotografije za oglas.</p>
              </div>
              <div className="step">
                <span className="num">03</span>
                <h3>Obrada</h3>
                <p>Spajanje panorame, kalibracija boja i priprema audio vodiča na jezicima koji su vam potrebni.</p>
              </div>
              <div className="step">
                <span className="num">04</span>
                <h3>Isporuka</h3>
                <p>Link za gotovu turu i fotografije stiže za 48h — spremno za postavljanje na oglas istog dana.</p>
              </div>
            </div>

            <div className="deliver-card">
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
              <div className="cat-card">
                <span className="eyebrow">Prodaja</span>
                <h3>Dugoročna vrednost</h3>
                <p className="focus">Fokus na kvadraturu, stanje objekta i vlasništvo — informacije koje su bitne za odluku o kupovini.</p>
                <div className="cat-faq"><span>Tipično pitanje</span><p>„Da li je nekretnina uknjižena i kakvo je vlasništvo?“</p></div>
              </div>
              <div className="cat-card">
                <span className="eyebrow">Izdavanje</span>
                <h3>Svakodnevna praktičnost</h3>
                <p className="focus">Fokus na mesečne troškove, uslove ugovora i datum useljenja — ono što zanima budućeg stanara.</p>
                <div className="cat-faq"><span>Tipično pitanje</span><p>„Koliki su prosečni mesečni troškovi i kakvo je grejanje?“</p></div>
              </div>
              <div className="cat-card">
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
              <div className="price-card">
                <span className="price-audience">Za pojedinačne vlasnike</span>
                <h3>Pojedinačna tura</h3>
                <div className="price-value">od <b>60€</b><span>/ nekretnina</span></div>
                <ul className="price-list">
                  <li>1 virtuelna 360° tura</li>
                  <li>HDR fotografije za oglas</li>
                  <li>Audio vodič na srpskom</li>
                  <li>Isporuka za 48h</li>
                </ul>
                <a className="btn btn-outline price-cta" href="#kontakt">Zatražite ponudu</a>
              </div>

              <div className="price-card featured">
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

              <div className="price-card">
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
                <a className="btn btn-outline price-cta" href="#kontakt">Zatražite ponudu</a>
              </div>
            </div>
            <p className="tours-note">* Cene i broj tura su orijentacioni — prilagodite ih pre objave. Za više od 5 tura mesečno pravimo poseban predlog po dogovoru.</p>
          </div>
        </section>

        <section id="demo">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Demo ture</span>
              <h2>Po jedan primer za svaki tip oglasa</h2>
              <p className="note">Ilustrativni prikaz do popune pravim panoramama — format i redosled ostaju isti.</p>
            </div>
            <div className="tours-grid">
              <div className="tour-card">
                <div className="tour-visual">
                  <span className="tour-badge">Prodaja</span>
                  <div className="circle"></div>
                  <span className="tour-langs"><span>SR</span><span>EN</span><span>DE</span><span>RU</span></span>
                </div>
                <div className="tour-body"><h3>Stan · Vračar, 64 m²</h3></div>
              </div>
              <div className="tour-card">
                <div className="tour-visual">
                  <span className="tour-badge">Izdavanje</span>
                  <div className="circle"></div>
                  <span className="tour-langs"><span>SR</span><span>EN</span><span>DE</span><span>RU</span></span>
                </div>
                <div className="tour-body"><h3>Dvosoban stan · Zvezdara, 52 m²</h3></div>
              </div>
              <div className="tour-card">
                <div className="tour-visual">
                  <span className="tour-badge">Smeštaj</span>
                  <div className="circle"></div>
                  <span className="tour-langs"><span>SR</span><span>EN</span><span>DE</span><span>RU</span></span>
                </div>
                <div className="tour-body"><h3>Apartman · Stari grad, 38 m²</h3></div>
              </div>
            </div>
            <p className="tours-note">* Prikazane ilustracije su placeholder — zamenjuju se stvarnim panoramama i pravim linkovima ka turama.</p>
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
              &nbsp;&nbsp;<span className="attr">src</span>=<span className="str">&quot;https://kvadrat360.com/tour/vila-dedinje&quot;</span>
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
            <div>
              <dl className="info-list">
                <div><dt>Telefon</dt><dd>+381 64 936 7339</dd></div>
                <div><dt>E-mail</dt><dd>info@kvadrat360.com</dd></div>
                <div><dt>Adresa</dt><dd>Janka Katića 17, Kragujevac</dd></div>
                <div><dt>Radno vreme</dt><dd>Pon–Sub, 08–20h</dd></div>
              </dl>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <p>© 2026 Kvadrat360. Sva prava zadržana.</p>
          <p>Virtuelne ture za nekretnine, ključ u ruke.</p>
        </div>
      </footer>
    </>
  );
}
