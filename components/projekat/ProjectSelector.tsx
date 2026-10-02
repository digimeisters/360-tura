'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { polygonCenter, UNIT_STATUS_COLORS, type Polygon, type UnitStatus } from '../../app/lib/projects';
import {
  floorFrom,
  floorLabel,
  formatArea,
  formatPrice,
  orientationText,
  PROJECT_TEXT,
  statusLabel,
  structureText,
  trackKey,
  type ProjectLang
} from '../../app/lib/projectI18n';
import { trackSiteEvent } from '../../app/lib/track';

/**
 * Izbor stana na javnoj strani projekta (/novogradnja/[slug], engleski na
 * /en/novogradnja/[slug], i ugradnja): fasada -> sprat -> stan -> upit.
 * Isti izgled kao primer na /za-investitore (klase .inv-*,
 * components/projekat/selectorStyles.ts), ali sa pravim podacima.
 *
 * Bez slike fasade ili osnove radi i samo spisak - investitor može da
 * krene sa tabelom stanova pre nego što su oblici iscrtani.
 *
 * Merenje (izveštaj po stanu u adminu): otvaranje strane = cta_click
 * `pv:<slug>`, otvaranje stana = `pu:<slug>:<oznaka>` (vidi trackKey).
 */

export type SelectorFloor = {
  id: string;
  level: number;
  label: string | null;
  polygon: Polygon | null;
  planUrl: string | null;
  /** Link ka turi "pogled sa sprata" (dron), ako postoji i objavljena je. */
  viewHref: string | null;
};

export type SelectorUnit = {
  id: string;
  floorId: string;
  code: string;
  structure: string | null;
  areaSqm: number | null;
  terraceSqm: number | null;
  orientation: string | null;
  price: number | null;
  status: UnitStatus;
  polygon: Polygon | null;
  /** Link ka 360° turi stana, ako postoji i objavljena je. */
  tourHref: string | null;
  tourPreview: string | null;
};

export type SelectorProject = {
  slug: string;
  title: string;
  developer: string | null;
  address: string | null;
  city: string | null;
  moveIn: string | null;
  facadeUrl: string | null;
};

type FormState = { kind: 'idle' | 'sending' | 'ok' | 'error'; text: string };

const PRICE_STEPS = [50_000, 60_000, 70_000, 80_000, 90_000, 100_000, 120_000, 150_000, 200_000, 250_000, 300_000];
const AREA_STEPS = [30, 40, 50, 60, 70, 80, 100, 120];

export default function ProjectSelector({
  project,
  floors,
  units,
  embedded = false,
  lang = 'sr'
}: {
  project: SelectorProject;
  floors: SelectorFloor[];
  units: SelectorUnit[];
  /** Ugrađeno na sajt investitora (/novogradnja/[slug]/ugradnja) - upit to javlja na Telegramu. */
  embedded?: boolean;
  lang?: ProjectLang;
}) {
  const t = PROJECT_TEXT[lang];
  const [floorId, setFloorId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [structure, setStructure] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [minArea, setMinArea] = useState<number | null>(null);
  const [asking, setAsking] = useState(false);
  const [form, setForm] = useState<FormState>({ kind: 'idle', text: '' });
  const panelRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackSiteEvent('cta_click', trackKey('pv', project.slug));
  }, [project.slug]);

  const floorsDesc = useMemo(() => [...floors].sort((a, b) => b.level - a.level), [floors]);
  const structures = useMemo(
    () => [...new Set(units.map((u) => u.structure).filter((s): s is string => Boolean(s)))].sort((a, b) => a.localeCompare(b, 'sr')),
    [units]
  );
  // Ponuđeni pragovi samo u opsegu stvarnih cena i kvadratura, da filter ne nudi prazne izbore.
  const priceOptions = useMemo(() => {
    const prices = units.filter((u) => u.status !== 'sold' && u.price).map((u) => u.price as number);
    if (prices.length < 2) return [];
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    return PRICE_STEPS.filter((p) => p > lo && p < hi);
  }, [units]);
  const areaOptions = useMemo(() => {
    const areas = units.filter((u) => u.areaSqm).map((u) => u.areaSqm as number);
    if (areas.length < 2) return [];
    const lo = Math.min(...areas);
    const hi = Math.max(...areas);
    return AREA_STEPS.filter((a) => a > lo && a < hi);
  }, [units]);

  const matches = (u: SelectorUnit) =>
    (structure === null || u.structure === structure) &&
    (maxPrice === null || (u.price !== null && u.price <= maxPrice && u.status !== 'sold')) &&
    (minArea === null || (u.areaSqm !== null && u.areaSqm >= minArea));
  const anyFilter = structure !== null || maxPrice !== null || minArea !== null;
  const unitsOn = (fid: string) =>
    units.filter((u) => u.floorId === fid).sort((a, b) => a.code.localeCompare(b.code, 'sr', { numeric: true }));
  const freeOn = (fid: string) => units.filter((u) => u.floorId === fid && u.status === 'available' && matches(u)).length;
  const totalFree = units.filter((u) => u.status === 'available').length;
  const minPrice = (fid: string) => {
    const prices = units.filter((u) => u.floorId === fid && u.status !== 'sold' && u.price && matches(u)).map((u) => u.price as number);
    return prices.length ? Math.min(...prices) : null;
  };
  const perSqm = (u: SelectorUnit) => (u.price && u.areaSqm ? Math.round(u.price / u.areaSqm) : null);

  const floor = floors.find((f) => f.id === floorId) ?? null;
  const unit = units.find((u) => u.id === unitId) ?? null;
  const fName = (f: SelectorFloor) => floorLabel(f.level, f.label, lang);
  const status = (s: UnitStatus) => statusLabel(s, lang);

  const scrollToPanel = () => {
    if (window.matchMedia('(max-width: 960px)').matches) {
      requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };
  const pickFloor = (fid: string | null) => {
    setFloorId(fid);
    setUnitId(null);
    setHover(null);
    setAsking(false);
    // Telefon: izbor sprata iz spiska (ispod slike) vraća pogled na osnovu.
    if (window.matchMedia('(max-width: 960px)').matches) {
      requestAnimationFrame(() => {
        const box = stageRef.current?.getBoundingClientRect();
        if (box && box.top < 0) stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };
  const pickUnit = (uid: string | null) => {
    setUnitId(uid);
    setAsking(false);
    setForm({ kind: 'idle', text: '' });
    if (uid) {
      const u = units.find((x) => x.id === uid);
      if (u) trackSiteEvent('cta_click', trackKey('pu', project.slug, u.code));
      scrollToPanel();
    }
  };

  async function sendInquiry(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!unit || !floor) return;
    const fd = new FormData(e.currentTarget);
    setForm({ kind: 'sending', text: t.sending });
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'project',
          embedded,
          unitId: unit.id,
          name: fd.get('name'),
          contact: fd.get('contact'),
          agency: project.title,
          package: `Stan ${unit.code} · ${floorLabel(floor.level, floor.label, 'sr')} · ${statusLabel(unit.status, 'sr')}`,
          message: fd.get('message'),
          lang
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setForm({ kind: 'error', text: lang === 'sr' && json?.error ? json.error : t.failed });
        return;
      }
      trackSiteEvent('form_submit', trackKey('pq', project.slug, unit.code));
      setForm({ kind: 'ok', text: t.sent });
    } catch {
      setForm({ kind: 'error', text: t.offline });
    }
  }

  const selectFilters = (priceOptions.length > 0 || areaOptions.length > 0) && (
    <div className="inv-selects">
      {priceOptions.length > 0 && (
        <label>
          {t.priceTo}
          <select value={maxPrice ?? ''} onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : null)}>
            <option value="">{t.any}</option>
            {priceOptions.map((p) => (
              <option key={p} value={p}>
                {formatPrice(p, lang)}
              </option>
            ))}
          </select>
        </label>
      )}
      {areaOptions.length > 0 && (
        <label>
          {t.areaFrom}
          <select value={minArea ?? ''} onChange={(e) => setMinArea(e.target.value ? Number(e.target.value) : null)}>
            <option value="">{t.any}</option>
            {areaOptions.map((a) => (
              <option key={a} value={a}>
                {formatArea(a, lang)}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );

  const filters = (
    <>
      {structures.length > 1 && (
        <div className="inv-chips" role="group" aria-label={t.structure}>
          <button type="button" className="inv-chip" aria-pressed={structure === null} onClick={() => setStructure(null)}>
            {t.all}
          </button>
          {structures.map((s) => (
            <button key={s} type="button" className="inv-chip" aria-pressed={structure === s} onClick={() => setStructure(s)}>
              {structureText(s, lang)}
            </button>
          ))}
        </div>
      )}
      {selectFilters}
    </>
  );

  // Telefon: spratovi kao red velikih dugmadi odmah uz sliku. Trake spratova
  // na fotografiji zgrade su na uskom ekranu tanke i teško se pogađaju
  // prstom, a spisak u panelu je ispod slike, van ekrana. Na računaru se ne
  // prikazuje (CSS .inv-floorchips) - tamo služe zgrada i spisak pored nje.
  const floorChips = floors.length > 0 && (
    <div className="inv-floorchips" role="group" aria-label={t.floorList}>
      {floorsDesc.map((f) => {
        const free = freeOn(f.id);
        return (
          <button
            key={f.id}
            type="button"
            className={free ? 'inv-fchip' : 'inv-fchip is-none'}
            aria-pressed={f.id === floorId}
            aria-label={`${fName(f)}, ${free ? t.freeLong(free) : t.none}`}
            onClick={() => pickFloor(f.id)}
          >
            <b>{f.level === 0 ? (lang === 'en' ? 'G' : 'P') : f.level}</b>
            <small>{free ? t.freeShort(free) : t.none}</small>
          </button>
        );
      })}
    </div>
  );

  // ---------- leva strana: fasada ili osnova ----------
  let stage;
  if (!floor) {
    const shaped = floors.filter((f) => f.polygon);
    stage = (
      <>
        <div className="inv-stagehd">
          <h3>{t.pickFloor}</h3>
        </div>
        <p className="inv-muted">{project.facadeUrl && shaped.length ? t.pickFloorHint : t.pickFloorList}</p>
        {project.facadeUrl && (
          <div className="inv-art">
            <div className="inv-imgbox">
              {/* eslint-disable-next-line @next/next/no-img-element -- slika fasade sa R2 CDN-a */}
              <img src={project.facadeUrl} alt={project.title} />
              <svg viewBox="0 0 1 1" preserveAspectRatio="none" role="group" aria-label={t.floorList}>
                {shaped.map((f) => {
                  const free = freeOn(f.id);
                  const on = hover === f.id;
                  return (
                    <polygon
                      key={f.id}
                      className="inv-poly"
                      points={f.polygon!.map(([x, y]) => `${x},${y}`).join(' ')}
                      fill={on ? 'rgba(30,90,168,.38)' : free ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,.45)'}
                      stroke={on ? '#1E5AA8' : 'rgba(255,255,255,.7)'}
                      strokeWidth={on ? 2.5 : 1}
                      vectorEffect="non-scaling-stroke"
                      role="button"
                      tabIndex={0}
                      aria-label={`${fName(f)}, ${free ? t.freeLong(free) : t.none}`}
                      onClick={() => pickFloor(f.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          pickFloor(f.id);
                        }
                      }}
                      onMouseEnter={() => setHover(f.id)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(f.id)}
                      onBlur={() => setHover(null)}
                    />
                  );
                })}
              </svg>
              {shaped.map((f) => {
                const free = freeOn(f.id);
                const [, cy] = polygonCenter(f.polygon!);
                const maxX = Math.max(...f.polygon!.map((p) => p[0]));
                return (
                  <span key={`t-${f.id}`} className={free ? 'inv-tag' : 'inv-tag is-none'} style={{ left: `${Math.min(92, maxX * 100)}%`, top: `${cy * 100}%` }}>
                    {f.level === 0 ? (lang === 'en' ? 'G' : 'P') : f.level}
                    <small>{free ? t.freeShort(free) : t.none}</small>
                  </span>
                );
              })}
            </div>
          </div>
        )}
        {floorChips}
      </>
    );
  } else {
    const idx = floorsDesc.findIndex((f) => f.id === floor.id);
    const above = idx > 0 ? floorsDesc[idx - 1] : null;
    const below = idx < floorsDesc.length - 1 ? floorsDesc[idx + 1] : null;
    const shaped = unitsOn(floor.id).filter((u) => u.polygon);
    stage = (
      <>
        <div className="inv-stagehd">
          <button type="button" className="inv-back" onClick={() => pickFloor(null)}>
            {t.building}
          </button>
          <h3>{fName(floor)}</h3>
          <div className="inv-flsw">
            <button type="button" disabled={!below} aria-label={t.floorDown} onClick={() => below && pickFloor(below.id)}>
              ↓
            </button>
            <button type="button" disabled={!above} aria-label={t.floorUp} onClick={() => above && pickFloor(above.id)}>
              ↑
            </button>
          </div>
        </div>
        {floorChips}
        {floor.planUrl ? (
          <div className="inv-art">
            <div className="inv-imgbox" style={{ background: '#FFFFFF' }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- osnova sprata sa R2 CDN-a */}
              <img src={floor.planUrl} alt={fName(floor)} />
              <svg viewBox="0 0 1 1" preserveAspectRatio="none" role="group" aria-label={t.pickUnit}>
                {shaped.map((u) => {
                  const c = UNIT_STATUS_COLORS[u.status];
                  const sel = u.id === unitId;
                  return (
                    <polygon
                      key={u.id}
                      className="inv-poly"
                      points={u.polygon!.map(([x, y]) => `${x},${y}`).join(' ')}
                      fill={c.fill}
                      fillOpacity={matches(u) ? 1 : 0.3}
                      stroke={sel ? '#1E5AA8' : c.stroke}
                      strokeWidth={sel ? 3.5 : 2}
                      vectorEffect="non-scaling-stroke"
                      role="button"
                      tabIndex={0}
                      aria-pressed={sel}
                      aria-label={`${t.unit} ${u.code}, ${status(u.status)}`}
                      onClick={() => pickUnit(u.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          pickUnit(u.id);
                        }
                      }}
                    />
                  );
                })}
              </svg>
              {shaped.map((u) => {
                const [cx, cy] = polygonCenter(u.polygon!);
                return (
                  <span key={`t-${u.id}`} className="inv-tag" style={{ left: `${cx * 100}%`, top: `${cy * 100}%` }}>
                    {u.code}
                  </span>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="inv-muted">{t.pickUnitList}</p>
        )}
        <div className="inv-legend">
          {(['available', 'reserved', 'sold'] as UnitStatus[]).map((s) => (
            <span key={s}>
              <i style={{ background: UNIT_STATUS_COLORS[s].badge, borderColor: UNIT_STATUS_COLORS[s].stroke }} />
              {status(s)}
            </span>
          ))}
        </div>
      </>
    );
  }

  // ---------- desna strana ----------
  let panel;
  if (!floor) {
    panel = (
      <>
        <span className="inv-eyebrow">
          {t.newBuild}
          {project.city ? ` · ${project.city}` : ''}
        </span>
        <div className="inv-title">{project.title}</div>
        {(project.address || project.developer) && (
          <p className="inv-muted">{[project.address, project.developer && `${t.investor}: ${project.developer}`].filter(Boolean).join(' · ')}</p>
        )}
        <div className="inv-stats">
          <div>
            <b>{units.length}</b>
            <small>{t.units}</small>
          </div>
          <div>
            <b className="is-ok">{totalFree}</b>
            <small>{t.free}</small>
          </div>
          <div>
            <b>{project.moveIn || '—'}</b>
            <small>{t.moveIn}</small>
          </div>
        </div>
        {filters}
        <div className="inv-list">
          {floorsDesc.map((f) => {
            const n = freeOn(f.id);
            const from = minPrice(f.id);
            return (
              <button
                key={f.id}
                type="button"
                className={hover === f.id ? 'inv-row is-hover' : 'inv-row'}
                style={anyFilter && !n ? { opacity: 0.5 } : undefined}
                onClick={() => pickFloor(f.id)}
                onMouseEnter={() => setHover(f.id)}
                onMouseLeave={() => setHover(null)}
              >
                <span>
                  <b>{fName(f)}</b>
                  <small>{from ? t.from(formatPrice(from, lang)) : t.unitsCount(unitsOn(f.id).length)}</small>
                </span>
                <span className={n ? 'inv-badge is-s' : 'inv-badge is-p'}>{n ? t.freeLong(n) : t.none}</span>
              </button>
            );
          })}
        </div>
        {anyFilter && !units.some((u) => u.status === 'available' && matches(u)) && <p className="inv-muted">{t.noMatch}</p>}
      </>
    );
  } else if (!unit) {
    panel = (
      <>
        <span className="inv-eyebrow">{fName(floor)}</span>
        <div className="inv-title">{t.pickUnit}</div>
        <p className="inv-muted">{t.pickUnitHint}</p>
        {filters}
        <div className="inv-list">
          {unitsOn(floor.id).map((u) => (
            <button key={u.id} type="button" className="inv-row" style={{ opacity: matches(u) ? 1 : 0.45 }} onClick={() => pickUnit(u.id)}>
              <span>
                <b>
                  {t.unit} {u.code}
                </b>
                <small>
                  {[
                    structureText(u.structure, lang),
                    u.areaSqm ? formatArea(u.areaSqm, lang) : null,
                    u.status === 'sold' ? null : u.price ? formatPrice(u.price, lang) : null
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              </span>
              <span className={`inv-badge is-${u.status === 'available' ? 's' : u.status === 'reserved' ? 'r' : 'p'}`}>{status(u.status)}</span>
            </button>
          ))}
        </div>
        {floor.viewHref && (
          <a className="inv-cta is-out" href={floor.viewHref} target="_blank" rel="noopener noreferrer" style={{ marginTop: 12, textDecoration: 'none' }}>
            {t.viewFrom(floorFrom(floor.level, floor.label, lang))} ↗
          </a>
        )}
      </>
    );
  } else {
    const badge = unit.status === 'available' ? 's' : unit.status === 'reserved' ? 'r' : 'p';
    const sqm = perSqm(unit);
    panel = (
      <>
        <div className="inv-unit-head">
          <span className="inv-eyebrow">
            {fName(floor)}
            {unit.orientation ? ` · ${orientationText(unit.orientation, lang)}` : ''}
          </span>
          <span className={`inv-badge is-${badge}`}>{status(unit.status)}</span>
        </div>
        <div className="inv-title">
          {t.unit} {unit.code}
        </div>
        {unit.structure && <p className="inv-muted">{structureText(unit.structure, lang)}</p>}
        <div className="inv-facts">
          <div>
            <small>{t.area}</small>
            <b>{formatArea(unit.areaSqm, lang)}</b>
          </div>
          <div>
            <small>{t.terrace}</small>
            <b>{formatArea(unit.terraceSqm, lang)}</b>
          </div>
          <div>
            <small>{t.structure}</small>
            <b>{structureText(unit.structure, lang) || '—'}</b>
          </div>
          <div>
            <small>{t.orientation}</small>
            <b>{orientationText(unit.orientation, lang) || '—'}</b>
          </div>
        </div>
        <div className="inv-price">
          <span>
            {unit.status === 'sold' ? t.soldNote : t.price}
            {unit.status !== 'sold' && sqm ? (
              <small style={{ display: 'block', fontSize: '.78rem' }}>
                {formatPrice(sqm, lang)} {t.perSqm}
              </small>
            ) : null}
          </span>
          <b>{unit.status === 'sold' ? '—' : unit.price ? formatPrice(unit.price, lang) : t.onRequest}</b>
        </div>
        {(unit.tourHref || floor.viewHref) && (
          <div className="inv-media" style={!unit.tourHref || !floor.viewHref ? { gridTemplateColumns: '1fr' } : undefined}>
            {unit.tourHref && (
              <a
                className="inv-mbtn"
                href={lang === 'en' ? `${unit.tourHref}?lang=en` : unit.tourHref}
                target="_blank"
                rel="noopener noreferrer"
                style={unit.tourPreview ? { backgroundImage: `url(${unit.tourPreview})` } : undefined}
                data-track="cta:project_unit_tour"
              >
                <em>360°</em>
                <span>{t.walk}</span>
              </a>
            )}
            {floor.viewHref && (
              <a className="inv-mbtn is-drone" href={floor.viewHref} target="_blank" rel="noopener noreferrer" data-track="cta:project_floor_view">
                <em>{lang === 'en' ? 'Drone' : 'Dron'}</em>
                <span>{t.viewFrom(floorFrom(floor.level, floor.label, lang))}</span>
              </a>
            )}
          </div>
        )}

        {unit.status !== 'sold' && !asking && form.kind !== 'ok' && (
          <button type="button" className="inv-cta" onClick={() => setAsking(true)}>
            {unit.status === 'reserved' ? t.notifyMe : t.ask}
          </button>
        )}
        {asking && form.kind !== 'ok' && (
          <form className="inv-form" onSubmit={sendInquiry}>
            <input name="name" type="text" required placeholder={t.name} aria-label={t.name} autoComplete="name" />
            <input name="contact" type="text" required placeholder={t.contact} aria-label={t.contact} autoComplete="tel" />
            <textarea name="message" aria-label={t.message} defaultValue={unit.status === 'reserved' ? t.msgReserved(unit.code) : t.msgDefault(unit.code)} />
            <button type="submit" className="inv-cta" disabled={form.kind === 'sending'}>
              {form.kind === 'sending' ? t.sending : t.send}
            </button>
          </form>
        )}
        {form.text && (
          <p className={form.kind === 'error' ? 'inv-form-msg is-err' : 'inv-form-msg is-ok'} role="status">
            {form.text}
          </p>
        )}
        <button type="button" className="inv-cta is-out" onClick={() => pickUnit(null)}>
          {t.otherUnits}
        </button>
      </>
    );
  }

  return (
    <div className="inv-demo">
      <div className="inv-grid">
        <div className="inv-stage" ref={stageRef}>
          {stage}
        </div>
        <div className="inv-panel" aria-live="polite" ref={panelRef}>
          {panel}
        </div>
      </div>
    </div>
  );
}
