'use client';

import { useMemo, useState } from 'react';
import { floorName, UNIT_STATUSES, UNIT_STATUS_LABEL, type UnitStatus } from '../../app/lib/projects';
import type { SalesChange, SalesData, SalesNote, SalesUnit } from '../../app/lib/salesAccess';
import { srPlural } from '../../app/lib/projectI18n';

/**
 * Strana za prodaju investitora (/prodaja/<kod>): status i cena stanova,
 * po mockupu public/mockup/Prodaja.html (vlasnik, 2. 10. 2026).
 *
 * Svaki stan se potvrđuje POSEBNO: izmena -> "Potvrdi" -> "Da li ste
 * sigurni?" sa spiskom šta se menja -> tek tada ide na server. Nema
 * zajedničkog "Sačuvaj sve", da se uz jedan stan slučajno ne pošalje i
 * izmena na drugom.
 */

type Draft = { status: UnitStatus; price: string };
type Toast = { ok: boolean; text: string } | null;

const STATUS_KEY: Record<UnitStatus, 's' | 'r' | 'p'> = { available: 's', reserved: 'r', sold: 'p' };

const fmt = (n: number | null) => (n === null ? '' : n.toLocaleString('sr-RS'));
const parsePrice = (s: string): number | null => {
  const digits = s.replace(/\D/g, '');
  return digits ? Number(digits) : null;
};

function changeText(c: SalesChange): string {
  if (c.field === 'status') {
    const from = UNIT_STATUS_LABEL[c.old_value as UnitStatus] ?? c.old_value;
    const to = UNIT_STATUS_LABEL[c.new_value as UnitStatus] ?? c.new_value;
    return `${c.unit_code}: ${String(from).toLowerCase()} → ${String(to).toLowerCase()}`;
  }
  const from = c.old_value ? `${Number(c.old_value).toLocaleString('sr-RS')} €` : 'bez cene';
  const to = c.new_value ? `${Number(c.new_value).toLocaleString('sr-RS')} €` : 'bez cene';
  return `${c.unit_code}: cena ${from} → ${to}`;
}

function when(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `danas ${time}`;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `juče ${time}`;
  return `${d.getDate()}. ${d.getMonth() + 1}. ${time}`;
}

const NOTE_MAX = 120;

/**
 * Jedna kratka beleška prodaje (mockup public/mockup/ProdajaBeleske.html,
 * vlasnik 2. 10. 2026): jedan red, nova zamenjuje staru, ⚑ = važno.
 * Kupac je nikad ne vidi (tabela project_notes, samo server).
 */
function NoteRow({
  note,
  placeholder,
  disabled,
  onSave
}: {
  note: SalesNote | null;
  placeholder: string;
  disabled: boolean;
  onSave: (text: string, important: boolean) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [important, setImportant] = useState(false);

  const open = () => {
    setText(note?.text ?? '');
    setImportant(note?.important ?? false);
    setEditing(true);
  };
  const save = async (value: string, imp: boolean) => {
    if (await onSave(value, imp)) setEditing(false);
  };

  if (!editing) {
    if (!note) {
      return (
        <button type="button" className="sb-note is-empty" onClick={open} disabled={disabled}>
          + Beleška
        </button>
      );
    }
    return (
      <button type="button" className={note.important ? 'sb-note is-imp' : 'sb-note'} onClick={open} disabled={disabled} aria-label={`Izmeni belešku: ${note.text}`}>
        <span className="sb-note-ic" aria-hidden="true">{note.important ? '⚑' : '✎'}</span>
        <span className="sb-note-tx">
          {note.text}
          <small>
            {note.author} · {when(note.updated_at)}
          </small>
        </span>
      </button>
    );
  }

  return (
    <div className="sb-note-edit">
      <div className="sb-note-in">
        <input
          type="text"
          value={text}
          maxLength={NOTE_MAX}
          placeholder={placeholder}
          aria-label="Beleška"
          autoFocus
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save(text, important);
            if (e.key === 'Escape') setEditing(false);
          }}
        />
        <button type="button" className={important ? 'sb-note-flag is-on' : 'sb-note-flag'} aria-pressed={important} title="Važno" onClick={() => setImportant((v) => !v)}>
          ⚑
        </button>
      </div>
      <div className="sb-note-meta">
        <span>⚑ = važno · kupac ne vidi belešku</span>
        <span>
          {text.length}/{NOTE_MAX}
        </span>
      </div>
      <div className="sb-note-acts">
        {note && (
          <button type="button" onClick={() => save('', false)} disabled={disabled}>
            Obriši
          </button>
        )}
        <button type="button" onClick={() => setEditing(false)} disabled={disabled}>
          Otkaži
        </button>
        <button type="button" className="is-save" onClick={() => save(text, important)} disabled={disabled}>
          {disabled ? 'Čuvam...' : 'Sačuvaj'}
        </button>
      </div>
    </div>
  );
}

export default function SalesBoard({ token, initial }: { token: string; initial: SalesData }) {
  const [data, setData] = useState<SalesData>(initial);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [filter, setFilter] = useState<UnitStatus | null>(null);
  const [query, setQuery] = useState('');
  const [confirming, setConfirming] = useState<SalesUnit | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [showHandled, setShowHandled] = useState(false);
  const openInquiries = data.inquiries.filter((q) => !q.handled_at).length;

  const counts = useMemo(() => {
    const c: Record<UnitStatus, number> = { available: 0, reserved: 0, sold: 0 };
    data.units.forEach((u) => c[u.status]++);
    return c;
  }, [data.units]);

  const draftOf = (u: SalesUnit): Draft => drafts[u.id] ?? { status: u.status, price: fmt(u.price) };
  const isDirty = (u: SalesUnit) => {
    const d = drafts[u.id];
    return Boolean(d) && (d.status !== u.status || parsePrice(d.price) !== u.price);
  };
  const setDraft = (u: SalesUnit, patch: Partial<Draft>) => setDrafts((all) => ({ ...all, [u.id]: { ...draftOf(u), ...patch } }));
  const dropDraft = (id: string) =>
    setDrafts((all) => {
      const next = { ...all };
      delete next[id];
      return next;
    });

  const showToast = (t: Toast) => {
    setToast(t);
    if (t) window.setTimeout(() => setToast((cur) => (cur === t ? null : cur)), t.ok ? 2600 : 6000);
  };

  async function saveNoteFor(target: 'unit' | 'inquiry', id: string, text: string, important: boolean): Promise<boolean> {
    setSaving(true);
    try {
      const res = await fetch(`/api/prodaja/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'note', target, id, text, important })
      });
      const json = await res.json().catch(() => null);
      if (json?.data) setData(json.data as SalesData);
      if (!res.ok || !json?.success) {
        showToast({ ok: false, text: json?.error || 'Beleška nije sačuvana.' });
        return false;
      }
      return true;
    } catch {
      showToast({ ok: false, text: 'Nema veze sa serverom. Proverite internet i pokušajte ponovo.' });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function markInquiry(inquiryId: string, handled: boolean) {
    setSaving(true);
    try {
      const res = await fetch(`/api/prodaja/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'inquiry-handled', inquiryId, handled })
      });
      const json = await res.json().catch(() => null);
      if (json?.data) setData(json.data as SalesData);
      if (!res.ok || !json?.success) showToast({ ok: false, text: json?.error || 'Izmena nije sačuvana.' });
    } catch {
      showToast({ ok: false, text: 'Nema veze sa serverom. Proverite internet i pokušajte ponovo.' });
    } finally {
      setSaving(false);
    }
  }

  async function save(u: SalesUnit) {
    const d = draftOf(u);
    setSaving(true);
    try {
      const res = await fetch(`/api/prodaja/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId: u.id, status: d.status, price: parsePrice(d.price), expected: { status: u.status, price: u.price } })
      });
      const json = await res.json().catch(() => null);
      if (json?.data) setData(json.data as SalesData);
      if (!res.ok || !json?.success) {
        if (json?.conflict) dropDraft(u.id);
        showToast({ ok: false, text: json?.error || 'Izmena nije sačuvana. Pokušajte ponovo.' });
        return;
      }
      dropDraft(u.id);
      setFlash(u.id);
      window.setTimeout(() => setFlash(null), 1300);
      showToast({ ok: true, text: `✓ Stan ${u.code} sačuvan${data.project.published ? " · već se vidi na sajtu" : ""}` });
    } catch {
      showToast({ ok: false, text: 'Nema veze sa serverom. Proverite internet i pokušajte ponovo.' });
    } finally {
      setSaving(false);
      setConfirming(null);
    }
  }

  const q = query.trim().toLowerCase();
  const visible = (u: SalesUnit) => (!filter || u.status === filter) && (!q || u.code.toLowerCase().includes(q));

  const confirmRows = (() => {
    if (!confirming) return [];
    const d = draftOf(confirming);
    const rows: { label: string; from: string; to: string }[] = [];
    if (d.status !== confirming.status) rows.push({ label: 'Status', from: UNIT_STATUS_LABEL[confirming.status], to: UNIT_STATUS_LABEL[d.status] });
    const np = parsePrice(d.price);
    if (np !== confirming.price) {
      rows.push({ label: 'Cena', from: confirming.price === null ? 'bez cene' : `${fmt(confirming.price)} €`, to: np === null ? 'bez cene' : `${fmt(np)} €` });
    }
    return rows;
  })();
  const becomesSold = confirming ? draftOf(confirming).status === 'sold' && confirming.status !== 'sold' : false;

  return (
    <div className="sb">
      {toast && (
        <div className={toast.ok ? 'sb-toast' : 'sb-toast is-err'} role="status">
          {toast.text}
        </div>
      )}

      <header className="sb-top">
        <div className="sb-brand">
          <svg width="16" height="16" viewBox="0 0 28 28" fill="none" stroke="#1E5AA8" strokeWidth="3" aria-hidden="true">
            <path d="M14 2 L26 14 L14 26 L2 14 Z" />
          </svg>
          Kvadrat360 · prodaja
        </div>
        <h1>{data.project.title}</h1>
        <div className="sb-who">
          <span>
            Prijavljen: <b>{data.person}</b>
          </span>
          {data.project.published ? (
            <span className="sb-live">
              <i />
              uživo na sajtu
            </span>
          ) : (
            <span className="sb-live is-off">projekat još nije objavljen</span>
          )}
        </div>
      </header>

      {/* Upiti za stanove sa javne strane - stižu ovde, direktno prodaji. */}
      {data.inquiries.length > 0 && (
        <section className="sb-inq">
          <h2>
            Upiti kupaca
            {openInquiries > 0 && <span className="sb-inq-count">{openInquiries} novo</span>}
          </h2>
          {data.inquiries
            .filter((q) => showHandled || !q.handled_at)
            .map((q) => {
              const tel = q.contact.replace(/[^\d+]/g, '');
              const isPhone = tel.length >= 6 && !q.contact.includes('@');
              return (
                <div key={q.id} className={q.handled_at ? 'sb-inq-item is-done' : 'sb-inq-item'}>
                  <div className="sb-unit-top">
                    <b>
                      Stan {q.unit_code} · {q.name}
                    </b>
                    <small>{when(q.created_at)}</small>
                  </div>
                  <div className="sb-inq-contact">
                    {isPhone ? <a href={`tel:${tel}`}>📞 {q.contact}</a> : q.contact.includes('@') ? <a href={`mailto:${q.contact}`}>✉️ {q.contact}</a> : q.contact}
                    {q.lang === 'en' && <span className="sb-inq-tag">EN</span>}
                    {q.embedded && <span className="sb-inq-tag">sa vašeg sajta</span>}
                  </div>
                  {q.message && <p>{q.message}</p>}
                  <NoteRow
                    note={q.note}
                    placeholder="Kratko: šta je sa ovim kupcem…"
                    disabled={saving}
                    onSave={(text, imp) => saveNoteFor('inquiry', q.id, text, imp)}
                  />
                  {q.handled_at ? (
                    <div className="sb-inq-done">
                      ✓ Javio/la se {q.handled_by ?? ''} · {when(q.handled_at)}
                      <button type="button" onClick={() => markInquiry(q.id, false)} disabled={saving}>
                        Vrati
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="sb-inq-btn" onClick={() => markInquiry(q.id, true)} disabled={saving}>
                      Javio/la sam se kupcu
                    </button>
                  )}
                </div>
              );
            })}
          {data.inquiries.some((q) => q.handled_at) && (
            <button type="button" className="sb-inq-toggle" onClick={() => setShowHandled((v) => !v)}>
              {showHandled ? 'Sakrij obrađene upite' : `Prikaži obrađene upite (${data.inquiries.filter((q) => q.handled_at).length})`}
            </button>
          )}
        </section>
      )}

      <div className="sb-stats" role="group" aria-label="Filter po statusu">
        {UNIT_STATUSES.map((s) => (
          <button key={s} type="button" className="sb-stat" aria-pressed={filter === s} onClick={() => setFilter(filter === s ? null : s)}>
            <b className={`is-${STATUS_KEY[s]}`}>{counts[s]}</b>
            <small>{s === 'available' ? 'slobodnih' : s === 'reserved' ? 'rezervisanih' : 'prodatih'}</small>
          </button>
        ))}
      </div>

      <label className="sb-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8C8E93" strokeWidth="2.4" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Traži stan, npr. 3B" aria-label="Traži stan" autoComplete="off" />
      </label>

      {data.floors.map((f) => {
        const list = data.units.filter((u) => u.floor_id === f.id && visible(u));
        if (!list.length) return null;
        const free = data.units.filter((u) => u.floor_id === f.id && u.status === 'available').length;
        return (
          <section key={f.id} className="sb-floor">
            <h2>
              {f.building ? `${f.building} · ` : ''}
              {floorName(f.level, f.label)}
              <span>{free} slobodno</span>
            </h2>
            {list.map((u) => {
              const d = draftOf(u);
              const dirty = isDirty(u);
              const np = parsePrice(d.price);
              return (
                <div key={u.id} className={`sb-unit${dirty ? ' is-dirty' : ''}${flash === u.id ? ' is-flash' : ''}`}>
                  <div className="sb-unit-top">
                    <b>
                      Stan {u.code}
                      {u.note?.important && <span className="sb-flag" title="Važna beleška">⚑</span>}
                    </b>
                    <small>{[u.structure, u.area_sqm ? `${u.area_sqm} m²` : null].filter(Boolean).join(' · ')}</small>
                  </div>
                  <div className="sb-seg" role="group" aria-label={`Status stana ${u.code}`}>
                    {UNIT_STATUSES.map((s) => (
                      <button key={s} type="button" className={`is-${STATUS_KEY[s]}`} aria-pressed={d.status === s} onClick={() => setDraft(u, { status: s })}>
                        {UNIT_STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                  <div className="sb-price">
                    <label>
                      <input
                        inputMode="numeric"
                        value={d.price}
                        aria-label={`Cena stana ${u.code} u evrima`}
                        placeholder="Cena"
                        disabled={d.status === 'sold'}
                        title={d.status === 'sold' ? 'Cena prodatog stana se ne prikazuje na sajtu' : undefined}
                        onChange={(e) => setDraft(u, { price: e.target.value })}
                        onBlur={(e) => {
                          const n = parsePrice(e.target.value);
                          setDraft(u, { price: fmt(n) });
                        }}
                      />
                    </label>
                    <span className="sb-ppm">{np && u.area_sqm ? `${Math.round(np / u.area_sqm).toLocaleString('sr-RS')} €/m²` : ''}</span>
                  </div>
                  <NoteRow
                    note={u.note}
                    placeholder="Kratko: npr. rezervisan do 20. 10., kapara…"
                    disabled={saving}
                    onSave={(text, imp) => saveNoteFor('unit', u.id, text, imp)}
                  />
                  {dirty && (
                    <div className="sb-confirm">
                      <span>Izmena još nije na sajtu</span>
                      <button type="button" className="is-undo" onClick={() => dropDraft(u.id)}>
                        Poništi
                      </button>
                      <button type="button" className="is-ok" onClick={() => setConfirming(u)}>
                        Potvrdi
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}
      {data.units.length === 0 && <p className="sb-help">U ovom projektu još nema stanova.</p>}
      {data.units.length > 0 && !data.units.some(visible) && <p className="sb-help">Nema stanova za ovu pretragu.</p>}

      {/* Izveštaj po stanu, poslednjih 30 dana - koji stanovi privlače pažnju. */}
      <section className="sb-log">
        <h2>Izveštaj · poslednjih {data.stats.days} dana</h2>
        <div className="sb-stats" style={{ padding: 0 }}>
          <div className="sb-stat">
            <b>{data.stats.visitors}</b>
            <small>posetilaca</small>
          </div>
          <div className="sb-stat">
            <b>{data.stats.unitViews}</b>
            <small>{srPlural(data.stats.unitViews, 'otvaranje stana', 'otvaranja stanova', 'otvaranja stanova')}</small>
          </div>
          <div className="sb-stat">
            <b>{data.stats.inquiries}</b>
            <small>{srPlural(data.stats.inquiries, 'upit', 'upita', 'upita')}</small>
          </div>
        </div>
        {data.stats.units.length > 0 && (
          <ul style={{ marginTop: 8 }}>
            {data.stats.units.slice(0, 8).map((s) => (
              <li key={s.code} className="sb-statrow">
                <b>Stan {s.code}</b>
                <span>
                  {s.views} {srPlural(s.views, 'otvaranje', 'otvaranja', 'otvaranja')}
                  {s.inquiries ? ` · ${s.inquiries} ${srPlural(s.inquiries, 'upit', 'upita', 'upita')}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.changes.length > 0 && (
        <section className="sb-log">
          <h2>Poslednje promene</h2>
          <ul>
            {data.changes.map((c) => (
              <li key={c.id}>
                {changeText(c)}
                <small>
                  {c.actor} · {when(c.created_at)}
                </small>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="sb-help">Menjate samo status i cenu. Za slike, raspored i tekst javite se Kvadrat360. Link je lični - ne prosleđujte ga.</p>

      {confirming && (
        <div className="sb-sheet-bg" onClick={(e) => e.target === e.currentTarget && !saving && setConfirming(null)}>
          <div className="sb-sheet" role="dialog" aria-modal="true" aria-labelledby="sb-sheet-title">
            <h3 id="sb-sheet-title">Stan {confirming.code}: da li ste sigurni?</h3>
            <ul>
              {confirmRows.map((r) => (
                <li key={r.label}>
                  {r.label}: <s>{r.from}</s> → <b>{r.to}</b>
                </li>
              ))}
            </ul>
            <p>
              {becomesSold
                ? 'Na sajtu će pisati „Prodat“, cena se skriva, a dugme za upit nestaje. Možete ga vratiti kad god treba.'
                : 'Izmena se odmah vidi na sajtu.'}
            </p>
            <button type="button" className="is-yes" disabled={saving} onClick={() => save(confirming)}>
              {saving ? 'Čuvam...' : 'Da, potvrđujem'}
            </button>
            <button type="button" className="is-no" disabled={saving} onClick={() => setConfirming(null)}>
              Ne, vrati me
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
