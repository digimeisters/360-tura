import type { CSSProperties } from 'react';

/**
 * Vrh strane /za-vlasnike (vlasnik, 4. 11. 2026; maketa
 * public/mockup/VrhStrana.html): telefon sa PRAVOM turom (snimak ekrana ture
 * stan-kragujevac-maglicka1, soba "Kuhinja sa trpezarijom", 390x844 na
 * telefonu) i natpisi levo i desno, svaki sa linijom do svog dugmeta.
 *
 * Slika je obična (public/hero/vlasnici-tura.webp, 600x1298), ne živa tura -
 * vrh strane ostaje brz, a početna i dalje ima živu turu. Kad se izgled ture
 * promeni, snimak se pravi ponovo (Playwright, telefon 390x844, DPR 2).
 *
 * Natpisi su povezani sa ekranom na SVAKOJ širini (vlasnik: ne spisak ispod):
 * sav položaj se računa iz --sw (širina ekrana telefona) i --x/--y (mesto
 * dugmeta u % snimka), pa se na užem prozoru sve samo smanji. Na telefonu
 * ostaju samo nazivi, bez objašnjenja.
 */

/** Mesto dugmeta kao deo širine i visine snimka (snimak 780x1688). */
type Callout = { title: string; text: string; x: number; y: number; side: 'l' | 'r' };

const CALLOUTS: Callout[] = [
  { title: 'Prostorije', text: 'Redom, sa osnovom nekretnine', x: 0.244, y: 0.107, side: 'l' },
  { title: 'Glas', text: 'Vodi kupca kroz svaku prostoriju', x: 0.928, y: 0.305, side: 'r' },
  { title: 'Tačke', text: 'Vode u sledeću prostoriju', x: 0.141, y: 0.454, side: 'l' },
  { title: 'Opis', text: 'Kratko o svakoj prostoriji', x: 0.964, y: 0.829, side: 'r' },
  { title: 'Pitanja', text: 'Tura odgovara iz podataka o nekretnini', x: 0.135, y: 0.939, side: 'l' },
  { title: 'Kontakt', text: 'Poziv ili poruka stiže vama', x: 0.862, y: 0.939, side: 'r' }
];

export const OWNER_HERO_STYLES = `
  .oh{position:relative; padding:clamp(2.2rem,5vw,4rem) 0 0; overflow:hidden;
    background:radial-gradient(60% 70% at 88% 0%, color-mix(in srgb, var(--accent) 16%, transparent) 0%, transparent 70%), var(--bg);}
  .oh .wrap{display:grid; grid-template-columns:minmax(0,1fr) 700px; gap:clamp(1.5rem,3vw,2.5rem); align-items:center;}
  .oh-copy{padding-bottom:clamp(2.5rem,5vw,4rem);}
  .oh-copy h1{font-size:clamp(2.3rem,3.6vw,3.4rem); line-height:1.04; letter-spacing:-0.035em;}
  .oh-copy h1 em{white-space:nowrap;}
  .oh-copy .lede{margin-top:1rem; max-width:44ch; color:var(--ink-soft); font-size:clamp(1rem,1.2vw,1.1rem); line-height:1.6;}
  .oh-copy .hero-ctas{margin-top:1.5rem;}

  /* Scena: telefon u sredini, natpisi levo i desno. --sw = širina ekrana,
     okvir telefona 10px, snimak je 600x1298 (visina = 2.1633 x širina). */
  .oh-stage{--sw:300px; --bz:10px; --tw:150px; --sh:calc(var(--sw) * 2.1633);
    position:relative; width:700px; max-width:100%; height:calc(var(--sh) + var(--bz) * 2 - 1px); align-self:end; justify-self:center;}
  .oh-phone{position:absolute; left:calc(50% - var(--sw) / 2 - var(--bz)); top:var(--bz); width:calc(var(--sw) + var(--bz) * 2);
    height:calc(var(--sh) + var(--bz)); padding:var(--bz) var(--bz) 0; box-sizing:border-box; border-radius:calc(var(--bz) * 4.6) calc(var(--bz) * 4.6) 0 0;
    background:#0F1014; box-shadow:0 40px 80px -30px rgba(17,17,19,.55);}
  .oh-screen{position:relative; border-radius:calc(var(--bz) * 3.6) calc(var(--bz) * 3.6) 0 0; overflow:hidden; line-height:0;}
  .oh-screen img{display:block; width:var(--sw); height:auto;}
  .oh-dot{position:absolute; width:14px; height:14px; transform:translate(-50%,-50%); border-radius:50%; background:#1E5AA8;
    box-shadow:0 0 0 2px #FFFFFF, 0 0 0 7px rgba(30,90,168,.3);}
  /* Natpis: tekst + linija koja se završava tačno kod tačke na ekranu. */
  .oh-co{position:absolute; top:calc(var(--bz) * 2 + var(--y) * var(--sh)); display:flex; align-items:center; transform:translateY(-50%); pointer-events:none;}
  .oh-co.l{left:0; width:calc(50% - var(--sw) / 2 + var(--x) * var(--sw) - 7px);}
  .oh-co.r{right:0; width:calc(50% + var(--sw) / 2 - var(--x) * var(--sw) - 7px); flex-direction:row-reverse;}
  .oh-co .t{flex:none; width:var(--tw); font-size:.86rem; line-height:1.35; color:var(--ink-soft);}
  .oh-co.l .t{text-align:right;}
  .oh-co .t b{display:block; margin-bottom:1px; font-family:var(--font-display); font-size:1.08rem; font-weight:800; color:var(--ink); letter-spacing:-0.01em;}
  .oh-co .ln{flex:1; min-width:8px; height:1px; margin:0 6px; background:color-mix(in srgb, var(--accent) 60%, transparent);}
  /* Isti sadržaj za čitač ekrana (natpisi oko telefona su aria-hidden). */
  .oh-list{position:absolute; width:1px; height:1px; margin:-1px; padding:0; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0;}

  /* Tablet: tekst gore, scena ispod, u sredini. */
  @media (max-width:1180px){
    .oh .wrap{grid-template-columns:1fr;}
    .oh-copy{padding-bottom:1rem;}
  }
  /* Uži prozor: manji telefon i uži natpisi, i dalje sa linijom do ekrana. */
  @media (max-width:779px){
    .oh-stage{--sw:240px; --bz:8px; --tw:118px; width:100%;}
    .oh-co .t{font-size:.78rem;}
    .oh-co .t b{font-size:.98rem;}
  }
  /* Telefon: samo nazivi, bez objašnjenja. */
  @media (max-width:520px){
    .oh-stage{--sw:180px; --bz:7px; --tw:auto;}
    .oh-co .t{font-size:0; max-width:5.2rem;}
    .oh-co .t b{margin:0; font-size:.86rem;}
    .oh-co .ln{margin:0 4px;}
    .oh-dot{width:11px; height:11px; box-shadow:0 0 0 2px #FFFFFF, 0 0 0 5px rgba(30,90,168,.3);}
  }
`;

export default function OwnerHeroPhone() {
  return (
    <>
      <div className="oh-stage">
        <div className="oh-phone">
          <div className="oh-screen">
            {/* eslint-disable-next-line @next/next/no-img-element -- statičan snimak, unapred smanjen na 600px */}
            <img
              src="/hero/vlasnici-tura.webp"
              width={600}
              height={1298}
              alt="Primer 360° ture na telefonu: kuhinja sa trpezarijom, sa dugmadima Pitanja, Lokacija, Info, Plan i Kontakt"
              fetchPriority="high"
            />
            {CALLOUTS.map((c) => (
              <i key={c.title} className="oh-dot" style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }} aria-hidden="true" />
            ))}
          </div>
        </div>
        {CALLOUTS.map((c) => (
          <div
            key={c.title}
            className={`oh-co ${c.side}`}
            style={{ '--x': c.x, '--y': c.y } as CSSProperties}
            aria-hidden="true"
          >
            <span className="t">
              <b>{c.title}</b>
              {c.text}
            </span>
            <i className="ln" />
          </div>
        ))}
      </div>
      <ul className="oh-list">
        {CALLOUTS.map((c) => (
          <li key={c.title}>
            {c.title}: {c.text}
          </li>
        ))}
      </ul>
    </>
  );
}
