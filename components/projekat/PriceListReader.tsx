'use client';

import { useState } from 'react';
import { adminAuthHeader } from '../../app/lib/authFetch';
import { shrinkImage } from '../../app/lib/shrinkImage';
import { srPlural } from '../../app/lib/projectI18n';

/**
 * Admin → „Uvoz iz Excela" → „📄 Pročitaj cenovnik": investitorov cenovnik
 * (PDF ili slika) ide na R2 (kind 'doc'), AI ga pročita (akcija
 * pricelist-read) i vrati redove u kolonama uvoza. Tekst ide u polje za
 * uvoz - admin ga pregleda i klikne „Uvezi tabelu" kao i za Excel.
 */

type Api = (action: string, payload: Record<string, unknown>) => Promise<Record<string, unknown>>;

export default function PriceListReader({
  projectId,
  api,
  onText
}: {
  projectId: string;
  api: Api;
  onText: (text: string, info: string) => void;
}) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function uploadDoc(file: File): Promise<string> {
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const body = isPdf ? file : await shrinkImage(file, 3 * 1024 * 1024);
    const fileType = isPdf ? 'application/pdf' : body.type || 'image/jpeg';
    const res = await fetch('/api/admin/projects/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
      body: JSON.stringify({ projectId, kind: 'doc', fileType, fileSize: body.size })
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) throw new Error(json?.error || 'Otpremanje cenovnika nije pripremljeno.');
    const put = await fetch(json.uploadUrl, { method: 'PUT', headers: { 'Content-Type': json.contentType }, body });
    if (!put.ok) throw new Error(`Cenovnik nije poslat (R2 ${put.status}).`);
    return json.publicUrl as string;
  }

  async function read(file: File) {
    setError('');
    try {
      setBusy('Otpremam cenovnik…');
      const url = await uploadDoc(file);
      setBusy('AI čita cenovnik… (do pola minuta)');
      const json = await api('pricelist-read', { projectId, fileUrl: url });
      const count = Number(json.count ?? 0);
      onText(
        String(json.text ?? ''),
        `AI je pročitao ${count} ${srPlural(count, 'stan', 'stana', 'stanova')} iz cenovnika. Proverite tabelu ispod (oznake, spratove, cene i statuse), pa kliknite „Uvezi tabelu“.${
          json.backup ? ' Glavni model je bio zauzet, čitao je rezervni - proverite posebno pažljivo.' : ''
        }`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Čitanje cenovnika nije uspelo.');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="pa-row" style={{ marginBottom: 8 }}>
      <label className={busy ? 'pa-btn' : 'pa-btn is-primary'} style={{ cursor: busy ? 'default' : 'pointer' }}>
        {busy || '📄 Pročitaj cenovnik (PDF ili slika)'}
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          hidden
          disabled={Boolean(busy)}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) read(file);
          }}
        />
      </label>
      <span className="pa-hint" style={{ margin: 0 }}>
        ili nalepite tabelu iz Excela
      </span>
      {error && (
        <span className="pa-msg is-err" style={{ margin: 0 }}>
          {error}
        </span>
      )}
    </div>
  );
}
