'use client';

import { useState } from 'react';

/**
 * Polje za lozinku (ili tajni kod) sa dugmetom "oko" koje prikazuje i
 * sakriva otkucano - da se vidi greška u kucanju, naročito na telefonu.
 *
 * Prima sve što i obično <input> (value, onChange, placeholder, style...),
 * pa se na postojećim mestima samo zameni naziv elementa. Dugme stoji u
 * desnom delu polja; tekst u polju zato dobija desni razmak da ne ode ispod
 * njega. Boja ikonice prati boju teksta polja (i u tamnoj temi).
 */
export default function PasswordInput({
  style,
  showLabel = 'Prikaži lozinku',
  hideLabel = 'Sakrij lozinku',
  ...inputProps
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  showLabel?: string;
  hideLabel?: string;
}) {
  const [visible, setVisible] = useState(false);
  const label = visible ? hideLabel : showLabel;

  return (
    <div style={{ position: 'relative', width: style?.width ?? '100%' }}>
      <input
        {...inputProps}
        type={visible ? 'text' : 'password'}
        // Pregledač ne sme da nudi ispravku/veliko slovo kad je tekst vidljiv.
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        style={{ ...style, width: '100%', boxSizing: 'border-box', paddingRight: '44px' }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={label}
        aria-pressed={visible}
        title={label}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: style?.color ?? 'inherit',
          opacity: 0.6
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </div>
  );
}
