'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminAuthHeader } from '../../app/lib/authFetch';
import { UNIT_STATUS_LABEL, type UnitStatus } from '../../app/lib/projects';

/**
 * Admin projekta -> "Pristup za prodaju": lični linkovi za prodaju
 * investitora (/prodaja/<kod>), gašenje linka, Telegram obaveštenje i
 * istorija svih promena statusa i cene (i iz prodaje i iz admina).
 * Mockup: public/mockup/Prodaja.html, desna strana.
 */

type LinkRow = { id: string; person_name: string; created_at: string; last_used_at: string | null; revoked_at: string | null };
type ChangeRow = { id: string; created_at: string; actor: string; unit_code: string; field: 'status' | 'price'; old_value: string | null; new_value: string | null };

const date = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}`;
};

function changeText(c: ChangeRow) {
  if (c.field === 'status') {
    const from = UNIT_STATUS_LABEL[c.old_value as UnitStatus] ?? c.old_value;
    const to = UNIT_STATUS_LABEL[c.new_value as UnitStatus] ?? c.new_value;
    return `${c.unit_code}: ${String(from).toLowerCase()} → ${String(to).toLowerCase()}`;
  }
  const euro = (v: string | null) => (v ? `${Number(v).toLocaleString('sr-RS')} €` : 'bez cene');
  return `${c.unit_code}: cena ${euro(c.old_value)} → ${euro(c.new_value)}`;
}

export default function SalesAccessPanel({
  projectId,
  notifySales,
  onNotifyChange
}: {
  projectId: string;
  notifySales: boolean;
  onNotifyChange: (value: boolean) => void;
}) {
  const [links, setLinks] = useState<LinkRow[] | null>(null);
  const [changes, setChanges] = useState<ChangeRow[]>([]);
  const [person, setPerson] = useState('');
  const [created, setCreated] = useState<{ name: string; url: string } | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const call = useCallback(async (action: string, payload: Record<string, unknown>) => {
    const res = await fetch('/api/admin/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
      body: JSON.stringify({ action, projectId, ...payload })
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) throw new Error(json?.error || 'Greška na serveru.');
    return json;
  }, [projectId]);

  const load = useCallback(async () => {
    try {
      const json = await call('sales-list', {});
      setLinks(json.links);
      setChanges(json.changes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pristup nije učitan.');
    }
  }, [call]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Greška.');
    } finally {
      setBusy('');
    }
  };

  const viberHref = (url: string) => `viber://forward?text=${encodeURIComponent(`Link za izmenu statusa i cena stanova: ${url}`)}`;

  return (
    <section className="pa-card">
      <h2>Pristup za prodaju</h2>
      <p className="pa-hint">
        Svaka osoba iz prodaje investitora dobija svoj link. Preko njega menja samo status i cenu stanova u ovom projektu - bez naloga i
        lozinke. Ugašen link odmah prestaje da radi.
      </p>
      {error && <p className="pa-msg is-err">{error}</p>}

      <form
        className="pa-row"
        onSubmit={(e) => {
          e.preventDefault();
          const name = person.trim();
          if (!name) return;
          run('create', async () => {
            const json = await call('sales-link-create', { person: name });
            setCreated({ name, url: `${window.location.origin}${json.path}` });
            setCopied(false);
            setPerson('');
            setLinks((l) => [...(l ?? []), json.link]);
          });
        }}
      >
        <input type="text" value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Ime i uloga, npr. Jelena, prodaja" style={{ maxWidth: 320 }} />
        <button type="submit" className="pa-btn is-primary" disabled={!person.trim() || busy === 'create'}>
          {busy === 'create' ? 'Pravim...' : '+ Napravi link'}
        </button>
      </form>

      {created && (
        <div className="pa-card" style={{ marginTop: 12, marginBottom: 0, padding: 14, background: 'var(--accent-soft)' }}>
          <b>Link za „{created.name}“ je napravljen.</b> Pošaljite ga toj osobi - link se prikazuje samo sada; ako se izgubi, napravite novi.
          <code style={{ display: 'block', background: 'var(--surface)', borderRadius: 8, padding: '8px 10px', margin: '8px 0', fontSize: 12.5, wordBreak: 'break-all' }}>
            {created.url}
          </code>
          <div className="pa-row">
            <button
              type="button"
              className="pa-btn is-primary"
              onClick={async () => {
                await navigator.clipboard?.writeText(created.url).catch(() => undefined);
                setCopied(true);
              }}
            >
              {copied ? '✓ Kopirano' : 'Kopiraj link'}
            </button>
            <a className="pa-btn" href={viberHref(created.url)}>
              Pošalji na Viber
            </a>
            <button type="button" className="pa-btn" onClick={() => setCreated(null)}>
              Zatvori
            </button>
          </div>
        </div>
      )}

      <div className="pa-list" style={{ marginTop: 12 }}>
        {links === null && !error && <p className="pa-hint">Učitavam...</p>}
        {links?.length === 0 && <div className="pa-empty">Još niko iz prodaje nema pristup.</div>}
        {links?.map((l) => (
          <div key={l.id} className="pa-item" style={l.revoked_at ? { opacity: 0.55 } : undefined}>
            <span>
              <b style={l.revoked_at ? { textDecoration: 'line-through' } : undefined}>{l.person_name}</b>
              <small>
                napravljen {date(l.created_at)} ·{' '}
                {l.revoked_at ? `ugašen ${date(l.revoked_at)}` : l.last_used_at ? `poslednja promena ${date(l.last_used_at)}` : 'još nije menjao/la'}
              </small>
            </span>
            {l.revoked_at ? (
              <span className="pa-pill is-draft">ugašen</span>
            ) : (
              <span className="pa-row">
                <span className="pa-pill is-pub">aktivan</span>
                <button
                  type="button"
                  className="pa-btn is-danger"
                  disabled={busy === l.id}
                  onClick={() => {
                    if (!window.confirm(`Ugasiti link za „${l.person_name}“? Odmah prestaje da radi.`)) return;
                    run(l.id, async () => {
                      await call('sales-link-revoke', { id: l.id });
                      await load();
                    });
                  }}
                >
                  Ugasi
                </button>
              </span>
            )}
          </div>
        ))}
      </div>

      <label className="pa-row" style={{ marginTop: 14, fontSize: 13.5, fontWeight: 600, color: 'var(--ink-soft)' }}>
        <input
          type="checkbox"
          checked={notifySales}
          disabled={busy === 'notify'}
          onChange={(e) => {
            const value = e.target.checked;
            run('notify', async () => {
              const res = await fetch('/api/admin/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
                body: JSON.stringify({ action: 'update', id: projectId, fields: { notify_sales: value } })
              });
              const json = await res.json().catch(() => null);
              if (!res.ok || !json?.success) throw new Error(json?.error || 'Podešavanje nije sačuvano.');
              onNotifyChange(value);
            });
          }}
        />
        Javi mi na Telegram kad prodaja označi stan kao prodat ili rezervisan
      </label>

      <div style={{ marginTop: 16 }}>
        <div className="pa-row" style={{ justifyContent: 'space-between' }}>
          <b>Sve promene</b>
          <button type="button" className="pa-btn" onClick={() => run('reload', load)} disabled={busy === 'reload'}>
            Osveži
          </button>
        </div>
        {changes.length === 0 ? (
          <p className="pa-hint" style={{ marginTop: 6 }}>Još nema promena statusa ni cena.</p>
        ) : (
          <div className="pa-table-wrap" style={{ marginTop: 6 }}>
            <table className="pa-table" style={{ minWidth: 0 }}>
              <tbody>
                {changes.map((c) => (
                  <tr key={c.id}>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--ink-faint)' }}>{date(c.created_at)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <b>{c.actor}</b>
                    </td>
                    <td>{changeText(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
