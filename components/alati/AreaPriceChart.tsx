'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import type { AreaPrice } from '../../app/lib/valuation/areaPrices';
import type { ValuationListingType, ValuationPropertyType } from '../../app/lib/valuation/types';

/**
 * Grafikon cena po naseljima (/alati/cene-nekretnina-kragujevac): jedna traka
 * po naselju = raspon €/m², poređano od najskupljeg, isprekidana linija =
 * prosek grada. Prekidači vrsta (stan/kuća/lokal) i prodaja/izdavanje;
 * kombinacija sa manje od 2 naselja se ne nudi. Klik na naselje vodi na
 * procenu sa tim naseljem (?naselje=). Tabela svih cena je na serveru
 * (strana), ovo je samo prikaz.
 */

const MIN_ROWS = 2;
const FEW = 10;

const TYPES: { v: ValuationPropertyType; label: string; noun: string; slug: string; size: number }[] = [
  { v: 'apartment', label: 'Stanovi', noun: 'stana', slug: 'stan', size: 55 },
  { v: 'house', label: 'Kuće', noun: 'kuće', slug: 'kuca', size: 120 },
  { v: 'commercial', label: 'Lokali', noun: 'lokala', slug: 'lokal', size: 50 }
];
const KINDS: { v: ValuationListingType; label: string }[] = [
  { v: 'sale', label: 'Prodaja' },
  { v: 'rent', label: 'Izdavanje' }
];

const fmt = (n: number, digits = 0) => n.toLocaleString('sr-RS', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const perSqm = (n: number, rent: boolean) => (rent ? fmt(n, 1) : fmt(Math.round(n / 10) * 10));
const total = (n: number, rent: boolean) => fmt(rent ? Math.round(n) : Math.round(n / 100) * 100);

type Tip = { row: AreaPrice; x: number; y: number };

export default function AreaPriceChart({ rows, valuationHref }: { rows: AreaPrice[]; valuationHref: string }) {
  const available = (t: ValuationPropertyType, k: ValuationListingType) => rows.filter((r) => r.type === t && r.kind === k).length >= MIN_ROWS;
  const [type, setType] = useState<ValuationPropertyType>('apartment');
  const [kind, setKind] = useState<ValuationListingType>('sale');
  const [sizes, setSizes] = useState<Record<ValuationPropertyType, string>>({ apartment: '55', house: '120', commercial: '50' });
  const [tip, setTip] = useState<Tip | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const meta = TYPES.find((t) => t.v === type)!;
  const rent = kind === 'rent';
  const sqm = Math.min(5000, Math.max(0, Number(sizes[type].replace(',', '.')) || 0));

  const view = useMemo(() => {
    const list = rows.filter((r) => r.type === type && r.kind === kind).sort((a, b) => b.low + b.high - (a.low + a.high));
    if (!list.length) return null;
    const unit = rent ? 0.5 : 50;
    const step = rent ? 1 : type === 'house' ? 100 : 200;
    const min = Math.floor(Math.min(...list.map((r) => r.low)) / unit) * unit - unit;
    const max = Math.ceil(Math.max(...list.map((r) => r.high)) / unit) * unit + unit;
    const ticks: number[] = [];
    for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(Number(v.toFixed(1)));
    const w = (r: AreaPrice) => r.listings ?? 1;
    const weight = list.reduce((s, r) => s + w(r), 0);
    const mid = list.reduce((s, r) => s + ((r.low + r.high) / 2) * w(r), 0) / weight;
    return { list, min, max, ticks, mid };
  }, [rows, type, kind, rent]);

  const pct = (v: number) => (view ? ((v - view.min) / (view.max - view.min)) * 100 : 0);

  const pickType = (t: ValuationPropertyType) => {
    setType(t);
    setTip(null);
    if (!available(t, kind)) setKind('sale');
  };

  const href = (r: AreaPrice) => {
    const q = new URLSearchParams({ naselje: r.neighborhood, vrsta: meta.slug });
    if (rent) q.set('tip', 'izdavanje');
    return `${valuationHref}?${q.toString()}`;
  };

  const move = (e: React.MouseEvent, row: AreaPrice) => {
    const box = chartRef.current?.getBoundingClientRect();
    if (!box) return;
    setTip({ row, x: Math.min(e.clientX - box.left + 14, box.width - 290), y: e.clientY - box.top + 14 });
  };

  return (
    <div className="card ap-card">
      <div className="ap-filters">
        <div className="ap-segs">
          <div className="ap-seg" role="group" aria-label="Vrsta nekretnine">
            {TYPES.map((t) => (
              <button key={t.v} type="button" aria-pressed={type === t.v} onClick={() => pickType(t.v)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="ap-seg" role="group" aria-label="Prodaja ili izdavanje">
            {KINDS.map((k) => (
              <button
                key={k.v}
                type="button"
                aria-pressed={kind === k.v}
                disabled={!available(type, k.v)}
                title={available(type, k.v) ? undefined : 'Za ovo još nema dovoljno oglasa'}
                onClick={() => {
                  setKind(k.v);
                  setTip(null);
                }}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>
        <label className="ap-size">
          Veličina
          <input inputMode="numeric" value={sizes[type]} onChange={(e) => setSizes((s) => ({ ...s, [type]: e.target.value }))} aria-label={`Veličina ${meta.noun} u m²`} />
          m²
        </label>
      </div>

      {!view ? (
        <p className="ap-empty">Za ovo još nema dovoljno oglasa.</p>
      ) : (
        <div className="ap-chart" ref={chartRef} onMouseLeave={() => setTip(null)}>
          <div className="ap-axis" aria-hidden="true">
            <span>{rent ? '€ po m² mesečno' : '€ po m²'}</span>
            <div className="ap-ticks">
              {view.ticks.map((t) => (
                <span key={t} style={{ left: `${pct(t)}%` }}>
                  {fmt(t)}
                </span>
              ))}
            </div>
            <span />
          </div>
          <div className="ap-rows">
            <div className="ap-grid" aria-hidden="true">
              {view.ticks.map((t) => (
                <i key={t} style={{ left: `${pct(t)}%` }} />
              ))}
              <span className="ap-city" style={{ left: `${pct(view.mid)}%` }} />
            </div>
            {view.list.map((r) => {
              const few = r.independent !== null && r.independent < FEW;
              return (
                <Link
                  key={r.neighborhood}
                  className="ap-row"
                  href={href(r)}
                  onMouseMove={(e) => move(e, r)}
                  data-track="cta:prices_row"
                  aria-label={`${r.neighborhood}: ${perSqm(r.low, rent)} do ${perSqm(r.high, rent)} € po m²${rent ? ' mesečno' : ''}. Procenite svoju nekretninu u ovom naselju.`}
                >
                  <span className="ap-lab">
                    <b>{r.neighborhood}</b>
                    {r.listings !== null && (
                      <small className={few ? 'is-few' : undefined}>
                        {fmt(r.listings)} oglasa{few ? ' · okvirno' : ''}
                      </small>
                    )}
                  </span>
                  <span className="ap-track" aria-hidden="true">
                    <span className={few ? 'ap-bar is-few' : 'ap-bar'} style={{ left: `${pct(r.low)}%`, width: `${Math.max(1.5, pct(r.high) - pct(r.low))}%` }} />
                  </span>
                  <span className="ap-val">
                    {perSqm(r.low, rent)}–{perSqm(r.high, rent)} €
                    {sqm > 0 && (
                      <small>
                        {fmt(sqm)} m²: {total(r.low * sqm, rent)}–{total(r.high * sqm, rent)} €{rent ? ' mes.' : ''}
                      </small>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
          {tip && (
            <div className="ap-tip" style={{ left: tip.x, top: tip.y }} aria-hidden="true">
              <b>{tip.row.neighborhood}</b> · {meta.noun} {rent ? 'za izdavanje' : 'na prodaju'}
              <br />
              {perSqm(tip.row.low, rent)}–{perSqm(tip.row.high, rent)} € po m²{rent ? ' mesečno' : ''}
              {sqm > 0 && (
                <>
                  <br />
                  {meta.noun[0].toUpperCase() + meta.noun.slice(1)} od {fmt(sqm)} m²:{' '}
                  <b>
                    {total(tip.row.low * sqm, rent)}–{total(tip.row.high * sqm, rent)} €{rent ? ' mesečno' : ''}
                  </b>
                </>
              )}
              {tip.row.listings !== null && (
                <span className="ap-tip-n">
                  {fmt(tip.row.listings)} oglasa{tip.row.independent !== null && tip.row.independent < tip.row.listings ? `, ${fmt(tip.row.independent)} nezavisnih` : ''}
                </span>
              )}
              <span className="ap-tip-go">Procenite svoju nekretninu ovde →</span>
            </div>
          )}
        </div>
      )}

      <div className="ap-legend">
        <span>
          <i className="ap-sw" />
          Raspon cene po m²
        </span>
        <span>
          <i className="ap-sw is-few" />
          Manje od {FEW} nezavisnih oglasa: okvirnije
        </span>
        <span>
          <i className="ap-sw is-city" />
          Prosek grada
        </span>
      </div>
      <p className="ap-note">
        {rent
          ? 'Kirija po m² mesečno, za namešten prostor. Za izdavanje ima manje oglasa, pa je prikazano manje naselja.'
          : 'Procenjena prodajna cena po m², novogradnja i starogradnja zajedno, ispod traženih cena iz oglasa. Naselja bez dovoljno oglasa nisu prikazana.'}
      </p>
    </div>
  );
}
