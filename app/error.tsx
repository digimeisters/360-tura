'use client';

import { useEffect } from 'react';
import { THEME } from './tour/[slug]/theme';
import { reportClientError } from './lib/reportError';

/**
 * Ekran za grešku za sve strane osim ture (tura ima svoj, tamni -
 * app/tour/[slug]/error.tsx). Umesto belog "Application error" posetilac
 * dobija objašnjenje i put nazad, a vlasnik poruku na Telegram.
 */
export default function SiteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportClientError({ message: error.message, stack: error.stack, digest: error.digest, source: 'boundary' });
  }, [error]);

  return (
    <main
      style={{
        minHeight: '70dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '24px',
        textAlign: 'center',
        background: THEME.bg,
        color: THEME.textPrimary,
        fontFamily: THEME.fontBody
      }}
    >
      <h1 style={{ margin: 0, fontFamily: THEME.fontDisplay, fontSize: '24px' }}>Strana se nije učitala</h1>
      <p style={{ margin: 0, maxWidth: '380px', color: THEME.textSecondary, lineHeight: 1.5 }}>
        Nešto je pošlo naopako. Pokušajte ponovo, a ako se ponovi, pozovite nas.
      </p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '6px' }}>
        <button
          onClick={() => retry()}
          style={{
            padding: '11px 24px',
            fontWeight: 700,
            fontSize: '15px',
            background: THEME.accent,
            color: '#fff',
            border: 'none',
            borderRadius: '999px',
            cursor: 'pointer'
          }}
        >
          Pokušaj ponovo
        </button>
        <a
          href="/"
          style={{
            padding: '11px 24px',
            fontWeight: 700,
            fontSize: '15px',
            color: THEME.textPrimary,
            border: `1px solid ${THEME.borderStrong}`,
            borderRadius: '999px',
            textDecoration: 'none'
          }}
        >
          Početna strana
        </a>
      </div>
    </main>
  );
}
