'use client';

import { projectNameAdvice } from '../../app/lib/projects';

/**
 * Napomena ispod polja za naziv projekta: malo početno slovo, fale kvačice
 * (projectNameAdvice) + dugme koje prihvata ispravljen naziv. Koristi se
 * pri pravljenju projekta (gde se od naziva pravi adresa koja se posle ne
 * menja) i u podacima projekta.
 */
export default function NameAdvice({ title, onAccept }: { title: string; onAccept: (fixed: string) => void }) {
  const { warnings, suggestion } = projectNameAdvice(title);
  if (!warnings.length) return null;
  return (
    <div
      role="status"
      style={{
        marginTop: 8,
        padding: '9px 12px',
        borderRadius: 12,
        background: 'color-mix(in srgb, #D99A1E 14%, transparent)',
        border: '1px solid color-mix(in srgb, #D99A1E 45%, transparent)',
        fontSize: 13,
        lineHeight: 1.5,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '6px 12px'
      }}
    >
      <span>⚠️ {warnings.join(' ')}</span>
      {suggestion && (
        <button type="button" className="pa-btn" style={{ minHeight: 30, padding: '4px 12px' }} onClick={() => onAccept(suggestion)}>
          Ispravi u „{suggestion}“
        </button>
      )}
    </div>
  );
}
