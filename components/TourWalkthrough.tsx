'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { accent } from '../app/lib/accent';
import { WALK_SCREENS, WALK_STEPS, WALK_TITLE, type WalkScreen, type WalkStep } from '../app/lib/tourWalkthrough';

/**
 * "Kako radi tura" (podaci i poreklo ekrana: lib/tourWalkthrough.ts). Radi kao
 * Instagram priča (vlasnik, 5. 11. 2026; maketa public/mockup/KakoRadiTuraPrica.html):
 * kad je telefon na ekranu, koraci idu sami - reflektor na mestu dodira, prst,
 * pa ekran koji se tada otvori u pravoj turi. Dodir levo/desno na telefonu,
 * strelice i nazivi koraka vode ručno; pauza dok sekcija nije na ekranu.
 * Skrol ne menja korake (ranija skrol verzija je na telefonu preskakala tačke).
 *
 * Uz smanjene pokrete priča ne kreće sama. Klase za animaciju (aim, lbl-on,
 * done) stoje na .thw-grid, kome React ne menja className, da ih ponovno
 * crtanje ne bi obrisalo.
 */
const N = WALK_STEPS.length;
/** Trajanje koraka u ms (korak može da ima svoje, npr. jezici). */
const DUR = 4200;

const STYLES = `
  .thw{position:relative; overflow-x:clip; padding:clamp(3rem,7vw,5.5rem) 0;}
  .thw-head{max-width:42rem; margin:0 auto clamp(2rem,4vw,3rem); padding:0 1rem; text-align:center;}
  .thw-head h2{font-size:clamp(2rem,4vw,3rem); line-height:1.06; letter-spacing:-0.035em;}

  .thw-grid{--sw:280px; --bz:10px; display:grid; grid-template-columns:minmax(0,540px) minmax(0,420px); justify-content:center; align-items:center;
    gap:clamp(2rem,4vw,4.5rem); padding:0 1.25rem;}

  .thw-stage{--sh:calc(var(--sw) * 2.1633); position:relative; width:100%; height:calc(var(--sh) + var(--bz) * 2);}
  .thw-phone{position:absolute; top:0; left:calc(50% - var(--sw) / 2 - var(--bz)); width:calc(var(--sw) + var(--bz) * 2); height:100%;
    padding:var(--bz); border-radius:calc(var(--bz) * 4.6); background:#0F1014;
    box-shadow:0 2px 0 1px #2A2B31 inset, 0 50px 90px -40px rgba(17,17,19,.6), 0 18px 30px -18px rgba(17,17,19,.35);}
  .thw-screen{position:relative; height:100%; border-radius:calc(var(--bz) * 3.6); overflow:hidden; isolation:isolate; background:#1A1B1F;}
  .thw-ly{position:absolute; inset:0; opacity:0; transition:opacity .5s ease, transform .75s cubic-bezier(.16,1,.3,1);}
  .thw-ly.first{opacity:1;}
  .thw-ly img{display:block; width:100%; height:auto;}

  .thw-zone{position:absolute; top:0; bottom:0; z-index:9; border:0; padding:0; background:none; cursor:pointer; -webkit-tap-highlight-color:transparent;}
  .thw-zone.prev{left:0; width:35%;}
  .thw-zone.next{right:0; width:65%;}
  .thw-zone:focus-visible{outline:2px solid var(--accent); outline-offset:-4px;}

  @property --fx{syntax:'<percentage>'; inherits:true; initial-value:50%;}
  @property --fy{syntax:'<percentage>'; inherits:true; initial-value:50%;}
  @property --rw{syntax:'<length>'; inherits:true; initial-value:40px;}
  @property --rh{syntax:'<length>'; inherits:true; initial-value:40px;}
  .thw-shade{position:absolute; inset:0; z-index:5; pointer-events:none; background:rgba(8,10,14,.6); opacity:0;
    -webkit-mask:radial-gradient(var(--rw) var(--rh) at var(--fx) var(--fy), transparent 0 55%, #000 100%);
            mask:radial-gradient(var(--rw) var(--rh) at var(--fx) var(--fy), transparent 0 55%, #000 100%);
    transition:opacity .45s cubic-bezier(.16,1,.3,1), --fx .7s cubic-bezier(.16,1,.3,1), --fy .7s cubic-bezier(.16,1,.3,1), --rw .7s cubic-bezier(.16,1,.3,1), --rh .7s cubic-bezier(.16,1,.3,1);}
  .thw-grid.aim .thw-shade{opacity:1;}

  .thw-tap{position:absolute; z-index:6; left:var(--dx); top:var(--dy); width:34px; height:34px; margin:-17px 0 0 -17px; border-radius:50%; pointer-events:none;
    background:rgba(255,255,255,.92); box-shadow:0 0 0 2px #1E5AA8, 0 8px 18px -6px rgba(0,0,0,.6); opacity:0; transform:scale(.4);}
  .thw-tap::after{content:""; position:absolute; inset:0; border-radius:50%; border:2px solid #fff; opacity:0;}
  .thw-tap.go{animation:thw-press .75s cubic-bezier(.16,1,.3,1) both;}
  .thw-tap.go::after{animation:thw-wave .75s .28s ease-out both;}
  @keyframes thw-press{0%{opacity:0; transform:scale(1.4);} 30%{opacity:1; transform:scale(1);} 50%{transform:scale(.78);} 80%{opacity:1; transform:scale(.9);} 100%{opacity:0; transform:scale(.9);}}
  @keyframes thw-wave{0%{opacity:.9; transform:scale(1);} 100%{opacity:0; transform:scale(2.8);}}

  .thw-dot{position:absolute; z-index:7; left:var(--dx); top:var(--dy); width:13px; height:13px; margin:-6.5px 0 0 -6.5px; border-radius:50%; background:#1E5AA8;
    box-shadow:0 0 0 2px #fff, 0 6px 14px -4px rgba(0,0,0,.6); transform:scale(0); transition:transform .45s cubic-bezier(.16,1,.3,1), opacity .3s ease;}
  .thw-grid.lbl-on .thw-dot{transform:scale(1);}
  .thw-grid.done .thw-dot{opacity:0;}
  .thw-lbl{position:absolute; z-index:8; top:calc(var(--bz) + var(--ly) * var(--sh)); display:flex; align-items:center; translate:0 -50%; pointer-events:none;}
  .thw-lbl.l{left:0; width:calc(50% - var(--sw) / 2 + var(--lx) * var(--sw) - 8px);}
  .thw-lbl.r{right:0; width:calc(50% + var(--sw) / 2 - var(--lx) * var(--sw) - 8px); flex-direction:row-reverse;}
  .thw-lbl b{flex:none; font-family:var(--font-display); font-weight:800; font-size:1.1rem; letter-spacing:-0.015em; color:var(--accent);
    opacity:0; transform:translateX(-16px); filter:blur(5px); transition:opacity .4s ease, transform .5s cubic-bezier(.16,1,.3,1), filter .4s ease;}
  .thw-lbl.r b{transform:translateX(16px);}
  .thw-lbl i{flex:1; min-width:10px; height:1.5px; margin:0 8px; background:var(--accent); transform:scaleX(0); transform-origin:right;
    transition:transform .45s cubic-bezier(.16,1,.3,1), opacity .3s ease;}
  .thw-lbl.r i{transform-origin:left;}
  .thw-grid.lbl-on .thw-lbl i{transform:scaleX(1); transition-delay:.12s;}
  .thw-grid.lbl-on .thw-lbl b{opacity:1; transform:none; filter:none; transition-delay:.28s;}
  .thw-grid.done .thw-lbl i{opacity:0;}

  .thw-bars{display:flex; gap:4px; margin-bottom:1.1rem;}
  .thw-bars i{position:relative; flex:1; height:3px; border-radius:2px; background:var(--line); overflow:hidden;}
  .thw-bars i::after{content:""; position:absolute; inset:0; background:var(--accent); transform:scaleX(0); transform-origin:left;}
  .thw-bars i.done::after{transform:none;}
  .thw-bars i.cur::after{animation:thw-fill var(--d) linear forwards;}
  .thw.paused .thw-bars i.cur::after{animation-play-state:paused;}
  @keyframes thw-fill{to{transform:none;}}

  .thw-meta{display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:1rem; font-size:.82rem; font-weight:600; color:var(--ink-faint); font-variant-numeric:tabular-nums;}
  .thw-ctrl{display:flex; gap:.4rem;}
  .thw-ctrl button{display:grid; place-items:center; width:36px; height:36px; padding:0; border-radius:50%; border:1px solid var(--line); background:var(--surface); color:var(--ink); cursor:pointer;
    transition:border-color .2s ease;}
  .thw-ctrl button:hover{border-color:var(--accent);}
  .thw-ctrl button:focus-visible{outline:2px solid var(--accent); outline-offset:2px;}
  .thw-ctrl svg{width:16px; height:16px; stroke:currentColor; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;}

  .thw-body{min-height:9.5rem; transition:opacity .25s ease, transform .5s cubic-bezier(.16,1,.3,1), filter .35s ease;}
  .thw-body.out{opacity:0; transform:translateY(12px); filter:blur(4px); transition-duration:.16s;}
  .thw-body h3{font-size:clamp(1.6rem,2.5vw,2.2rem); line-height:1.08;}
  .thw-body p{margin-top:.8rem; color:var(--ink-soft); font-size:1.05rem; line-height:1.6; max-width:36ch;}

  .thw-chips{display:flex; flex-wrap:wrap; gap:.4rem; margin:1.4rem 0 0; padding:0; list-style:none;}
  .thw-chips button{padding:.4rem .78rem; border-radius:999px; border:1px solid var(--line); background:var(--surface); color:var(--ink-soft); font-size:.85rem; font-weight:600; cursor:pointer;
    transition:background-color .2s ease, color .2s ease, border-color .2s ease;}
  .thw-chips button:hover{border-color:var(--accent); color:var(--accent);}
  .thw-chips button[aria-current="step"]{background:var(--accent); border-color:var(--accent); color:#fff;}
  .thw-chips button:focus-visible{outline:2px solid var(--accent); outline-offset:2px;}
  .thw-sr{position:absolute; width:1px; height:1px; margin:-1px; padding:0; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0;}

  @media (max-width:1000px){
    .thw-grid{--sw:240px; --bz:9px; grid-template-columns:calc(var(--sw) + 11rem) minmax(0,21rem); gap:1.5rem;}
    .thw-lbl b{font-size:.95rem;}
  }
  @media (max-width:640px){
    .thw-grid{--sw:210px; --bz:8px; grid-template-columns:minmax(0,1fr); gap:1.4rem; padding:0 1rem;}
    .thw-stage{justify-self:center; width:min(100%, calc(var(--sw) + 10rem));}
    .thw-panel{text-align:center;}
    .thw-body{min-height:7.5rem;}
    .thw-body h3{font-size:1.4rem;}
    .thw-body p{margin:.5rem auto 0; font-size:.95rem;}
    .thw-chips{justify-content:center;}
    .thw-lbl b{font-size:.84rem;}
    .thw-lbl i{margin:0 5px;}
    .thw-tap{width:24px; height:24px; margin:-12px 0 0 -12px;}
  }
  @media (prefers-reduced-motion:reduce){
    .thw-ly, .thw-shade, .thw-dot, .thw-lbl b, .thw-lbl i, .thw-body{transition:none !important;}
    .thw-tap{display:none;}
  }
`;

type Controls = { step: (delta: number) => void; to: (k: number) => void; toggle: () => void };

export default function TourWalkthrough({ id = 'kako-radi-tura' }: { id?: string }) {
  const [cur, setCur] = useState(0);
  const [panel, setPanel] = useState(0);
  const [out, setOut] = useState(false);
  const [started, setStarted] = useState(false);
  const [tick, setTick] = useState(0);
  const [running, setRunning] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const ctrl = useRef<Controls | null>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const screen = grid.querySelector<HTMLElement>('.thw-screen')!;
    const tap = grid.querySelector<HTMLElement>('.thw-tap')!;
    const lbl = grid.querySelector<HTMLElement>('.thw-lbl')!;
    const lblText = lbl.querySelector('b')!;
    const layers = new Map<WalkScreen, HTMLElement>();
    grid.querySelectorAll<HTMLElement>('.thw-ly').forEach((el) => layers.set(el.dataset.n as WalkScreen, el));

    let shown: WalkScreen = 'pocetak';
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

    const swap = (name: WalkScreen, mode: WalkStep['mode'] = 'fade', origin = '50% 50%') => {
      if (shown === name) return;
      const next = layers.get(name)!;
      const prev = layers.get(shown)!;
      shown = name;
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
        if (layers.get(shown) === prev) return;
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

    const animate = (s: WalkStep) => {
      tap.classList.remove('go');
      const w = screen.offsetWidth;
      grid.style.setProperty('--fx', `${(s.cx ?? s.x) * 100}%`);
      grid.style.setProperty('--fy', `${(s.cy ?? s.y) * 100}%`);
      grid.style.setProperty('--dx', `${s.x * 100}%`);
      grid.style.setProperty('--dy', `${s.y * 100}%`);
      grid.style.setProperty('--rw', `${(s.rw ?? 0.2) * w}px`);
      grid.style.setProperty('--rh', `${s.rh ? s.rh * w * 2.1633 : w * 0.2}px`);
      grid.classList.remove('lbl-on', 'done');
      later(60, () => {
        lbl.className = `thw-lbl ${s.side}`;
        lbl.style.setProperty('--lx', String(s.x));
        lbl.style.setProperty('--ly', String(s.y));
        lblText.textContent = s.name;
        void lbl.offsetWidth;
        grid.classList.add('lbl-on');
      });
      swap(s.base);
      grid.classList.add('aim');
      if (s.result === s.base) return;
      later(620, press);
      later(1040, () => {
        grid.classList.remove('aim');
        grid.classList.add('done');
        swap(s.result, s.mode, `${s.x * 100}% ${s.y * 100}%`);
      });
      // Jezici: prst redom dodiruje EN, DE, RU, SR i ekran se menja.
      const cycle = s.cycle;
      if (cycle) {
        let k = 1;
        const next = () => {
          const [name, bx] = cycle[k];
          grid.style.setProperty('--dx', `${bx * 100}%`);
          press();
          later(420, () => swap(name));
          k++;
          if (k < cycle.length) later(1300, next);
        };
        later(2200, next);
      }
    };

    // Tekst u panelu: stari izbledi, pa dođe novi.
    let panelTimer: ReturnType<typeof setTimeout> | undefined;
    const showPanel = (n: number) => {
      setOut(true);
      clearTimeout(panelTimer);
      panelTimer = setTimeout(() => {
        setPanel(n);
        setOut(false);
      }, 170);
    };

    // Tajmer koraka sa pauzom: pamti koliko je ostalo do sledećeg.
    let i = -1;
    let visible = false;
    let paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let stepTimer: ReturnType<typeof setTimeout> | undefined;
    let stepStart = 0;
    let remaining = 0;
    const playing = () => visible && !paused;
    const sync = () => {
      setRunning(playing());
      setUserPaused(paused);
    };
    const schedule = () => {
      clearTimeout(stepTimer);
      if (!playing()) return;
      stepStart = performance.now();
      stepTimer = setTimeout(() => go(i + 1), remaining);
    };
    const stopClock = () => {
      remaining = Math.max(0, remaining - (performance.now() - stepStart));
    };

    const go = (n: number, byUser = false) => {
      clear();
      i = (n + N) % N;
      const s = WALK_STEPS[i];
      remaining = s.dur ?? DUR;
      setCur(i);
      setStarted(true);
      setTick((t) => t + 1);
      showPanel(i);
      animate(s);
      if (byUser) paused = false;
      sync();
      schedule();
    };

    ctrl.current = {
      step: (delta) => go(i + delta, true),
      to: (k) => go(k, true),
      toggle: () => {
        if (playing()) stopClock();
        paused = !paused;
        if (!paused && i < 0) {
          go(0);
          return;
        }
        sync();
        schedule();
      }
    };

    // Kreće kad je telefon bar napola na ekranu; staje kad ode.
    const io = new IntersectionObserver(
      ([e]) => {
        const wasPlaying = playing();
        visible = e.isIntersecting;
        if (visible && i < 0 && !paused) {
          go(0);
          return;
        }
        if (wasPlaying && !visible) stopClock();
        sync();
        schedule();
      },
      { threshold: 0.5 }
    );
    io.observe(grid.querySelector('.thw-stage')!);

    return () => {
      io.disconnect();
      clear();
      hides.forEach(clearTimeout);
      clearTimeout(panelTimer);
      clearTimeout(stepTimer);
      ctrl.current = null;
    };
  }, []);

  const s = WALK_STEPS[panel];
  const dur = WALK_STEPS[cur].dur ?? DUR;

  return (
    <section className={`thw${running ? '' : ' paused'}`} id={id} aria-labelledby={`${id}-naslov`}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="thw-head">
        <h2 id={`${id}-naslov`}>{accent(WALK_TITLE)}</h2>
      </div>

      <ol className="thw-sr">
        {WALK_STEPS.map((w) => (
          <li key={w.name}>
            {w.title.replace(/\*/g, '')}. {w.text}
          </li>
        ))}
      </ol>

      <div className="thw-grid" ref={gridRef}>
        <div className="thw-stage">
          <div className="thw-phone">
            <div className="thw-screen">
              {WALK_SCREENS.map((n) => (
                <div key={n} className={`thw-ly${n === 'pocetak' ? ' first' : ''}`} data-n={n} aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element -- snimci ekrana, unapred smanjeni na 600 px */}
                  <img src={`/hero/tura-koraci/${n}.webp`} width={600} height={1298} alt="" loading="lazy" decoding="async" />
                </div>
              ))}
              <div className="thw-shade" aria-hidden="true" />
              <div className="thw-tap" aria-hidden="true" />
              <i className="thw-dot" aria-hidden="true" />
              <button className="thw-zone prev" type="button" aria-label="Prethodni korak" onClick={() => ctrl.current?.step(-1)} />
              <button className="thw-zone next" type="button" aria-label="Sledeći korak" onClick={() => ctrl.current?.step(1)} />
            </div>
          </div>
          <div className="thw-lbl r" aria-hidden="true">
            <b />
            <i />
          </div>
        </div>

        <div className="thw-panel">
          <div className="thw-bars" aria-hidden="true" style={{ '--d': `${dur}ms` } as CSSProperties}>
            {WALK_STEPS.map((w, k) => (
              <i
                key={k === cur ? `cur-${tick}` : w.name}
                className={k < cur ? 'done' : k === cur && started ? 'cur' : undefined}
              />
            ))}
          </div>
          <div className="thw-meta">
            <span>
              Korak {cur + 1} od {N} · {WALK_STEPS[cur].name}
            </span>
            <span className="thw-ctrl">
              <button type="button" aria-label="Prethodni korak" onClick={() => ctrl.current?.step(-1)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
              </button>
              <button type="button" aria-label={userPaused ? 'Pusti' : 'Pauziraj'} onClick={() => ctrl.current?.toggle()}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={userPaused ? 'M8 5l11 7-11 7z' : 'M9 6v12M15 6v12'} />
                </svg>
              </button>
              <button type="button" aria-label="Sledeći korak" onClick={() => ctrl.current?.step(1)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </span>
          </div>
          <div className={`thw-body${out ? ' out' : ''}`}>
            <h3>{accent(s.title)}</h3>
            <p>{s.text}</p>
          </div>
          <ul className="thw-chips">
            {WALK_STEPS.map((w, k) => (
              <li key={w.name}>
                <button type="button" aria-current={k === cur ? 'step' : undefined} onClick={() => ctrl.current?.to(k)}>
                  {w.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
