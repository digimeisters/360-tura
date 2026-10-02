'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminAuthHeader } from '../../app/lib/authFetch';
import type { ProjectStats } from '../../app/lib/projectStats';
import { srPlural } from '../../app/lib/projectI18n';
import type { SalesInquiry } from '../../app/lib/salesAccess';

/**
 * Admin projekta -> "Izveštaj i upiti": posete strane, otvaranja stanova i
 * upiti po stanu za poslednjih 30 dana (lib/projectStats.ts), i spisak
 * upita kupaca sa oznakom ko ih je iz prodaje obradio.
 */

const when = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}`;
};

export default function InsightsPanel({ projectId }: { projectId: string }) {
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [inquiries, setInquiries] = useState<SalesInquiry[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
        body: JSON.stringify({ action: 'insights', projectId })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Izveštaj nije učitan.');
      setStats(json.stats);
      setInquiries(json.inquiries);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Izveštaj nije učitan.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const max = Math.max(1, ...(stats?.units.map((u) => u.views) ?? [1]));

  return (
    <section className="pa-card">
      <div className="pa-row" style={{ justifyContent: 'space-between' }}>
        <h2>Izveštaj i upiti{stats ? ` · poslednjih ${stats.days} dana` : ''}</h2>
        <button type="button" className="pa-btn" onClick={load} disabled={loading}>
          {loading ? 'Učitavam...' : 'Osveži'}
        </button>
      </div>
      <p className="pa-hint">
        Koliko ljudi gleda projekat i koje stanove otvaraju - argument za investitora i za korekciju cena. Isti izveštaj prodaja vidi na
        svom linku. Tvoje posete se ne broje.
      </p>
      {error && <p className="pa-msg is-err">{error}</p>}

      {stats && (
        <>
          <div className="pa-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))' }}>
            {[
              [stats.visitors, 'posetilaca'],
              [stats.pageViews, 'otvaranja strane'],
              [stats.unitViews, 'otvaranja stanova'],
              [stats.inquiries, srPlural(stats.inquiries, 'upit', 'upita', 'upita')]
            ].map(([n, label]) => (
              <div key={label} style={{ background: 'var(--surface-2)', borderRadius: 14, padding: '10px 12px' }}>
                <b style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 24 }}>{n}</b>
                <small style={{ color: 'var(--ink-soft)' }}>{label}</small>
              </div>
            ))}
          </div>
          {stats.units.length > 0 ? (
            <div style={{ marginTop: 14 }}>
              <b style={{ fontSize: 13 }}>Najgledaniji stanovi</b>
              {stats.units.slice(0, 12).map((u) => (
                <div key={u.code} style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: 10, alignItems: 'center', fontSize: 13, marginTop: 6 }}>
                  <b>{u.code}</b>
                  <span style={{ height: 10, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
                    <i style={{ display: 'block', height: '100%', width: `${(u.views / max) * 100}%`, background: 'var(--accent)', borderRadius: 999 }} />
                  </span>
                  <span style={{ color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>
                    {u.views} otv.{u.inquiries ? ` · ${u.inquiries} ${srPlural(u.inquiries, 'upit', 'upita', 'upita')}` : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="pa-hint" style={{ marginTop: 10 }}>
              Još nema otvaranja stanova u ovom periodu.
            </p>
          )}
        </>
      )}

      <div style={{ marginTop: 18 }}>
        <b>Upiti kupaca ({inquiries.length})</b>
        <p className="pa-hint" style={{ margin: '2px 0 8px' }}>
          Stižu i tebi na Telegram i prodaji na njihov link, gde ih označavaju kao obrađene.
        </p>
        {inquiries.length === 0 ? (
          <div className="pa-empty">Još nema upita.</div>
        ) : (
          <div className="pa-table-wrap">
            <table className="pa-table" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>Kada</th>
                  <th>Stan</th>
                  <th>Kupac</th>
                  <th>Poruka</th>
                  <th>Obrađen</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((q) => (
                  <tr key={q.id}>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--ink-faint)' }}>{when(q.created_at)}</td>
                    <td>
                      <b>{q.unit_code}</b>
                    </td>
                    <td>
                      {q.name}
                      <br />
                      <small>{q.contact}</small>
                      {(q.lang === 'en' || q.embedded) && (
                        <small style={{ display: 'block', color: 'var(--ink-faint)' }}>
                          {[q.lang === 'en' ? 'EN' : null, q.embedded ? 'sa sajta investitora' : null].filter(Boolean).join(' · ')}
                        </small>
                      )}
                    </td>
                    <td style={{ maxWidth: 260 }}>{q.message}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {q.handled_at ? (
                        <span style={{ color: 'var(--ok)' }}>
                          ✓ {q.handled_by}
                          <br />
                          <small>{when(q.handled_at)}</small>
                        </span>
                      ) : (
                        <span className="pa-pill is-draft">čeka</span>
                      )}
                    </td>
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
