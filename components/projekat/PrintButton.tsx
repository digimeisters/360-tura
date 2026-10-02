'use client';

/** Dugme za štampu / „Sačuvaj kao PDF" na PDF letku stana (UnitSheet). */
export default function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()}>
      {label}
    </button>
  );
}
