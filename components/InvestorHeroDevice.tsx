'use client';

import { useEffect, useState } from 'react';
import { Building, FLOORS, LETTERS, TYPES, eur, floorName, priceOf, statusOf, unitId } from './InvestorDemo';

/**
 * Vrh strane /za-investitore: „živa" zgrada u istom okviru kao tura u vrhu
 * /za-agencije (.device + .d-glass iz SITE_STYLES). Spratovi se sami
 * smenjuju, a staklene kartice pokazuju sprat i jedan slobodan stan - kupčev
 * pogled u malom. Isti izmišljeni projekat kao primer ispod.
 *
 * Staje dok je miš na okviru; sa „smanji pokrete" u sistemu stoji na
 * jednom spratu.
 */

const STEP_MS = 2400;

// Spratovi sa bar jednim slobodnim stanom, odozgo nadole - tu ima šta da se pokaže.
const SHOWCASE = Array.from({ length: FLOORS }, (_, i) => FLOORS - 1 - i).filter((f) => LETTERS.some((l) => statusOf(f, l) === 's'));

const COLORS = { s: '#2E9E5B', r: '#D99A1E', p: '#A3A3A3' } as const;

export default function InvestorHeroDevice({ project, freeLabel, unitLabel }: { project: string; freeLabel: string; unitLabel: string }) {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setStep((s) => (s + 1) % SHOWCASE.length), STEP_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const floor = SHOWCASE[step];
  const free = LETTERS.filter((l) => statusOf(floor, l) === 's');
  const unit = free[0];

  return (
    <div
      className="device inv-hero-device"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label={`${project}: izbor stana po spratu`}
    >
      <div className="inv-hero-art">
        <Building highlight={floor} />
      </div>
      <div className="d-top">
        <div className="d-title d-glass">
          <small>Izbor stana</small>
          <strong>{project}</strong>
        </div>
      </div>
      <div className="d-info d-glass inv-hero-info" aria-live="polite">
        <div>
          <h4>
            {floorName(floor)} · {free.length} {freeLabel}
          </h4>
          <div className="inv-hero-units" aria-hidden="true">
            {LETTERS.map((l) => (
              <i key={l} style={{ background: COLORS[statusOf(floor, l)] }}>
                {unitId(floor, l)}
              </i>
            ))}
          </div>
        </div>
        {unit && (
          <div className="inv-hero-price">
            <small>
              {unitLabel} {unitId(floor, unit)} · {TYPES[unit].m2} m²
            </small>
            <b>{eur(priceOf(floor, unit))}</b>
          </div>
        )}
      </div>
    </div>
  );
}
