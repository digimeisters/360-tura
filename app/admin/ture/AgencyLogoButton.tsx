'use client';

import { useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { FORM, formBtnStyle } from '../../lib/formTheme';

type Props = {
  agency: string;
  logoUrl: string | null;
  /** Posle otpremanja ili uklanjanja - lista tura se ponovo učitava. */
  onChanged: () => void;
};

/**
 * Logo agencije za krug na mestu stativa u turi (NadirLogo.tsx). Otpremi se
 * jednom i važi za sve ture agencije; bez loga tura prikazuje Kvadrat360 znak.
 */
export default function AgencyLogoButton({ agency, logoUrl, onChanged }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function send(init: RequestInit) {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) throw new Error('nema sesije');
    const res = await fetch('/api/admin/agency-logo', {
      ...init,
      headers: { ...(init.headers || {}), Authorization: `Bearer ${session.access_token}` }
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) throw new Error(json.error || 'Greška.');
  }

  async function upload(file: File) {
    setBusy(true);
    try {
      const body = new FormData();
      body.append('agency', agency);
      body.append('file', file);
      await send({ method: 'POST', body });
      onChanged();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Logo nije otpremljen.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Ukloniti logo agencije "${agency}"? Ture će prikazivati Kvadrat360 znak.`)) return;
    setBusy(true);
    try {
      await send({ method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agency }) });
      onChanged();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Logo nije uklonjen.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <span
        title={logoUrl ? 'Logo agencije u turi' : 'Bez loga - tura prikazuje Kvadrat360 znak'}
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          background: '#fff',
          border: `1px solid ${FORM.border}`,
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
          flexShrink: 0
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl || '/brand/kvadrat360-icon.svg'}
          alt=""
          style={{ width: '72%', height: '72%', objectFit: 'contain', opacity: logoUrl ? 1 : 0.45 }}
        />
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/svg+xml,image/webp,image/jpeg"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void upload(file);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        style={{ ...formBtnStyle, padding: '6px 12px', fontSize: '12.5px' }}
      >
        {busy ? 'Čekajte…' : logoUrl ? 'Zameni logo' : 'Dodaj logo'}
      </button>
      {logoUrl && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void remove()}
          aria-label={`Ukloni logo agencije ${agency}`}
          style={{ ...formBtnStyle, padding: '6px 10px', fontSize: '12.5px' }}
        >
          ×
        </button>
      )}
    </span>
  );
}
