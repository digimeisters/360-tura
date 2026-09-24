'use client';

import { useState } from 'react';
import { MODAL_ICONS } from '../app/tour/[slug]/icons';
import { accent } from '../app/lib/accent';
import type { ModulesCopy, TourModuleKey } from '../app/lib/homeCopy';

/**
 * Donji meni ture (Info, Pitanja, Lokacija, Plan, Kontakt) predstavljen kao
 * koristi: levo ista tamna traka kao u turi, desno telefon koji pokazuje
 * izabrani modul, ispod trake šta od toga ima kupac, a šta agent.
 *
 * Telefon je nacrtan, ne snimak ekrana - izgled prati TourModals.tsx, pa ga
 * pri većoj promeni modula treba uskladiti i ovde.
 */
export default function TourModulesShowcase({ copy, photoUrl }: { copy: ModulesCopy; photoUrl: string | null }) {
  const [active, setActive] = useState<TourModuleKey>('about');
  const item = copy.items.find((i) => i.key === active) ?? copy.items[0];
  const p = copy.preview;

  return (
    <div className="mods">
      <style>{STYLES}</style>
      <div className="section-head">
        <span className="eyebrow">{copy.eyebrow}</span>
        <h2>{accent(copy.title)}</h2>
        <p className="note">{copy.note}</p>
      </div>

      <div className="mods-grid">
        <div>
          <div className="mods-bar" role="tablist">
            {copy.items.map((i) => {
              const Icon = MODAL_ICONS[i.key];
              return (
                <button
                  key={i.key}
                  type="button"
                  role="tab"
                  aria-selected={i.key === active}
                  className="mods-tab"
                  onClick={() => setActive(i.key)}
                >
                  <Icon size={22} />
                  {i.tab}
                </button>
              );
            })}
          </div>
          <p className="mods-hint">{copy.hint}</p>

          <div className="mods-pitch" role="tabpanel" aria-live="polite">
            <h3>{item.title}</h3>
            <p>{item.text}</p>
            <div className="mods-who">
              <div>
                <small>{copy.buyerLabel}</small>
                <span>{item.buyer}</span>
              </div>
              <div>
                <small>{copy.youLabel}</small>
                <span>{item.you}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mods-phone" aria-hidden="true">
          <div className="mods-screen" style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}>
            <div className="mods-sheet">
              <div className="mods-sh-h">
                <b>{item.tab}</b>
                <span className="mods-x">×</span>
              </div>

              {active === 'about' && (
                <>
                  <div className="mods-hero">
                    <small>{p.category.toUpperCase()} · {p.place.toUpperCase()}</small>
                    <div className="mods-price">{p.price}</div>
                    <div className="mods-keys">
                      {p.keys.map(([v, l]) => (
                        <div key={l}>
                          {v}
                          <i>{l}</i>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mods-card" style={{ marginTop: 9 }}>
                    {p.rows.map(([l, v, ok]) => (
                      <div key={l} className="mods-row">
                        <span>{l}</span>
                        <b className={ok ? 'ok' : undefined}>{v}</b>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {active === 'faq' && (
                <div className="mods-card">
                  {p.questions.map((q, i) => (
                    <div key={q}>
                      <div className="mods-q">
                        {q}
                        <span>{i === 0 ? '−' : '+'}</span>
                      </div>
                      {i === 0 && <div className="mods-ans">{p.answer}</div>}
                    </div>
                  ))}
                </div>
              )}

              {active === 'location' && (
                <>
                  <div className="mods-card" style={{ overflow: 'hidden' }}>
                    <div className="mods-map">
                      <i />
                    </div>
                    <div className="mods-row" style={{ padding: '11px 12px' }}>
                      <span>{p.addressLabel}</span>
                      <b>{p.address}</b>
                    </div>
                  </div>
                  <div className="mods-btn" style={{ marginTop: 10 }}>↗ {p.openMaps}</div>
                </>
              )}

              {active === 'plan' && (
                <>
                  <p className="mods-plan-h">{p.planHeading}</p>
                  <div className="mods-card" style={{ padding: 8 }}>
                    <svg viewBox="0 0 200 140" width="100%" fill="none" stroke="#2A2B30" strokeWidth="2.2">
                      <rect x="6" y="6" width="188" height="128" />
                      <path d="M110 6v70M6 76h80M104 76h90M140 76v58M60 76v58" />
                      <g fill="#5B92D6" stroke="#fff" strokeWidth="2.5">
                        <circle cx="58" cy="40" r="7" />
                      </g>
                      <g fill="rgba(15,23,42,.55)" stroke="#fff" strokeWidth="2">
                        <circle cx="152" cy="40" r="5.5" />
                        <circle cx="32" cy="106" r="5.5" />
                        <circle cx="100" cy="106" r="5.5" />
                        <circle cx="168" cy="106" r="5.5" />
                      </g>
                    </svg>
                  </div>
                </>
              )}

              {active === 'contact' && (
                <>
                  <div className="mods-agent">
                    <span className="mods-av">MM</span>
                    <div>
                      <b>{p.agent}</b>
                      <div>{p.agency}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 9 }}>
                    <div className="mods-btn">{p.call}</div>
                    <div className="mods-btn out">{p.email}</div>
                  </div>
                  <div className="mods-btn" style={{ marginTop: 9, padding: 13 }}>{p.viewing}</div>
                </>
              )}

              <div className="mods-credit">{p.credit}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const STYLES = `
.mods-grid{display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:clamp(2rem,5vw,4rem); align-items:center;}
.mods-bar{display:grid; grid-template-columns:repeat(5,1fr); gap:4px; background:#12151E; border-radius:22px; padding:6px; max-width:540px;}
.mods-tab{display:flex; flex-direction:column; align-items:center; gap:5px; padding:10px 0 9px; border-radius:16px; border:0; background:none; color:rgba(255,255,255,.72); font:600 12.5px var(--font-inter),Inter,system-ui,sans-serif; cursor:pointer; transition:background .15s,color .15s; min-width:0;}
.mods-tab:hover{color:#fff;}
.mods-tab[aria-selected="true"]{background:rgba(127,176,236,.22); color:#fff;}
.mods-tab:focus-visible{outline:2px solid #5B92D6; outline-offset:2px;}
.mods-hint{font-size:.85rem; color:var(--ink-faint); margin:.7rem .3rem 0;}
.mods-pitch{margin-top:1.6rem; max-width:540px; min-height:15rem;}
.mods-pitch h3{font-size:clamp(1.35rem,2.2vw,1.7rem); letter-spacing:-.02em; margin:0 0 .6rem;}
.mods-pitch p{font-size:1.02rem; line-height:1.6; color:var(--ink-soft); margin:0;}
.mods-who{display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:1.1rem;}
.mods-who div{background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:12px 14px;}
.mods-who small{display:block; font-size:.66rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--accent); margin-bottom:4px;}
.mods-who span{font-size:.9rem; line-height:1.45; color:var(--ink);}

.mods-phone{width:340px; height:680px; border-radius:44px; background:#0E0E10; padding:11px; box-shadow:0 30px 70px -20px rgba(15,23,42,.45); position:relative; justify-self:center;}
.mods-screen{position:absolute; inset:11px; border-radius:34px; overflow:hidden; background:#2A3140 center/cover; color:#111113;}
.mods-screen::before{content:""; position:absolute; inset:0; background:rgba(9,12,20,.5);}
.mods-sheet{position:absolute; left:0; right:0; bottom:0; height:80%; background:linear-gradient(180deg,#E6EEF9 0,#F6F8FC 120px); border-radius:26px 26px 0 0; padding:14px 14px 0; overflow:hidden; font-family:var(--font-inter),Inter,system-ui,sans-serif;}
.mods-sh-h{display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;}
.mods-sh-h b{font-family:var(--font-instrument),Georgia,serif; font-style:italic; font-weight:400; font-size:26px; color:#1E5AA8;}
.mods-x{width:32px; height:32px; border-radius:50%; background:#fff; border:1.5px solid #9DBBE3; color:#1E5AA8; display:flex; align-items:center; justify-content:center;}
.mods-card{background:#fff; border:1.5px solid #9DBBE3; border-radius:16px;}
.mods-hero{border-radius:16px; padding:12px 13px; background:linear-gradient(135deg,#1E5AA8,#2C6FC4); color:#fff;}
.mods-hero small{font-size:9.5px; font-weight:800; letter-spacing:.08em; color:#CFE0F5;}
.mods-price{font-family:var(--font-urbanist),sans-serif; font-weight:800; font-size:25px; margin-top:4px;}
.mods-keys{display:grid; grid-template-columns:repeat(3,1fr); margin-top:9px; padding-top:8px; border-top:1px solid rgba(255,255,255,.22); text-align:center; font-family:var(--font-urbanist),sans-serif; font-weight:800; font-size:15px;}
.mods-keys i{display:block; font-size:9px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#CFE0F5; font-style:normal; margin-top:2px;}
.mods-row{display:flex; justify-content:space-between; gap:8px; padding:8px 12px; border-top:1px solid #EDF1F7; font-size:12.5px;}
.mods-card > .mods-row:first-child{border-top:0;}
.mods-row span{color:#5B5D63;}
.mods-row b{font-family:var(--font-urbanist),sans-serif; font-size:13.5px;}
.mods-row b.ok{color:#1E7A4C;}
.mods-q{padding:10px 12px; border-top:1px solid #EDF1F7; font-size:13px; font-weight:600; display:flex; justify-content:space-between; gap:8px;}
.mods-card > div:first-child .mods-q{border-top:0;}
.mods-q span{color:#1E5AA8;}
.mods-ans{padding:0 12px 10px; font-size:12px; color:#5B5D63; line-height:1.5;}
.mods-map{height:190px; background:#E8ECE6 repeating-linear-gradient(35deg,transparent 0 26px,#fff 26px 34px); position:relative;}
.mods-map i{position:absolute; left:50%; top:44%; width:22px; height:22px; border-radius:50% 50% 50% 0; background:#E0453A; transform:rotate(-45deg);}
.mods-plan-h{margin:0 0 8px; font-family:var(--font-urbanist),sans-serif; font-weight:800; font-size:14px;}
.mods-btn{display:flex; align-items:center; justify-content:center; gap:6px; background:#1E5AA8; color:#fff; border-radius:999px; font-family:var(--font-urbanist),sans-serif; font-weight:700; font-size:13px; padding:11px;}
.mods-btn.out{background:#fff; color:#1E5AA8; border:1.5px solid #1E5AA8;}
.mods-agent{background:#111113; color:#fff; border-radius:16px; padding:12px; display:flex; gap:10px; align-items:center;}
.mods-agent b{font-family:var(--font-urbanist),sans-serif;}
.mods-agent div div{font-size:11.5px; color:#A8A9AE;}
.mods-av{width:40px; height:40px; border-radius:50%; background:#1E5AA8; display:flex; align-items:center; justify-content:center; font-family:var(--font-urbanist),sans-serif; font-weight:800; font-size:14px;}
.mods-credit{position:absolute; left:0; right:0; bottom:12px; text-align:center; font-size:10px; color:#9A9CA1;}

@media (max-width:900px){
  .mods-grid{grid-template-columns:1fr;}
  .mods-pitch{min-height:0;}
  .mods-phone{transform:scale(.86); transform-origin:top center; margin-bottom:-95px;}
}
@media (max-width:480px){
  .mods-who{grid-template-columns:1fr;}
  .mods-tab{font-size:11px;}
}
`;
