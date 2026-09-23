'use client';

import { useEffect } from 'react';
import { reportClientError } from './lib/reportError';

/**
 * Poslednja rezerva: greška u samom osnovnom rasporedu (app/layout.tsx).
 * Zamenjuje ceo dokument, pa nosi svoj <html>/<body> i ne dobija ni
 * globalni CSS ni fontove - zato je namerno sasvim jednostavna.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportClientError({ message: error.message, stack: error.stack, digest: error.digest, source: 'boundary' });
  }, [error]);

  return (
    <html lang="sr">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#FAFAF7',
          color: '#111113'
        }}
      >
        <title>Greška | Kvadrat360</title>
        <h1 style={{ margin: 0, fontSize: '24px' }}>Strana se nije učitala</h1>
        <p style={{ margin: 0, color: '#5B5D63' }}>Nešto je pošlo naopako. Pokušajte ponovo.</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '11px 24px',
            fontWeight: 700,
            fontSize: '15px',
            background: '#1E5AA8',
            color: '#fff',
            border: 'none',
            borderRadius: '999px',
            cursor: 'pointer'
          }}
        >
          Učitaj ponovo
        </button>
      </body>
    </html>
  );
}
