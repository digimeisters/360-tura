'use client';

/**
 * Klizač sa dve ručice (raspon) na spisku tura (/ture) - kvadratura i cena.
 *
 * Napravljen od dva obična <input type="range"> jedan preko drugog: jedan
 * pomera donju, drugi gornju granicu. Izvorno HTML polje nema raspon, a
 * gotova biblioteka bi za dva klizača povukla ceo paket u pregledač.
 *
 * Tura kojoj vrednost nije upisana NE nestaje kad se klizač pomeri - vidi
 * TourList: nepoznata cena nije isto što i cena van raspona.
 */

export type RangeFilterProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  /** Izabrane granice; jednake krajnjim vrednostima znače "bez filtera". */
  value: [number, number];
  onChange: (range: [number, number]) => void;
  /** Ispis jedne granice ("58 m²", "450 €"). */
  format: (value: number) => string;
  /** Napomena ispod klizača - npr. koliko tura nema upisan podatak. */
  note?: string;
};

export default function RangeFilter({
  label,
  min,
  max,
  step,
  value,
  onChange,
  format,
  note
}: RangeFilterProps) {
  const [low, high] = value;
  const span = max - min || 1;
  const leftPct = ((low - min) / span) * 100;
  const rightPct = ((high - min) / span) * 100;
  const active = low > min || high < max;

  // Ručice ne smeju da se preskoče - donja staje na gornjoj i obrnuto.
  const setLow = (raw: number) => onChange([Math.min(raw, high), high]);
  const setHigh = (raw: number) => onChange([low, Math.max(raw, low)]);

  return (
    <div className={`range-filter${active ? ' on' : ''}`}>
      <div className="range-head">
        <span className="range-label">{label}</span>
        <span className="range-value">
          {format(low)} – {format(high)}
        </span>
      </div>

      <div className="range-track">
        <div className="range-fill" style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }} />
        <input
          type="range"
          className="range-input range-low"
          min={min}
          max={max}
          step={step}
          value={low}
          aria-label={`${label} — od`}
          onChange={(e) => setLow(Number(e.target.value))}
        />
        <input
          type="range"
          className="range-input range-high"
          min={min}
          max={max}
          step={step}
          value={high}
          aria-label={`${label} — do`}
          onChange={(e) => setHigh(Number(e.target.value))}
        />
      </div>

      {note && <p className="range-note">{note}</p>}
    </div>
  );
}
