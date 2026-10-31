'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { FORM, formBtnStyle } from '../../lib/formTheme';
import {
  CONDITION_LABELS,
  FURNISHING_LABELS,
  LEAD_STATUSES,
  STATUS_LABELS,
  TYPE_LABELS,
  leadEstimate,
  leadProperty,
  type LeadStatus,
  type ValuationLead
} from '../../lib/valuationLeadLabels';
import { normalizeSource } from '../../lib/visitSources';

/**
 * Admin "Procene" (2026-10-31, maketa public/mockup/ProceneAdmin.html):
 * vlasnici koji su na /alati/procena-vrednosti tražili procenu i ostavili
 * kontakt - svaki je potencijalni klijent za 360° turu. Status, beleška,
 * poziv/Viber i "Pošalji ponudu za turu". Server: /api/admin/valuation-leads.
 */

type Filter = 'all' | LeadStatus;
type Kind = 'all' | 'sale' | 'rent';

const STATUS_COLORS: Record<LeadStatus, { bg: string; fg: string }> = {
  new: { bg: '#FEF3C7', fg: '#92400e' },
  contacted: { bg: '#E0F2FE', fg: '#075985' },
  tour_offered: { bg: '#EAF1FB', fg: '#1E5AA8' },
  converted: { bg: '#DCFCE7', fg: '#15803d' },
  lost: { bg: '#F1F1F3', fg: '#8C8E93' }
};

async function api(method: 'GET' | 'PATCH' | 'POST', body?: Record<string, unknown>) {
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Niste prijavljeni.');
  const res = await fetch('/api/admin/valuation-leads', {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => ({ success: false, error: `Greška servera (${res.status}).` }));
  if (!res.ok || !json.success) throw new Error(json.error || 'Greška.');
  return json;
}

/** "+381641234567" iz "064 123 4567"; null kad ne liči na broj. */
function e164(raw: string | null): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length < 8) return null;
  if (raw!.trim().startsWith('+')) return `+${digits}`;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('0')) return `+381${digits.slice(1)}`;
  return `+${digits}`;
}

function when(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const time = d.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `danas ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `juče ${time}`;
  return d.toLocaleDateString('sr-RS', { day: 'numeric', month: 'short' });
}

/** "čeka 3 h" / "čeka 2 dana" za zahtev koji još niko nije pozvao. */
function waiting(iso: string, now: number): string {
  const hours = Math.floor((now - new Date(iso).getTime()) / 3600000);
  if (hours < 1) return 'stiglo upravo';
  if (hours < 24) return `čeka ${hours} h`;
  const days = Math.floor(hours / 24);
  return `čeka ${days} ${days === 1 ? 'dan' : 'dana'}`;
}

export default function ValuationLeadsPage() {
  const [leads, setLeads] = useState<ValuationLead[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [kind, setKind] = useState<Kind>('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  // Trenutak otvaranja strane - za "čeka 3 h" i "poslednjih 30 dana".
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const json = await api('GET');
      setLeads(json.leads as ValuationLead[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Zahtevi nisu učitani.');
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const open = leads?.find((l) => l.id === openId) ?? null;
  const openLead = (l: ValuationLead) => {
    setOpenId(l.id);
    setNote(l.agent_note ?? '');
    setNotice('');
    setError('');
  };
  const replace = (lead: ValuationLead) => setLeads((all) => (all ? all.map((l) => (l.id === lead.id ? lead : l)) : all));

  const counts = useMemo(() => {
    const c: Record<LeadStatus, number> = { new: 0, contacted: 0, tour_offered: 0, converted: 0, lost: 0 };
    for (const l of leads ?? []) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [leads]);
  const last30 = (leads ?? []).filter((l) => now - new Date(l.created_at).getTime() < 30 * 86400000).length;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (leads ?? []).filter(
      (l) =>
        (filter === 'all' || l.status === filter) &&
        (kind === 'all' || (kind === 'rent' ? l.listing_type === 'rent' : l.listing_type !== 'rent')) &&
        (!q || [l.contact_name, l.contact_phone, l.contact_email, l.neighborhood, l.city].some((v) => v?.toLowerCase().includes(q)))
    );
  }, [leads, filter, kind, query]);

  const setStatus = async (lead: ValuationLead, status: LeadStatus) => {
    setBusy('status');
    try {
      const json = await api('PATCH', { id: lead.id, status });
      replace(json.lead);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Status nije sačuvan.');
    } finally {
      setBusy(null);
    }
  };

  const saveNote = async (lead: ValuationLead) => {
    setBusy('note');
    try {
      const json = await api('PATCH', { id: lead.id, note });
      replace(json.lead);
      setNotice('Beleška je sačuvana.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Beleška nije sačuvana.');
    } finally {
      setBusy(null);
    }
  };

  const sendOffer = async (lead: ValuationLead) => {
    const byEmail = Boolean(lead.contact_email?.includes('@'));
    if (byEmail && !window.confirm(`Poslati ponudu za turu na ${lead.contact_email}?`)) return;
    setBusy('offer');
    setNotice('');
    setError('');
    try {
      const json = await api('POST', { id: lead.id, channel: byEmail ? 'email' : 'viber' });
      replace(json.lead);
      if (byEmail) {
        setNotice('Ponuda je poslata mejlom. Status: Ponuđena tura.');
        return;
      }
      // Viber ne prima unapred upisan tekst - poruka se kopira, pa se otvara razgovor.
      try {
        await navigator.clipboard.writeText(json.viberText);
        setNotice('Poruka je kopirana - u Viberu je samo nalepite i pošaljite. Status: Ponuđena tura.');
      } catch {
        setNotice(`Kopirajte poruku ručno:\n\n${json.viberText}`);
      }
      const number = e164(lead.contact_phone);
      if (number) window.location.href = `viber://chat?number=${encodeURIComponent(number)}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ponuda nije poslata.');
    } finally {
      setBusy(null);
    }
  };

  const chip = (on: boolean): React.CSSProperties => ({
    ...formBtnStyle,
    padding: '6px 12px',
    fontSize: '13px',
    borderRadius: '999px',
    ...(on ? { background: FORM.accentSoft, color: FORM.accent, borderColor: FORM.accent } : {})
  });
  const label: React.CSSProperties = { margin: '16px 0 6px', fontSize: 11.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: FORM.textMuted };
  const kpi = (title: string, value: number, highlight = false) => (
    <div style={{ background: highlight ? FORM.accentSoft : FORM.surface, border: `1px solid ${FORM.border}`, borderRadius: 14, padding: 14 }}>
      <small style={{ color: FORM.textMuted, fontWeight: 700, fontSize: 12 }}>{title}</small>
      <b style={{ display: 'block', fontSize: 28, marginTop: 4, color: highlight ? FORM.accent : FORM.textPrimary }}>{value}</b>
    </div>
  );
  const yesNo = (v: boolean | null) => (v === true ? 'da' : v === false ? 'ne' : '—');

  return (
    <main className="k-form" style={{ minHeight: '100dvh', background: FORM.bg, color: FORM.textPrimary, fontFamily: FORM.fontBody, padding: '24px 20px 64px' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, margin: 0, fontFamily: FORM.fontDisplay }}>Procene vrednosti</h1>
        <p style={{ margin: '2px 0 16px', fontSize: 13, color: FORM.textSecondary }}>
          Vlasnici koji su tražili procenu i ostavili kontakt - svaki je potencijalni klijent za 360° turu.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
          {kpi('Novi (nisu pozvani)', counts.new, true)}
          {kpi('Pozvani', counts.contacted)}
          {kpi('Ponuđena tura', counts.tour_offered)}
          {kpi('Dogovoreno snimanje', counts.converted)}
          {kpi('Ukupno (30 dana)', last30)}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <button type="button" style={chip(filter === 'all')} onClick={() => setFilter('all')}>
            Svi
          </button>
          {LEAD_STATUSES.map((s) => (
            <button key={s} type="button" style={chip(filter === s)} onClick={() => setFilter(s)}>
              {STATUS_LABELS[s]}
            </button>
          ))}
          <span style={{ width: 8 }} />
          {(['sale', 'rent'] as const).map((k) => (
            <button key={k} type="button" style={chip(kind === k)} onClick={() => setKind(kind === k ? 'all' : k)}>
              {k === 'sale' ? 'Prodaja' : 'Izdavanje'}
            </button>
          ))}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pretraga: ime, telefon, naselje"
            style={{ marginLeft: 'auto', border: `1.5px solid ${FORM.border}`, borderRadius: 10, padding: '8px 12px', minWidth: 220, font: 'inherit', background: FORM.surface, color: FORM.textPrimary }}
          />
        </div>

        {error && <p style={{ color: FORM.danger, fontSize: 13.5 }}>{error}</p>}
        {!leads ? (
          <p style={{ color: FORM.textMuted }}>{error ? '' : 'Učitavam zahteve…'}</p>
        ) : !shown.length ? (
          <p style={{ color: FORM.textMuted }}>Nema zahteva za ovaj izbor.</p>
        ) : (
          <div style={{ background: FORM.surface, border: `1px solid ${FORM.border}`, borderRadius: 14, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  {['Kad', 'Vlasnik', 'Nekretnina', 'Procena', 'Izvor', 'Status'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 11.5, letterSpacing: '.06em', textTransform: 'uppercase', color: FORM.textMuted, padding: '10px 12px', borderBottom: `1px solid ${FORM.border}` }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((l) => {
                  const c = STATUS_COLORS[l.status];
                  return (
                    <tr
                      key={l.id}
                      onClick={() => openLead(l)}
                      style={{ cursor: 'pointer', background: openId === l.id ? FORM.accentSoft : undefined }}
                    >
                      <td style={{ padding: 12, borderBottom: `1px solid ${FORM.border}`, whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                        {when(l.created_at)}
                        {l.status === 'new' && <div style={{ fontSize: 12, color: FORM.danger, fontWeight: 700 }}>{waiting(l.created_at, now)}</div>}
                      </td>
                      <td style={{ padding: 12, borderBottom: `1px solid ${FORM.border}`, verticalAlign: 'top' }}>
                        <b style={{ display: 'block' }}>{l.contact_name || '—'}</b>
                        <span style={{ fontSize: 13, color: FORM.accent, fontWeight: 600 }}>{l.contact_phone || l.contact_email}</span>
                      </td>
                      <td style={{ padding: 12, borderBottom: `1px solid ${FORM.border}`, verticalAlign: 'top' }}>
                        <b style={{ display: 'block' }}>{leadProperty(l)}</b>
                        <small style={{ color: FORM.textMuted }}>
                          {[l.listing_type === 'rent' ? 'Izdavanje' : 'Prodaja', l.sqm ? `${Number(l.sqm)} m²` : null, l.condition ? CONDITION_LABELS[l.condition] : null]
                            .filter(Boolean)
                            .join(' · ')}
                        </small>
                      </td>
                      <td style={{ padding: 12, borderBottom: `1px solid ${FORM.border}`, verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <b>{leadEstimate(l) ?? 'ručna procena'}</b>
                      </td>
                      <td style={{ padding: 12, borderBottom: `1px solid ${FORM.border}`, verticalAlign: 'top', fontSize: 12.5, color: FORM.textMuted }}>
                        {l.source && l.source !== 'organic' ? normalizeSource(l.source).label : 'direktno'}
                      </td>
                      <td style={{ padding: 12, borderBottom: `1px solid ${FORM.border}`, verticalAlign: 'top' }}>
                        <span style={{ background: c.bg, color: c.fg, borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {STATUS_LABELS[l.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <aside
          role="dialog"
          aria-label={`Zahtev: ${open.contact_name ?? ''}`}
          style={{
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            width: 'min(430px, 100%)',
            background: FORM.surface,
            borderLeft: `1px solid ${FORM.border}`,
            boxShadow: '-20px 0 50px -30px rgba(0,0,0,.35)',
            padding: 20,
            overflow: 'auto',
            zIndex: 200
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: FORM.fontDisplay, fontSize: 21 }}>{open.contact_name || 'Bez imena'}</h2>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: FORM.textMuted }}>
                Procena tražena {when(open.created_at)}
                {open.source && open.source !== 'organic' ? ` · izvor ${normalizeSource(open.source).label}` : ''}
              </p>
            </div>
            <button type="button" onClick={() => setOpenId(null)} aria-label="Zatvori" style={{ ...formBtnStyle, width: 34, height: 34, padding: 0, borderRadius: '50%' }}>
              ×
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '14px 0' }}>
            {e164(open.contact_phone) && (
              <>
                <a href={`tel:${e164(open.contact_phone)}`} style={{ ...formBtnStyle, background: FORM.accent, color: FORM.onAccent, borderColor: FORM.accent, textDecoration: 'none' }}>
                  📞 Pozovi {open.contact_phone}
                </a>
                <a href={`viber://chat?number=${encodeURIComponent(e164(open.contact_phone)!)}`} style={{ ...formBtnStyle, color: '#7360f2', borderColor: '#7360f2', textDecoration: 'none' }}>
                  Viber
                </a>
              </>
            )}
            {open.contact_email && (
              <a href={`mailto:${encodeURIComponent(open.contact_email)}`} style={{ ...formBtnStyle, textDecoration: 'none' }}>
                ✉ Mejl
              </a>
            )}
          </div>

          <p style={label}>Status</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {LEAD_STATUSES.map((s) => (
              <button key={s} type="button" disabled={busy !== null} onClick={() => void setStatus(open, s)} style={chip(open.status === s)}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          <p style={label}>Nekretnina</p>
          <dl style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '6px 10px', margin: 0, fontSize: 13.5 }}>
            <dt style={{ color: FORM.textMuted }}>Namena</dt>
            <dd style={{ margin: 0 }}>{open.listing_type === 'rent' ? 'Izdavanje' : 'Prodaja'}</dd>
            <dt style={{ color: FORM.textMuted }}>Vrsta</dt>
            <dd style={{ margin: 0 }}>{TYPE_LABELS[open.property_type ?? ''] ?? '—'}</dd>
            <dt style={{ color: FORM.textMuted }}>Naselje</dt>
            <dd style={{ margin: 0 }}>{[open.neighborhood, open.city].filter(Boolean).join(', ') || '—'}</dd>
            <dt style={{ color: FORM.textMuted }}>Površina</dt>
            <dd style={{ margin: 0 }}>
              {open.sqm ? `${Number(open.sqm)} m²` : '—'}
              {open.rooms ? `, ${Number(open.rooms)} sobe` : ''}
            </dd>
            <dt style={{ color: FORM.textMuted }}>Sprat</dt>
            <dd style={{ margin: 0 }}>
              {open.floor_number ?? '—'}, lift: {yesNo(open.has_elevator)}
            </dd>
            <dt style={{ color: FORM.textMuted }}>Godina / stanje</dt>
            <dd style={{ margin: 0 }}>{[open.build_year, open.condition ? CONDITION_LABELS[open.condition] : null].filter(Boolean).join(' · ') || '—'}</dd>
            <dt style={{ color: FORM.textMuted }}>Parking / terasa</dt>
            <dd style={{ margin: 0 }}>
              {yesNo(open.has_parking)} / {yesNo(open.has_terrace)}
            </dd>
            {open.furnishing && (
              <>
                <dt style={{ color: FORM.textMuted }}>Opremljenost</dt>
                <dd style={{ margin: 0 }}>{FURNISHING_LABELS[open.furnishing] ?? open.furnishing}</dd>
              </>
            )}
          </dl>

          <p style={label}>Procena koju je dobio</p>
          <dl style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '6px 10px', margin: 0, fontSize: 13.5 }}>
            <dt style={{ color: FORM.textMuted }}>Raspon</dt>
            <dd style={{ margin: 0 }}>
              <b>{leadEstimate(open) ?? 'nema podataka - ručna procena'}</b>
            </dd>
            {open.price_per_sqm_used_low != null && open.price_per_sqm_used_high != null && (
              <>
                <dt style={{ color: FORM.textMuted }}>Po m²</dt>
                <dd style={{ margin: 0 }}>
                  {Math.round(Number(open.price_per_sqm_used_low)).toLocaleString('sr-RS')} – {Math.round(Number(open.price_per_sqm_used_high)).toLocaleString('sr-RS')} €
                </dd>
              </>
            )}
          </dl>

          <p style={label}>Beleška</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="npr. pozvati posle 17h, prodaje za 2 meseca, zainteresovan za turu"
            rows={4}
            style={{ width: '100%', border: `1.5px solid ${FORM.border}`, borderRadius: 10, padding: 10, font: 'inherit', background: FORM.surface, color: FORM.textPrimary, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <button
              type="button"
              disabled={busy !== null || note === (open.agent_note ?? '')}
              onClick={() => void saveNote(open)}
              style={{ ...formBtnStyle, background: FORM.accent, color: FORM.onAccent, borderColor: FORM.accent }}
            >
              {busy === 'note' ? 'Čuvam…' : 'Sačuvaj belešku'}
            </button>
            <button type="button" disabled={busy !== null} onClick={() => void sendOffer(open)} style={{ ...formBtnStyle, fontWeight: 700 }}>
              {busy === 'offer' ? 'Šaljem…' : `📝 Pošalji ponudu za turu (${open.contact_email?.includes('@') ? 'mejl' : 'Viber'})`}
            </button>
          </div>
          {notice && <p style={{ margin: '12px 0 0', color: FORM.success, fontSize: 13.5, fontWeight: 600, whiteSpace: 'pre-wrap' }}>{notice}</p>}
          {error && <p style={{ margin: '12px 0 0', color: FORM.danger, fontSize: 13.5 }}>{error}</p>}
          <p style={{ margin: '14px 0 0', fontSize: 12.5, color: FORM.textMuted, lineHeight: 1.5 }}>
            Ponuda nosi primer ture i cenu iz cenovnika (sa promocijom dok traje); status prelazi u „Ponuđena tura“. Bez mejla se poruka kopira i
            otvara se Viber - samo je nalepite.
          </p>
        </aside>
      )}
    </main>
  );
}
