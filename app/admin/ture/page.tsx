'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { THEME, btnStyle } from '../../tour/[slug]/theme';
import { Logo } from '../../tour/[slug]/Logo';
import { slugify } from '../../lib/slug';

type TourRow = {
  slug: string;
  title: string | null;
  title_i18n: unknown;
  agency_name: string | null;
  address: string | null;
  category: string | null;
  property_type: string | null;
  agent_name: string | null;
  agent_phone: string | null;
  agent_email: string | null;
  created_at: string | null;
  rooms: number;
  roomsWithPanorama: number;
};

type FormState = {
  title: string;
  agency_name: string;
  address: string;
  property_type: string;
  category: string;
  agent_name: string;
  agent_phone: string;
  agent_email: string;
};

const EMPTY_FORM: FormState = {
  title: '',
  agency_name: '',
  address: '',
  property_type: '',
  category: 'rent',
  agent_name: '',
  agent_phone: '',
  agent_email: ''
};

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Izdavanje',
  sale: 'Prodaja',
  booking: 'Kratkoročni smeštaj'
};

function pickTitle(row: TourRow): string {
  const raw = row.title_i18n;
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return raw || row.title || row.slug;
    }
  }
  if (parsed && typeof parsed === 'object') {
    const rec = parsed as Record<string, string>;
    return rec.sr || Object.values(rec)[0] || row.title || row.slug;
  }
  return row.title || row.slug;
}

export default function ToursAdminPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [tours, setTours] = useState<TourRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(Boolean(session));
      setCheckingSession(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoggedIn(Boolean(session));
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const authedFetch = useCallback(async (input: string, init?: RequestInit) => {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) throw new Error('nema sesije');
    return fetch(input, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      }
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authedFetch('/api/admin/tours');
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Greška pri učitavanju.');
        return;
      }
      setTours(json.tours);
    } catch {
      setError('Nema veze sa serverom.');
    } finally {
      setLoading(false);
    }
  }, [authedFetch]);

  useEffect(() => {
    if (loggedIn) void load();
  }, [loggedIn, load]);

  const previewSlug = useMemo(() => slugify(form.title), [form.title]);
  const slugTaken = useMemo(
    () => !editingSlug && previewSlug !== '' && tours.some((t) => t.slug === previewSlug),
    [previewSlug, tours, editingSlug]
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const res = await authedFetch('/api/admin/tours', {
        method: editingSlug ? 'PATCH' : 'POST',
        body: JSON.stringify(editingSlug ? { ...form, slug: editingSlug } : form)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Nije sačuvano.');
        return;
      }
      setNotice(editingSlug ? 'Izmene su sačuvane.' : `Tura je kreirana: /tour/${json.slug}`);
      setForm(EMPTY_FORM);
      setEditingSlug(null);
      await load();
    } catch {
      setError('Nema veze sa serverom.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (tour: TourRow) => {
    setEditingSlug(tour.slug);
    setNotice('');
    setError('');
    setForm({
      title: pickTitle(tour),
      agency_name: tour.agency_name || '',
      address: tour.address || '',
      property_type: tour.property_type || '',
      category: tour.category || 'rent',
      agent_name: tour.agent_name || '',
      agent_phone: tour.agent_phone || '',
      agent_email: tour.agent_email || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const wrap: React.CSSProperties = {
    minHeight: '100dvh',
    background: THEME.bg,
    color: THEME.textPrimary,
    fontFamily: THEME.fontBody,
    padding: '24px 20px 64px'
  };

  if (checkingSession) {
    return (
      <main style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: THEME.textSecondary }}>Provera pristupa...</p>
      </main>
    );
  }

  if (!loggedIn) {
    return (
      <main style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setLoggingIn(true);
            setLoginError('');
            const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
            if (authError) setLoginError('Prijava nije uspela. Proverite email i lozinku.');
            setLoggingIn(false);
          }}
          style={cardStyle}
        >
          <Logo />
          <h1 style={{ fontSize: '19px', margin: '4px 0 0', fontFamily: THEME.fontDisplay }}>Ture</h1>
          <p style={{ margin: 0, fontSize: '14px', color: THEME.textSecondary }}>
            Prijavite se administratorskim nalogom.
          </p>
          <input
            id="tours-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            required
            style={inputStyle}
          />
          <input
            id="tours-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="lozinka"
            required
            style={inputStyle}
          />
          {loginError && <p style={{ margin: 0, color: THEME.danger, fontSize: '13px' }}>{loginError}</p>}
          <button type="submit" disabled={loggingIn} style={primaryBtn}>
            {loggingIn ? 'Prijava...' : 'Prijavi se'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main style={wrap}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '14px',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Logo />
            <h1 style={{ fontSize: '20px', margin: 0, fontFamily: THEME.fontDisplay }}>Ture</h1>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <a href="/admin/analitika" style={{ ...btnStyle, padding: '7px 14px', fontSize: '13px', textDecoration: 'none' }}>
              Analitika
            </a>
            <button onClick={() => supabase.auth.signOut()} style={{ ...btnStyle, padding: '7px 14px', fontSize: '13px' }}>
              Odjava
            </button>
          </div>
        </header>

        <form onSubmit={handleSave} style={{ ...cardStyle, maxWidth: 'none', marginBottom: '22px' }}>
          <h2 style={{ fontSize: '15px', margin: 0, fontFamily: THEME.fontDisplay }}>
            {editingSlug ? `Izmena ture: ${editingSlug}` : 'Nova tura'}
          </h2>

          <Field label="Naslov oglasa" hint="Ovo vidi klijent kad podeli turu.">
            <input
              id="tour-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="npr. Dvosoban 54 m² — Kragujevac, Maglićka"
              required
              style={inputStyle}
            />
          </Field>

          {!editingSlug && form.title && (
            <p style={{ margin: '-6px 0 0', fontSize: '12.5px', color: slugTaken ? THEME.danger : THEME.textSecondary }}>
              Link:&nbsp;
              <code style={{ fontFamily: 'monospace' }}>kvadrat360.com/tour/{previewSlug || '...'}</code>
              {slugTaken && ' — već postoji, dodaće se broj na kraj.'}
            </p>
          )}
          {editingSlug && (
            <p style={{ margin: '-6px 0 0', fontSize: '12.5px', color: THEME.textSecondary }}>
              Link se ne menja pri izmeni — podeljeni linkovi i analitika ostaju vezani za njega.
            </p>
          )}

          <div style={twoCol}>
            <Field label="Agencija">
              <input
                id="tour-agency"
                value={form.agency_name}
                onChange={(e) => setForm({ ...form, agency_name: e.target.value })}
                style={inputStyle}
              />
            </Field>
            <Field label="Tip oglasa">
              <select
                id="tour-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={inputStyle}
              >
                <option value="rent">Izdavanje</option>
                <option value="sale">Prodaja</option>
                <option value="booking">Kratkoročni smeštaj</option>
              </select>
            </Field>
          </div>

          <div style={twoCol}>
            <Field label="Adresa">
              <input
                id="tour-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                style={inputStyle}
              />
            </Field>
            <Field label="Tip nekretnine" hint="npr. Dvosoban stan">
              <input
                id="tour-property-type"
                value={form.property_type}
                onChange={(e) => setForm({ ...form, property_type: e.target.value })}
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={twoCol}>
            <Field label="Agent">
              <input
                id="tour-agent-name"
                value={form.agent_name}
                onChange={(e) => setForm({ ...form, agent_name: e.target.value })}
                style={inputStyle}
              />
            </Field>
            <Field label="Telefon agenta">
              <input
                id="tour-agent-phone"
                value={form.agent_phone}
                onChange={(e) => setForm({ ...form, agent_phone: e.target.value })}
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Email agenta">
            <input
              id="tour-agent-email"
              type="email"
              value={form.agent_email}
              onChange={(e) => setForm({ ...form, agent_email: e.target.value })}
              style={inputStyle}
            />
          </Field>

          {error && <p style={{ margin: 0, color: THEME.danger, fontSize: '13px' }}>{error}</p>}
          {notice && <p style={{ margin: 0, color: THEME.success, fontSize: '13px' }}>{notice}</p>}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="submit" disabled={saving} style={primaryBtn}>
              {saving ? 'Čuvanje...' : editingSlug ? 'Sačuvaj izmene' : 'Kreiraj turu'}
            </button>
            {editingSlug && (
              <button
                type="button"
                onClick={() => {
                  setEditingSlug(null);
                  setForm(EMPTY_FORM);
                  setNotice('');
                }}
                style={{ ...btnStyle, padding: '11px 16px', fontSize: '14px' }}
              >
                Otkaži
              </button>
            )}
          </div>
        </form>

        {loading && <p style={{ color: THEME.textSecondary }}>Učitavanje...</p>}

        <div
          style={{
            background: THEME.surface,
            border: '1px solid ' + THEME.border,
            borderRadius: '16px',
            boxShadow: THEME.shadow,
            overflowX: 'auto'
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr>
                {['Tura', 'Agencija', 'Tip', 'Sobe', ''].map((h, i) => (
                  <th
                    key={h || i}
                    style={{
                      padding: '13px 14px',
                      textAlign: i === 3 ? 'right' : 'left',
                      fontSize: '12px',
                      fontWeight: 700,
                      letterSpacing: '0.3px',
                      textTransform: 'uppercase',
                      color: THEME.textSecondary,
                      borderBottom: '1px solid ' + THEME.border,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tours.map((tour) => {
                const missingPanorama = tour.rooms > 0 && tour.roomsWithPanorama < tour.rooms;
                return (
                  <tr key={tour.slug} style={{ borderBottom: '1px solid ' + THEME.border }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600 }}>{pickTitle(tour)}</div>
                      <div style={{ fontSize: '12px', color: THEME.textMuted, fontFamily: 'monospace' }}>
                        /tour/{tour.slug}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: tour.agency_name ? THEME.textPrimary : THEME.textMuted }}>
                      {tour.agency_name || '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {CATEGORY_LABELS[tour.category || 'rent'] || tour.category}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {tour.rooms === 0 ? (
                        <span style={{ color: THEME.danger, fontSize: '13px' }}>nema soba</span>
                      ) : missingPanorama ? (
                        <span style={{ color: THEME.danger, fontSize: '13px' }}>
                          {tour.roomsWithPanorama}/{tour.rooms}
                        </span>
                      ) : (
                        tour.rooms
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => startEdit(tour)}
                        style={{ ...btnStyle, padding: '6px 12px', fontSize: '12.5px', marginRight: '6px' }}
                      >
                        Izmeni
                      </button>
                      <a
                        href={`/tour/${tour.slug}?admin=1`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ ...btnStyle, padding: '6px 12px', fontSize: '12.5px', textDecoration: 'none' }}
                      >
                        Uredi sadržaj
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p style={{ marginTop: '14px', fontSize: '12.5px', color: THEME.textMuted }}>
          „Uredi sadržaj" otvara turu u admin režimu, gde se dodaju sobe, panorame i hotspotovi.
          Crveno kod broja soba znači da neka soba nema panoramu.
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <span style={{ fontSize: '12.5px', fontWeight: 600, color: THEME.textSecondary }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: '11.5px', color: THEME.textMuted }}>{hint}</span>}
    </label>
  );
}

const cardStyle: React.CSSProperties = {
  background: THEME.surface,
  border: '1px solid ' + THEME.border,
  borderRadius: '18px',
  padding: '22px',
  width: '100%',
  maxWidth: '380px',
  boxShadow: THEME.shadow,
  display: 'flex',
  flexDirection: 'column',
  gap: '14px'
};

const twoCol: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '12px'
};

const inputStyle: React.CSSProperties = {
  padding: '11px 12px',
  borderRadius: '10px',
  border: '1px solid ' + THEME.border,
  fontSize: '14px',
  fontFamily: 'inherit',
  background: THEME.surfaceAlt,
  color: THEME.textPrimary,
  width: '100%'
};

const primaryBtn: React.CSSProperties = {
  ...btnStyle,
  background: THEME.accent,
  color: '#fff',
  borderColor: THEME.accent,
  padding: '11px 18px',
  fontSize: '14px'
};
