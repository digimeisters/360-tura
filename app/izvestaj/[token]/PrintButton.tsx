'use client';

/** "Sačuvaj kao PDF" - pregledačev dijalog za štampu nudi i čuvanje u PDF. */
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="rep-btn" onClick={() => window.print()}>
      {label}
    </button>
  );
}
