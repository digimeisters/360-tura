'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { accent } from '../app/lib/accent';
import { WALK_COPY, WALK_SCREENS, WALK_STEPS, type WalkScreen, type WalkStep } from '../app/lib/tourWalkthrough';

/**
 * "Kako radi tura" (podaci i poreklo ekrana: lib/tourWalkthrough.ts). Telefon
 * stoji zalepljen dok posetilac skroluje; svaki deo skrola je jedan korak:
 * reflektor na mestu dodira, prst, pa ekran koji se tada otvori u pravoj turi.
 *
 * Bez JS-a sekcija nije zalepljena: telefon sa početnim ekranom i pregled svih
 * koraka. Uz smanjene pokrete koraci se i dalje menjaju, samo bez prelaza.
 * Klase za animaciju (aim, lbl-on, done) stoje na .thw-pin, koji React ne
 * menja posle prvog crtanja, da ih ponovno crtanje ne bi obrisalo.
 */
const N = WALK_STEPS.length;
/** Visina skrola po koraku (deo visine ekrana). */
const STEP_SVH = 55;

const STYLES = `
  .thw{position:relative; overflow-x:clip; padding-top:clamp(3rem,7vw,5rem);}
  .thw-head{max-width:42rem; margin:0 auto; padding:0 1rem; text-align:center;}
  .thw-head h2{font-size:clamp(2rem,4vw,3rem); line-height:1.06; letter-spacing:-0.035em;}

  .thw-track{position:relative;}
  /* --top: gornji meni sajta je zalepljen (67 px), telefon ide ispod njega. */
  .thw-pin{--top:4.5rem; --sw:clamp(220px, calc((100svh - var(--top) - 5rem) / 2.2), 300px); --bz:10px; box-sizing:border-box;
    display:grid; grid-template-columns:minmax(0,560px) minmax(0,420px); justify-content:center; align-items:center;
    gap:clamp(2rem,4vw,4.5rem); padding:2.5rem 1.25rem clamp(3rem,6vw,5rem);}
  .thw.is-armed .thw-pin{position:sticky; top:0; height:100svh; padding-block:var(--top) 0;}

  .thw-stage{--sh:calc(var(--sw) * 2.1633); position:relative; width:100%; height:calc(var(--sh) + var(--bz) * 2);}
  .thw-phone{position:absolute; top:0; left:calc(50% - var(--sw) / 2 - var(--bz)); width:calc(var(--sw) + var(--bz) * 2); height:100%;
    padding:var(--bz); border-radius:calc(var(--bz) * 4.6); background:#0F1014;
    box-shadow:0 2px 0 1px #2A2B31 inset, 0 50px 90px -40px rgba(17,17,19,.6), 0 18px 30px -18px rgba(17,17,19,.35);}
  .thw-screen{position:relative; height:100%; border-radius:calc(var(--bz) * 3.6); overflow:hidden; isolation:isolate; background:#1A1B1F;}

  .thw-ly{position:absolute; inset:0; opacity:0; transition:opacity .5s ease, transform .75s cubic-bezier(.16,1,.3,1);}
  .thw-ly.first{opacity:1;}
  .thw-ly img{display:block; width:100%; height:auto;}

  @property --fx{syntax:'<percentage>'; inherits:true; initial-value:50%;}
  @property --fy{syntax:'<percentage>'; inherits:true; initial-value:50%;}
  @property --rw{syntax:'<length>'; inherits:true; initial-value:40px;}
  @property --rh{syntax:'<length>'; inherits:true; initial-value:40px;}
  .thw-shade{position:absolute; inset:0; z-index:5; pointer-events:none; background:rgba(8,10,14,.6); opacity:0;
    -webkit-mask:radial-gradient(var(--rw) var(--rh) at var(--fx) var(--fy), transparent 0 55%, #000 100%);
            mask:radial-gradient(var(--rw) var(--rh) at var(--fx) var(--fy), transparent 0 55%, #000 100%);
    transition:opacity .45s cubic-bezier(.16,1,.3,1), --fx .7s cubic-bezier(.16,1,.3,1), --fy .7s cubic-bezier(.16,1,.3,1), --rw .7s cubic-bezier(.16,1,.3,1), --rh .7s cubic-bezier(.16,1,.3,1);}
  .thw-pin.aim .thw-shade{opacity:1;}

  .thw-tap{position:absolute; z-index:6; left:var(--dx); top:var(--dy); width:34px; height:34px; margin:-17px 0 0 -17px; border-radius:50%; pointer-events:none;
    background:rgba(255,255,255,.92); box-shadow:0 0 0 2px #1E5AA8, 0 8px 18px -6px rgba(0,0,0,.6); opacity:0; transform:scale(.4);}
  .thw-tap::after{content:""; position:absolute; inset:0; border-radius:50%; border:2px solid #fff; opacity:0;}
  .thw-tap.go{animation:thw-press .75s cubic-bezier(.16,1,.3,1) both;}
  .thw-tap.go::after{animation:thw-wave .75s .28s ease-out both;}
  @keyframes thw-press{0%{opacity:0; transform:scale(1.4);} 30%{opacity:1; transform:scale(1);} 50%{transform:scale(.78);} 80%{opacity:1; transform:scale(.9);} 100%{opacity:0; transform:scale(.9);}}
  @keyframes thw-wave{0%{opacity:.9; transform:scale(1);} 100%{opacity:0; transform:scale(2.8);}}

  .thw-dot{position:absolute; z-index:7; left:var(--dx); top:var(--dy); width:13px; height:13px; margin:-6.5px 0 0 -6.5px; border-radius:50%; background:#1E5AA8;
    box-shadow:0 0 0 2px #fff, 0 6px 14px -4px rgba(0,0,0,.6); transform:scale(0); transition:transform .45s cubic-bezier(.16,1,.3,1), opacity .3s ease;}
  .thw-pin.lbl-on .thw-dot{transform:scale(1);}
  .thw-pin.done .thw-dot{opacity:0;}
  .thw-lbl{position:absolute; z-index:8; top:calc(var(--bz) + var(--ly) * var(--sh)); display:flex; align-items:center; translate:0 -50%; pointer-events:none;}
  .thw-lbl.l{left:0; width:calc(50% - var(--sw) / 2 + var(--lx) * var(--sw) - 8px);}
  .thw-lbl.r{right:0; width:calc(50% + var(--sw) / 2 - var(--lx) * var(--sw) - 8px); flex-direction:row-reverse;}
  .thw-lbl b{flex:none; font-family:var(--font-display); font-weight:800; font-size:1.12rem; letter-spacing:-0.015em; color:var(--accent);
    opacity:0; transform:translateX(-16px); filter:blur(5px); transition:opacity .4s ease, transform .5s cubic-bezier(.16,1,.3,1), filter .4s ease;}
  .thw-lbl.r b{transform:translateX(16px);}
  .thw-lbl i{flex:1; min-width:10px; height:1.5px; margin:0 8px; background:var(--accent); transform:scaleX(0); transform-origin:right;
    transition:transform .45s cubic-bezier(.16,1,.3,1), opacity .3s ease;}
  .thw-lbl.r i{transform-origin:left;}
  .thw-pin.lbl-on .thw-lbl i{transform:scaleX(1); transition-delay:.12s;}
  .thw-pin.lbl-on .thw-lbl b{opacity:1; transform:none; filter:none; transition-delay:.28s;}
  .thw-pin.done .thw-lbl i{opacity:0;}

  .thw-all{position:absolute; inset:0; z-index:7; pointer-events:none;}
  .thw-all i{position:absolute; width:11px; height:11px; margin:-5.5px 0 0 -5.5px; border-radius:50%; background:#1E5AA8; box-shadow:0 0 0 2px #fff;
    opacity:0; transform:scale(0); transition:opacity .3s ease, transform .5s cubic-bezier(.16,1,.3,1); transition-delay:calc(var(--i) * 70ms);}
  .thw.end .thw-all i{opacity:1; transform:scale(1);}

  .thw-meta{display:flex; align-items:center; gap:.9rem; margin-bottom:1.3rem; font-size:.82rem; font-weight:600; color:var(--ink-faint); font-variant-numeric:tabular-nums;}
  .thw-bars{display:flex; gap:5px;}
  .thw-bars i{width:14px; height:3px; border-radius:2px; background:var(--line); transition:background .4s ease, width .4s cubic-bezier(.16,1,.3,1);}
  .thw-bars i.done{background:color-mix(in srgb, var(--accent) 40%, var(--line));}
  .thw-bars i.cur{width:26px; background:var(--accent);}
  .thw-body{transition:opacity .25s ease, transform .5s cubic-bezier(.16,1,.3,1), filter .35s ease;}
  .thw-body.out{opacity:0; transform:translateY(14px); filter:blur(4px); transition-duration:.16s;}
  .thw-body h3{font-size:clamp(1.7rem,2.6vw,2.35rem); line-height:1.08;}
  .thw-body > p{margin-top:1rem; color:var(--ink-soft); font-size:1.05rem; line-height:1.62; max-width:36ch;}
  .thw-gain{display:grid; gap:.55rem; margin:1.5rem 0 0; padding:1.1rem 0 0; border-top:1px solid var(--line); list-style:none;}
  .thw-gain li{display:grid; grid-template-columns:4.6rem 1fr; gap:.8rem; font-size:.95rem; line-height:1.45; color:var(--ink);}
  .thw-gain li span{font-size:.8rem; font-weight:600; color:var(--ink-faint); padding-top:.1rem;}
  .thw-names{display:flex; flex-wrap:wrap; gap:.45rem; margin:1.4rem 0 0; padding:0; list-style:none;}
  .thw-names li{padding:.38rem .8rem; border-radius:999px; background:var(--accent-soft); color:var(--accent); font-size:.86rem; font-weight:600;}
  .thw-body > p.thw-src{margin-top:1.3rem; font-size:.8rem; color:var(--ink-faint);}
  .thw-sr{position:absolute; width:1px; height:1px; margin:-1px; padding:0; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0;}

  /* Tablet: telefon levo, kratko objašnjenje desno; sve staje u visinu ekrana. */
  @media (max-width:1060px){
    .thw-pin{--sw:clamp(130px, calc((100svh - var(--top) - 2.5rem) / 2.2), 240px); --bz:8px; grid-template-columns:calc(var(--sw) + 12rem) minmax(0,19rem); gap:1.25rem;}
    .thw-gain, .thw-body > p.thw-src{display:none;}
    .thw-meta{margin-bottom:.8rem;}
    .thw-body h3{font-size:clamp(1.35rem,3.2vw,1.8rem);}
    .thw-body > p{margin-top:.6rem; font-size:.97rem; line-height:1.5;}
    .thw-lbl b{font-size:.95rem;}
  }
  /* Telefon: telefon gore, objašnjenje ispod, oba u jednom ekranu. */
  @media (max-width:640px){
    .thw-pin{--top:3.75rem; --sw:clamp(120px, calc((100svh - var(--top) - 11rem) / 2.2), 200px); grid-template-columns:minmax(0,1fr); align-content:center; gap:1rem; padding-inline:.75rem;}
    .thw-stage{justify-self:center; width:min(100%, calc(var(--sw) + 11rem));}
    .thw-panel{justify-self:center; max-width:22rem; min-height:8.2rem; text-align:center;}
    .thw-meta{justify-content:center; margin-bottom:.5rem;}
    .thw-body h3{font-size:1.3rem;}
    .thw-body > p{margin:.4rem auto 0; font-size:.92rem;}
    .thw-names{justify-content:center;}
    .thw-lbl b{font-size:.84rem;}
    .thw-lbl i{margin:0 5px;}
    .thw-tap{width:24px; height:24px; margin:-12px 0 0 -12px;}
  }
  @media (prefers-reduced-motion:reduce){
    .thw-ly, .thw-shade, .thw-dot, .thw-lbl b, .thw-lbl i, .thw-body, .thw-bars i, .thw-all i{transition:none !important;}
    .thw-tap{display:none;}
  }
`;

function Panel({ step }: { step: number }) {
  if (step >= 1 && step <= N) {
    const s = WALK_STEPS[step - 1];
    return (
      <>
        <h3>{accent(s.title)}</h3>
        <p>{s.text}</p>
        <ul className="thw-gain">
          <li><span>Kupac</span>{s.buyer}</li>
          <li><span>Vi</span>{s.you}</li>
        </ul>
      </>
    );
  }
  if (step === 0) {
    return (
      <>
        <h3>{accent(WALK_COPY.intro.title)}</h3>
        <p>{WALK_COPY.intro.text}</p>
        <p className="thw-src">{WALK_COPY.source}</p>
      </>
    );
  }
  return (
    <>
      <h3>{accent(WALK_COPY.end.title)}</h3>
      <p>{WALK_COPY.end.text}</p>
      <ul className="thw-names">
        {WALK_STEPS.map((s) => <li key={s.name}>{s.name}</li>)}
      </ul>
    </>
  );
}

export default function TourWalkthrough({ id = 'kako-radi-tura' }: { id?: string }) {
  const [armed, setArmed] = useState(false);
  // Bez JS-a (i pre nego što se skript pokrene) vidi se kraj: pregled svih koraka.
  const [step, setStep] = useState(N + 1);
  const [panelStep, setPanelStep] = useState(N + 1);
  const [out, setOut] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const pin = pinRef.current;
    if (!track || !pin) return;
    const screen = pin.querySelector<HTMLElement>('.thw-screen')!;
    const tap = pin.querySelector<HTMLElement>('.thw-tap')!;
    const lbl = pin.querySelector<HTMLElement>('.thw-lbl')!;
    const lblText = lbl.querySelector('b')!;
    const layers = new Map<WalkScreen, HTMLElement>();
    pin.querySelectorAll<HTMLElement>('.thw-ly').forEach((el) => layers.set(el.dataset.n as WalkScreen, el));

    let cur: WalkScreen = 'pocetak';
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (ms: number, fn: () => void) => {
      const t = setTimeout(() => {
        timers.delete(t);
        fn();
      }, ms);
      timers.add(t);
    };
    const clear = () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
    const hides = new Set<ReturnType<typeof setTimeout>>();
    // Tekst u panelu: stari izbledi, pa dođe novi.
    let panelTimer: ReturnType<typeof setTimeout> | undefined;
    const showPanel = (n: number) => {
      setOut(true);
      clearTimeout(panelTimer);
      panelTimer = setTimeout(() => {
        setPanelStep(n);
        setOut(false);
      }, 170);
    };

    const swap = (name: WalkScreen, mode: WalkStep['mode'] = 'fade', origin = '50% 50%') => {
      if (cur === name) return;
      const next = layers.get(name)!;
      const prev = layers.get(cur)!;
      cur = name;
      next.classList.remove('first');
      next.style.transition = 'none';
      next.style.transformOrigin = origin;
      next.style.transform = mode === 'sheet' ? 'translateY(7%)' : mode === 'walk' ? 'scale(1.16)' : 'none';
      next.style.opacity = '0';
      next.style.zIndex = '2';
      void next.offsetWidth;
      next.style.transition =
        mode === 'walk' ? 'opacity .55s ease .3s, transform 1s cubic-bezier(.16,1,.3,1) .3s' : '';
      next.style.opacity = '1';
      next.style.transform = 'none';
      prev.classList.remove('first');
      prev.style.zIndex = '1';
      if (mode === 'walk') {
        prev.style.transition = 'transform .85s cubic-bezier(.55,0,.6,1)';
        prev.style.transformOrigin = origin;
        prev.style.transform = 'scale(1.8)';
      }
      // Sakrivanje prethodnog ekrana ne ide u timers: mora da se desi i kad se korak promeni.
      const h = setTimeout(() => {
        hides.delete(h);
        if (layers.get(cur) === prev) return;
        prev.style.transition = 'none';
        prev.style.opacity = '0';
        prev.style.transform = 'none';
        prev.style.zIndex = '0';
      }, 1300);
      hides.add(h);
    };

    const press = () => {
      tap.classList.remove('go');
      void tap.offsetWidth;
      tap.classList.add('go');
    };

    const run = (n: number) => {
      clear();
      tap.classList.remove('go');
      const active = n >= 1 && n <= N ? n - 1 : -1;
      if (active < 0) {
        pin.classList.remove('aim', 'lbl-on', 'done');
        swap('pocetak');
        return;
      }
      const s = WALK_STEPS[active];
      const w = screen.offsetWidth;
      pin.style.setProperty('--fx', `${(s.cx ?? s.x) * 100}%`);
      pin.style.setProperty('--fy', `${(s.cy ?? s.y) * 100}%`);
      pin.style.setProperty('--dx', `${s.x * 100}%`);
      pin.style.setProperty('--dy', `${s.y * 100}%`);
      pin.style.setProperty('--rw', `${(s.rw ?? 0.2) * w}px`);
      pin.style.setProperty('--rh', `${s.rh ? s.rh * w * 2.1633 : w * 0.2}px`);

      pin.classList.remove('lbl-on', 'done');
      later(60, () => {
        lbl.className = `thw-lbl ${s.side}`;
        lbl.style.setProperty('--lx', String(s.x));
        lbl.style.setProperty('--ly', String(s.y));
        lblText.textContent = s.name;
        void lbl.offsetWidth;
        pin.classList.add('lbl-on');
      });

      swap(s.base);
      pin.classList.add('aim');
      if (s.result === s.base) return;
      later(520, press);
      later(940, () => {
        pin.classList.remove('aim');
        pin.classList.add('done');
        swap(s.result, s.mode, `${s.x * 100}% ${s.y * 100}%`);
      });

      // Jezici: prst redom dodiruje EN, DE, RU, SR i ekran se menja.
      const cycle = s.cycle;
      if (cycle) {
        let k = 1;
        const next = () => {
          const [name, bx] = cycle[k % cycle.length];
          pin.style.setProperty('--dx', `${bx * 100}%`);
          press();
          later(420, () => swap(name));
          k++;
          later(1500, next);
        };
        later(2100, next);
      }
    };

    let last = -1;
    let raf = 0;
    const update = () => {
      raf = 0;
      const total = track.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const p = Math.min(1, Math.max(0, -track.getBoundingClientRect().top / total));
      const n = Math.min(N + 1, Math.floor(p * (N + 2)));
      if (n === last) return;
      last = n;
      setStep(n);
      showPanel(n);
      run(n);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onResize = () => {
      last = -1;
      onScroll();
    };
    // Prvo merenje posle crtanja sa armed (staza tek tada dobija visinu).
    raf = requestAnimationFrame(() => {
      setArmed(true);
      raf = requestAnimationFrame(update);
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      clear();
      hides.forEach(clearTimeout);
      clearTimeout(panelTimer);
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const active = step >= 1 && step <= N ? step - 1 : -1;
  const count = active >= 0 ? `Korak ${active + 1} od ${N}` : step > N ? `Svih ${N} koraka` : `${N} koraka`;

  return (
    <section className={`thw${armed ? ' is-armed' : ''}${step > N ? ' end' : ''}`} id={id} aria-labelledby={`${id}-naslov`}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="thw-head">
        <h2 id={`${id}-naslov`}>{accent(WALK_COPY.title)}</h2>
      </div>

      <ol className="thw-sr">
        {WALK_STEPS.map((s) => (
          <li key={s.name}>
            {s.title.replace(/\*/g, '')}. {s.text}
          </li>
        ))}
      </ol>

      <div
        className="thw-track"
        ref={trackRef}
        style={armed ? { height: `calc(100svh + ${(N + 2) * STEP_SVH}svh)` } : undefined}
      >
        <div className="thw-pin" ref={pinRef} aria-hidden="true">
          <div className="thw-stage">
            <div className="thw-phone">
              <div className="thw-screen">
                {WALK_SCREENS.map((n) => (
                  <div key={n} className={`thw-ly${n === 'pocetak' ? ' first' : ''}`} data-n={n}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- snimci ekrana, unapred smanjeni na 600 px */}
                    <img src={`/hero/tura-koraci/${n}.webp`} width={600} height={1298} alt="" loading="lazy" decoding="async" />
                  </div>
                ))}
                <div className="thw-shade" />
                <div className="thw-tap" />
                <div className="thw-all">
                  {WALK_STEPS.map((s, i) => (
                    <i key={s.name} style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, '--i': i } as CSSProperties} />
                  ))}
                </div>
                <i className="thw-dot" />
              </div>
            </div>
            <div className="thw-lbl r">
              <b />
              <i />
            </div>
          </div>

          <div className="thw-panel">
            <div className="thw-meta">
              <span className="thw-bars">
                {WALK_STEPS.map((s, k) => (
                  <i key={s.name} className={step > N || k < active ? 'done' : k === active ? 'cur' : undefined} />
                ))}
              </span>
              <span>{count}</span>
            </div>
            <div className={`thw-body${out ? ' out' : ''}`}>
              <Panel step={panelStep} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
