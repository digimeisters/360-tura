'use client';

import { useRef, useState, type ReactNode } from 'react';

/**
 * Klikabilan primer izbora stana za stranu /za-investitore: zgrada -> sprat
 * -> stan, plus tab sa gradilištem po mesecima. Projekat, cene i statusi su
 * izmišljeni (strana to kaže iznad primera); prava verzija bi čitala
 * projekat, spratove i stanove iz baze.
 *
 * Nastao iz mockupa public/mockup/Novogradnja.html. Stilovi su u
 * INVESTOR_STYLES na strani (klase .inv-*), a kartica je uvek svetla - kao
 * izveštaj na /za-agencije - jer su boje statusa (zeleno/žuto/sivo) birane
 * za svetlu pozadinu.
 */

type Letter = 'A' | 'B' | 'C' | 'D';
type Status = 's' | 'r' | 'p';

const FLOORS = 7; // prizemlje + 6 spratova
const LETTERS: Letter[] = ['A', 'B', 'C', 'D'];

const TYPES: Record<Letter, { m2: number; rooms: string; n: number; orient: string; terrace: string }> = {
  A: { m2: 54, rooms: 'Dvosoban', n: 2, orient: 'Jug–istok', terrace: '6 m²' },
  B: { m2: 72, rooms: 'Trosoban', n: 3, orient: 'Jug–zapad', terrace: '9 m²' },
  C: { m2: 38, rooms: 'Jednosoban', n: 1, orient: 'Sever', terrace: '4 m²' },
  D: { m2: 96, rooms: 'Četvorosoban', n: 4, orient: 'Jug', terrace: '18 m²' }
};

// Status po spratu, redom A B C D: s = slobodan, r = rezervisan, p = prodat.
const STATUS: string[] = ['pspp', 'pprp', 'psrs', 'srsp', 'ssrs', 'sssr', 'ssss'];
const ST_LABEL: Record<Status, string> = { s: 'Slobodan', r: 'Rezervisan', p: 'Prodat' };
const ST_COLORS: Record<Status, { fill: string; stroke: string; text: string }> = {
  s: { fill: '#DCF3E4', stroke: '#2E9E5B', text: '#1F7A45' },
  r: { fill: '#FCEFD3', stroke: '#D99A1E', text: '#9A6A0B' },
  p: { fill: '#EFEFEF', stroke: '#BDBDBD', text: '#8A8A8A' }
};

const MONTHS = ['Jun', 'Jul', 'Avg', 'Sep', 'Okt'];
const BUILT_BY_MONTH = [1, 2, 3, 4, 5];

const floorName = (f: number) => (f === 0 ? 'Prizemlje' : `${f}. sprat`);
const floorGen = (f: number) => (f === 0 ? 'prizemlja' : `${f}. sprata`);
const unitId = (f: number, l: Letter) => `${f === 0 ? 'P' : f}${l}`;
const statusOf = (f: number, l: Letter) => STATUS[f][LETTERS.indexOf(l)] as Status;
const priceOf = (f: number, l: Letter) => Math.round((TYPES[l].m2 * (1650 + 40 * f)) / 100) * 100;
const eur = (n: number) => `${n.toLocaleString('sr-RS')} €`;

const FLOOR_H = 56;
const BASE_Y = 492;
const X0 = 70;
const W = 250;

// Deli ih i vrh strane /za-investitore (InvestorHeroDevice), da „živa"
// zgrada u vrhu i primer ispod pokazuju isti izmišljeni projekat.
export { FLOORS, LETTERS, TYPES, statusOf, priceOf, eur, floorName, unitId };

export function Building({
  built = FLOORS,
  freeOn,
  hover,
  onHover,
  onPick,
  highlight = null
}: {
  built?: number;
  freeOn?: (f: number) => number;
  hover?: number | null;
  onHover?: (f: number | null) => void;
  onPick?: (f: number) => void;
  /** Samo za prikaz (bez klika): sprat istaknut plavo, npr. u vrhu strane. */
  highlight?: number | null;
}) {
  const interactive = Boolean(onPick && freeOn);
  const floors = Array.from({ length: FLOORS }, (_, i) => i);
  const craneTop = BASE_Y - FLOORS * FLOOR_H - 40;

  return (
    <svg viewBox="0 0 440 540" className="inv-svg" role={interactive ? 'group' : 'img'} aria-label={interactive ? 'Zgrada - izaberite sprat' : 'Zgrada u izgradnji'}>
      <defs>
        <linearGradient id="inv-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#DCE8F7" />
          <stop offset="1" stopColor="#F6F8FC" />
        </linearGradient>
        <linearGradient id="inv-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9FBCE0" />
          <stop offset="1" stopColor="#5E83B3" />
        </linearGradient>
        <pattern id="inv-scaf" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 14 L14 0" stroke="#C9A35A" strokeWidth="1.4" />
        </pattern>
      </defs>
      <rect width="440" height="540" rx="18" fill="url(#inv-sky)" />
      <rect x="0" y="492" width="440" height="48" fill="#B9C7B3" />
      <circle cx="40" cy="470" r="22" fill="#8DB48A" />
      <rect x="37" y="480" width="6" height="14" fill="#7A5C3E" />
      <circle cx="355" cy="474" r="18" fill="#9CC198" />
      <rect x="352" y="482" width="6" height="12" fill="#7A5C3E" />

      {floors.map((i) => {
        const y = BASE_Y - (i + 1) * FLOOR_H;
        if (i < built) {
          return (
            <g key={i}>
              <rect x={X0} y={y} width={W} height={FLOOR_H} fill={i === 0 ? '#E9E4DA' : '#F4F1EA'} stroke="#D8D1C2" />
              {[0, 1, 2, 3, 4].map((k) => {
                const wx = X0 + 14 + k * 47;
                return (
                  <g key={k}>
                    <rect x={wx} y={y + 12} width="34" height={i === 0 ? 40 : 32} rx="2" fill="url(#inv-glass)" />
                    {i > 0 && (k === 1 || k === 3) && (
                      <>
                        <rect x={wx - 5} y={y + 40} width="44" height="5" fill="#8D8678" />
                        <rect x={wx - 5} y={y + 32} width="44" height="1.6" fill="#8D8678" />
                      </>
                    )}
                  </g>
                );
              })}
            </g>
          );
        }
        return i === built ? (
          <rect key={i} x={X0} y={y} width={W} height={FLOOR_H} fill="url(#inv-scaf)" stroke="#C9A35A" strokeDasharray="5 4" />
        ) : (
          <rect key={i} x={X0} y={y} width={W} height={FLOOR_H} fill="none" stroke="#B6C3D6" strokeDasharray="4 5" />
        );
      })}

      {!interactive && highlight !== null && highlight < built && (
        <rect
          className="inv-hl"
          x={X0 - 4}
          y={BASE_Y - (highlight + 1) * FLOOR_H}
          width={W + 8}
          height={FLOOR_H}
          rx="4"
          fill="rgba(30,90,168,.30)"
          stroke="#1E5AA8"
          strokeWidth="3"
        />
      )}
      {built >= FLOORS ? (
        <rect x={X0 - 8} y={BASE_Y - FLOORS * FLOOR_H - 10} width={W + 16} height="10" rx="2" fill="#6F6A60" />
      ) : (
        <g>
          <rect x="352" y={craneTop} width="8" height={BASE_Y - craneTop} fill="#E0A526" />
          <rect x="250" y={craneTop} width="170" height="7" fill="#E0A526" />
          <line x1="285" y1={craneTop + 7} x2="285" y2={craneTop + 70} stroke="#555" strokeWidth="1.5" />
          <rect x="278" y={craneTop + 70} width="14" height="9" fill="#555" />
        </g>
      )}

      {interactive &&
        floors.map((i) => {
          const y = BASE_Y - (i + 1) * FLOOR_H;
          const free = freeOn!(i);
          const tagW = i === 0 ? 96 : 84;
          const pick = () => onPick!(i);
          return (
            <g
              key={`hit-${i}`}
              className="inv-hit"
              role="button"
              tabIndex={0}
              aria-label={`${floorName(i)}, ${free ? `${free} slobodno` : 'nema slobodnih'}`}
              onClick={pick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  pick();
                }
              }}
              onMouseEnter={() => onHover?.(i)}
              onMouseLeave={() => onHover?.(null)}
              onFocus={() => onHover?.(i)}
              onBlur={() => onHover?.(null)}
            >
              <rect
                x={X0}
                y={y}
                width={W}
                height={FLOOR_H}
                fill={hover === i ? 'rgba(30,90,168,.26)' : free ? 'transparent' : 'rgba(255,255,255,.5)'}
              />
              <g transform={`translate(${X0 + W + 12},${y + FLOOR_H / 2 - 13})`}>
                <rect width={tagW} height="26" rx="13" fill={free ? '#FFFFFF' : '#F1F1EF'} stroke={hover === i ? '#1E5AA8' : free ? '#9DBBE3' : '#DADADA'} />
                <text x="12" y="17.5" fontWeight="800" fontSize="12" fill={free ? '#1E5AA8' : '#9A9A9A'}>
                  {i === 0 ? 'P' : i}
                </text>
                <text x={i === 0 ? 26 : 24} y="17.5" fontWeight="600" fontSize="11.5" fill={free ? '#1F7A45' : '#9A9A9A'}>
                  {free ? `${free} slob.` : 'nema'}
                </text>
              </g>
            </g>
          );
        })}
    </svg>
  );
}

const UNIT_BOX: Record<Letter, { x: number; y: number; w: number; h: number }> = {
  A: { x: 20, y: 20, w: 200, h: 150 },
  B: { x: 220, y: 20, w: 220, h: 150 },
  C: { x: 20, y: 210, w: 170, h: 150 },
  D: { x: 190, y: 210, w: 250, h: 150 }
};

function FloorPlan({
  floor,
  selected,
  matches,
  onPick
}: {
  floor: number;
  selected: Letter | null;
  matches: (l: Letter) => boolean;
  onPick: (l: Letter) => void;
}) {
  return (
    <svg viewBox="0 0 520 400" className="inv-svg" role="group" aria-label={`Osnova: ${floorName(floor)}`}>
      <defs>
        <pattern id="inv-hatch" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M0 10 L10 0" stroke="#D4D4D4" strokeWidth="1.2" />
        </pattern>
      </defs>
      <rect x="20" y="170" width="420" height="40" fill="#F3F4F6" />
      <text x="230" y="195" textAnchor="middle" fontSize="11" fontWeight="700" fill="#9CA3AF" letterSpacing="1.5">
        HODNIK · LIFT · STEPENIŠTE
      </text>
      <g transform="translate(482,52)">
        <circle r="22" fill="#FFFFFF" stroke="#D5DEEB" />
        <path d="M0 -14 L6 4 L0 0 L-6 4 Z" fill="#1E5AA8" />
        <text y="16" textAnchor="middle" fontSize="10" fontWeight="800" fill="#1E5AA8">
          S
        </text>
      </g>
      {LETTERS.map((l) => {
        const u = UNIT_BOX[l];
        const st = statusOf(floor, l);
        const c = ST_COLORS[st];
        const t = TYPES[l];
        const isSel = selected === l;
        return (
          <g
            key={l}
            className="inv-unit"
            role="button"
            tabIndex={0}
            aria-label={`Stan ${unitId(floor, l)}, ${t.rooms}, ${t.m2} m², ${ST_LABEL[st]}`}
            aria-pressed={isSel}
            opacity={matches(l) ? 1 : 0.35}
            onClick={() => onPick(l)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPick(l);
              }
            }}
          >
            <rect x={u.x} y={u.y} width={u.w} height={u.h} fill={c.fill} stroke={isSel ? '#1E5AA8' : c.stroke} strokeWidth={isSel ? 4 : 2.5} />
            {st === 'p' && <rect x={u.x} y={u.y} width={u.w} height={u.h} fill="url(#inv-hatch)" />}
            <text x={u.x + 16} y={u.y + 34} fontWeight="800" fontSize="24" fill="#111113">
              {unitId(floor, l)}
            </text>
            <text x={u.x + 16} y={u.y + 56} fontSize="13" fill="#374151">
              {t.rooms} · {t.m2} m²
            </text>
            <text x={u.x + 16} y={u.y + u.h - 18} fontSize="12.5" fontWeight="700" fill={c.text}>
              {ST_LABEL[st]}
              {st === 's' ? ` · ${eur(priceOf(floor, l))}` : ''}
            </text>
          </g>
        );
      })}
      <rect x="190" y="360" width="250" height="26" fill="none" stroke="#B6C3D6" strokeDasharray="4 4" />
      <text x="315" y="378" textAnchor="middle" fontSize="10.5" fill="#8C96A6">
        terasa stana D
      </text>
    </svg>
  );
}

const ROOM_FILTERS: { value: number | null; label: string }[] = [
  { value: null, label: 'Svi' },
  { value: 1, label: '1 soba' },
  { value: 2, label: '2 sobe' },
  { value: 3, label: '3 sobe' },
  { value: 4, label: '4 sobe' }
];

export default function InvestorDemo({ tourUrl, tourPreview }: { tourUrl: string | null; tourPreview: string | null }) {
  const [tab, setTab] = useState<'izbor' | 'gradiliste'>('izbor');
  const [floor, setFloor] = useState<number | null>(null);
  const [unit, setUnit] = useState<Letter | null>(null);
  const [rooms, setRooms] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [month, setMonth] = useState(MONTHS.length - 1);
  const [droneNote, setDroneNote] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const matches = (l: Letter) => rooms === null || TYPES[l].n === rooms;
  const freeOn = (f: number) => LETTERS.filter((l) => statusOf(f, l) === 's' && matches(l)).length;
  const totalFree = Array.from({ length: FLOORS }, (_, f) => LETTERS.filter((l) => statusOf(f, l) === 's').length).reduce((a, b) => a + b, 0);
  const floorsDesc = Array.from({ length: FLOORS }, (_, i) => FLOORS - 1 - i);

  const pickFloor = (f: number | null) => {
    setFloor(f);
    setUnit(null);
    setHover(null);
    setDroneNote(false);
  };
  const pickUnit = (l: Letter | null) => {
    setUnit(l);
    // Na uskom ekranu kartica stana je ispod osnove - spusti posetioca do
    // nje, inače klik na stan izgleda kao da ništa nije uradio.
    if (l && window.matchMedia('(max-width: 960px)').matches) {
      requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
    setDroneNote(false);
  };

  const filters = (
    <div className="inv-chips" role="group" aria-label="Struktura">
      {ROOM_FILTERS.map((o) => (
        <button key={o.label} type="button" className="inv-chip" aria-pressed={rooms === o.value} onClick={() => setRooms(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );

  let stage: ReactNode;
  let panel: ReactNode;

  if (tab === 'gradiliste') {
    const built = BUILT_BY_MONTH[month];
    stage = (
      <>
        <div className="inv-stagehd">
          <h3>Gradilište po mesecima</h3>
        </div>
        <p className="inv-muted">Svakog meseca novi 360° snimak gradilišta i pogled dronom.</p>
        <div className="inv-art">
          <Building built={built} />
        </div>
      </>
    );
    panel = (
      <>
        <span className="inv-eyebrow">Napredak radova</span>
        <div className="inv-title">{MONTHS[month]} 2026</div>
        <div className="inv-chips" role="group" aria-label="Mesec">
          {MONTHS.map((m, i) => (
            <button key={m} type="button" className="inv-chip" aria-pressed={i === month} onClick={() => setMonth(i)}>
              {m}
            </button>
          ))}
        </div>
        <div className="inv-progress-head">
          <span>Konstrukcija</span>
          <span>
            {built}/{FLOORS} etaža
          </span>
        </div>
        <div className="inv-progress">
          <i style={{ width: `${Math.round((built / FLOORS) * 100)}%` }} />
        </div>
        <p className="inv-muted">Useljenje po planu: jun 2027.</p>
        <div className="inv-row is-static">
          <span>
            <b>Obaveštenje kupcima</b>
            <small>Kupci koji su dali kaparu dobijaju link na novi snimak svakog meseca.</small>
          </span>
        </div>
      </>
    );
  } else if (floor === null) {
    stage = (
      <>
        <div className="inv-stagehd">
          <h3>Izaberite sprat</h3>
        </div>
        <p className="inv-muted">Kliknite na sprat na zgradi ili u spisku.</p>
        <div className="inv-art">
          <Building freeOn={freeOn} hover={hover} onHover={setHover} onPick={pickFloor} />
        </div>
      </>
    );
    panel = (
      <>
        <span className="inv-eyebrow">Novogradnja · Kragujevac</span>
        <div className="inv-title">Rezidencija Lipa</div>
        <p className="inv-muted">7 etaža · lift · garaža</p>
        <div className="inv-stats">
          <div>
            <b>28</b>
            <small>stanova</small>
          </div>
          <div>
            <b className="is-ok">{totalFree}</b>
            <small>slobodnih</small>
          </div>
          <div>
            <b>06/27</b>
            <small>useljenje</small>
          </div>
        </div>
        {filters}
        <div className="inv-list">
          {floorsDesc.map((f) => {
            const n = freeOn(f);
            return (
              <button
                key={f}
                type="button"
                className={hover === f ? 'inv-row is-hover' : 'inv-row'}
                onClick={() => pickFloor(f)}
                onMouseEnter={() => setHover(f)}
                onMouseLeave={() => setHover(null)}
              >
                <span>
                  <b>{floorName(f)}</b>
                  <small>od {eur(Math.min(...LETTERS.map((l) => priceOf(f, l))))}</small>
                </span>
                <span className={n ? 'inv-badge is-s' : 'inv-badge is-p'}>{n ? `${n} slobodno` : 'nema'}</span>
              </button>
            );
          })}
        </div>
      </>
    );
  } else {
    stage = (
      <>
        <div className="inv-stagehd">
          <button type="button" className="inv-back" onClick={() => pickFloor(null)}>
            ← Zgrada
          </button>
          <h3>{floorName(floor)}</h3>
          <div className="inv-flsw">
            <button type="button" disabled={floor === 0} aria-label="Sprat niže" onClick={() => pickFloor(floor - 1)}>
              ↓
            </button>
            <button type="button" disabled={floor === FLOORS - 1} aria-label="Sprat više" onClick={() => pickFloor(floor + 1)}>
              ↑
            </button>
          </div>
        </div>
        <div className="inv-art">
          <FloorPlan floor={floor} selected={unit} matches={matches} onPick={pickUnit} />
        </div>
        <div className="inv-legend">
          {(['s', 'r', 'p'] as Status[]).map((s) => (
            <span key={s}>
              <i style={{ background: ST_COLORS[s].fill, borderColor: ST_COLORS[s].stroke }} />
              {ST_LABEL[s]}
            </span>
          ))}
        </div>
      </>
    );

    if (unit === null) {
      panel = (
        <>
          <span className="inv-eyebrow">{floorName(floor)}</span>
          <div className="inv-title">Izaberite stan</div>
          <p className="inv-muted">Kliknite na stan u osnovi ili u spisku.</p>
          {filters}
          <div className="inv-list">
            {LETTERS.map((l) => {
              const st = statusOf(floor, l);
              const t = TYPES[l];
              return (
                <button key={l} type="button" className="inv-row" style={{ opacity: matches(l) ? 1 : 0.45 }} onClick={() => pickUnit(l)}>
                  <span>
                    <b>Stan {unitId(floor, l)}</b>
                    <small>
                      {t.rooms} · {t.m2} m² · {st === 'p' ? '—' : eur(priceOf(floor, l))}
                    </small>
                  </span>
                  <span className={`inv-badge is-${st}`}>{ST_LABEL[st]}</span>
                </button>
              );
            })}
          </div>
        </>
      );
    } else {
      const t = TYPES[unit];
      const st = statusOf(floor, unit);
      panel = (
        <>
          <div className="inv-unit-head">
            <span className="inv-eyebrow">
              {floorName(floor)} · {t.orient}
            </span>
            <span className={`inv-badge is-${st}`}>{ST_LABEL[st]}</span>
          </div>
          <div className="inv-title">Stan {unitId(floor, unit)}</div>
          <p className="inv-muted">{t.rooms} stan sa terasom</p>
          <div className="inv-facts">
            <div>
              <small>Površina</small>
              <b>{t.m2} m²</b>
            </div>
            <div>
              <small>Terasa</small>
              <b>{t.terrace}</b>
            </div>
            <div>
              <small>Struktura</small>
              <b>{t.rooms}</b>
            </div>
            <div>
              <small>Orijentacija</small>
              <b>{t.orient}</b>
            </div>
          </div>
          <div className="inv-price">
            <span>{st === 'p' ? 'Stan je prodat' : 'Cena sa PDV-om'}</span>
            <b>{st === 'p' ? '—' : eur(priceOf(floor, unit))}</b>
          </div>
          <div className="inv-media">
            {tourUrl ? (
              <a
                className="inv-mbtn"
                href={tourUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={tourPreview ? { backgroundImage: `url(${tourPreview})` } : undefined}
                data-track="cta:investor_demo_tour"
              >
                <em>360°</em>
                <span>Prošetajte kroz stan</span>
              </a>
            ) : null}
            <button type="button" className="inv-mbtn is-drone" aria-expanded={droneNote} onClick={() => setDroneNote((v) => !v)}>
              <em>Dron</em>
              <span>Pogled sa {floorGen(floor)}</span>
            </button>
          </div>
          {droneNote && (
            <p className="inv-note-box">
              Za vaš projekat ovde stoji 360° snimak dronom, napravljen baš na visini {floorGen(floor)}, pa kupac vidi tačan pogled sa
              terase.
            </p>
          )}
          <button type="button" className="inv-cta" disabled={st === 'p'} onClick={() => document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' })}>
            {st === 'r' ? 'Javite mi ako se oslobodi' : st === 'p' ? 'Stan je prodat' : 'Raspitaj se za ovaj stan'}
          </button>
          <button type="button" className="inv-cta is-out" onClick={() => pickUnit(null)}>
            ← Ostali stanovi na spratu
          </button>
          <p className="inv-small">Upit stiže prodaji sa tačnom oznakom stana.</p>
        </>
      );
    }
  }

  return (
    <div className="inv-demo">
      <div className="inv-tabs" role="tablist" aria-label="Primer">
        <button type="button" role="tab" aria-selected={tab === 'izbor'} onClick={() => setTab('izbor')}>
          Izbor stana
        </button>
        <button type="button" role="tab" aria-selected={tab === 'gradiliste'} onClick={() => setTab('gradiliste')}>
          Gradilište
        </button>
      </div>
      <div className="inv-grid">
        <div className="inv-stage">{stage}</div>
        <div className="inv-panel" aria-live="polite" ref={panelRef}>
          {panel}
        </div>
      </div>
    </div>
  );
}
