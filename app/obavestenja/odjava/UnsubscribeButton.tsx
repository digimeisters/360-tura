'use client';

import { useState } from 'react';

/** Dugme "Odjavi me" - POST /api/novogradnja/odjava sa potpisom iz linka. */
export function UnsubscribeButton({ w, s }: { w: string; s: string }) {
  const [state, setState] = useState<{ kind: 'idle' | 'sending' | 'ok' | 'error'; text?: string }>({ kind: 'idle' });

  async function go() {
    setState({ kind: 'sending' });
    try {
      const res = await fetch('/api/novogradnja/odjava', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ w, s })
      });
      const json = await res.json().catch(() => null);
      setState(res.ok && json?.success ? { kind: 'ok' } : { kind: 'error', text: json?.error || 'Odjava nije uspela. Pokušajte ponovo.' });
    } catch {
      setState({ kind: 'error', text: 'Nema veze sa serverom. Pokušajte ponovo.' });
    }
  }

  if (state.kind === 'ok') {
    return (
      <p role="status" style={{ background: '#ECFDF3', border: '1px solid #BBF7D0', color: '#14532d', borderRadius: 14, padding: '12px 14px', margin: 0 }}>
        Odjavljeni ste ✓ · <span lang="en">Unsubscribed</span>
      </p>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={go}
        disabled={state.kind === 'sending' || !w || !s}
        style={{ border: 0, borderRadius: 999, padding: '13px 22px', background: '#1E5AA8', color: '#fff', font: 'inherit', fontWeight: 700, cursor: 'pointer' }}
      >
        {state.kind === 'sending' ? 'Odjavljujem…' : 'Odjavi me · Unsubscribe'}
      </button>
      {state.kind === 'error' && (
        <p role="alert" style={{ color: '#991b1b', marginTop: 12 }}>
          {state.text}
        </p>
      )}
    </>
  );
}
