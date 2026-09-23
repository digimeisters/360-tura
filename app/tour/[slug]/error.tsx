'use client';

import { useEffect } from 'react';
import { THEME } from './theme';
import { Logo } from './Logo';
import { reportClientError } from '../../lib/reportError';

/**
 * Ekran kad se tura sruši pri crtanju. Bez njega posetilac vidi beli ekran
 * sa engleskom porukom "Application error" - i samo zatvori stranu.
 *
 * Glavno dugme ponovo učitava celu stranu (a ne samo `retry`): kvar u turi
 * je obično vezan za stanje prikazivača panorama, koje ponovno crtanje
 * iste komponente ne čisti. Greška se prijavljuje vlasniku (reportError).
 */
export default function TourError({ error }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportClientError({ message: error.message, stack: error.stack, digest: error.digest, source: 'boundary' });
  }, [error]);

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '14px',
        padding: '24px',
        textAlign: 'center',
        background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)',
        color: '#fff',
        fontFamily: THEME.fontBody,
        ['--ink' as string]: '#fff',
        ['--accent' as string]: '#5B92D6'
      }}
    >
      <Logo />
      <h1 style={{ margin: '10px 0 0', fontFamily: THEME.fontDisplay, fontSize: '24px', lineHeight: 1.25 }}>
        Tura se nije učitala
      </h1>
      <p style={{ margin: 0, maxWidth: '360px', fontSize: '15px', lineHeight: 1.5, color: 'rgba(255, 255, 255, 0.8)' }}>
        Nešto je pošlo naopako. Pokušajte ponovo — obično pomogne.
        <br />
        <span style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.6)' }}>
          Something went wrong while loading the tour. Please try again.
        </span>
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: '6px',
          padding: '12px 28px',
          fontSize: '15px',
          fontWeight: 700,
          background: THEME.accent,
          color: '#fff',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          borderRadius: '999px',
          cursor: 'pointer'
        }}
      >
        Učitaj ponovo
      </button>
      <a href="/ture" style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.75)' }}>
        Pogledajte druge ture
      </a>
    </main>
  );
}
