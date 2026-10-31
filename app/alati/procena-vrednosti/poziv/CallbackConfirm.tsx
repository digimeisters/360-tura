'use client';

import { useState } from 'react';

/** Dugme na strani /alati/procena-vrednosti/poziv: isti zahtev kao dugme ispod procene. */
export default function CallbackConfirm({ leadId, token }: { leadId: string; token: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const send = async () => {
    setState('sending');
    try {
      const res = await fetch('/api/valuation/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, token })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setError(json?.error || 'Zahtev nije prošao. Pokušajte ponovo.');
        setState('error');
        return;
      }
      setState('done');
    } catch {
      setError('Nema veze sa serverom. Pokušajte ponovo.');
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <p role="status" style={{ margin: 0, padding: '14px 16px', borderRadius: '12px', background: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '15px' }}>
        ✓ Hvala! Javićemo vam se u roku od 24h da dogovorimo termin.
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void send()}
        disabled={state === 'sending'}
        style={{ width: '100%', padding: '15px 20px', borderRadius: '999px', border: 0, background: '#1E5AA8', color: '#FFFFFF', fontSize: '16px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
      >
        {state === 'sending' ? 'Šaljem…' : 'Da, pozovite me'}
      </button>
      {state === 'error' && (
        <p role="alert" style={{ margin: '12px 0 0', fontSize: '14px', color: '#991b1b' }}>
          {error}
        </p>
      )}
    </>
  );
}
