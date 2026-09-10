'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { THEME, btnStyle } from '../../tour/[slug]/theme';
import { Logo } from '../../tour/[slug]/Logo';

type RoomStat = {
  roomId: string;
  title: string;
  views: number;
  totalMs: number;
  avgMs: number;
};

type TourStat = {
  slug: string;
  title: string;
  agency: string | null;
  opens: number;
  uniqueVisitors: number;
  starts: number;
  startRate: number;
  shares: number;
  contacts: number;
  rooms: RoomStat[];
};

type SortKey = 'title' | 'opens' | 'uniqueVisitors' | 'startRate' | 'shares' | 'contacts';

const PERIODS = [
  { days: 7, label: '7 dana' },
  { days: 30, label: '30 dana' },
  { days: 90, label: '90 dana' }
];

const COLUMNS: { key: SortKey; label: string; numeric: boolean; hint: string }[] = [
  { key: 'title', label: 'Tura', numeric: false, hint: 'Naziv ture' },
  { key: 'opens', label: 'Otvaranja', numeric: true, hint: 'Koliko je puta link otvoren' },
  { key: 'uniqueVisitors', label: 'Posetilaca', numeric: true, hint: 'Različiti posetioci' },
  { key: 'startRate', label: 'Ušlo', numeric: true, hint: 'Udeo posetilaca koji su pokrenuli turu' },
  { key: 'shares', label: 'Deljenja', numeric: true, hint: 'Klikovi na deljenje ture' },
  { key: 'contacts', label: 'Kontakt', numeric: true, hint: 'Otvaranja kontakt prozora' }
];

function formatDuration(ms: number): string {
  if (!ms) return '—';
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m ${seconds}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function AnalyticsPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [days, setDays] = useState(30);
  const [tours, setTours] = useState<TourStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'opens',
    dir: 'desc'
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(Boolean(session));
      setCheckingSession(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(Boolean(session));
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) {
        setLoggedIn(false);
        return;
      }
      const res = await fetch(`/api/analytics?days=${days}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
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
  }, [days]);

  useEffect(() => {
    if (loggedIn) void load();
  }, [loggedIn, load]);

  const totals = useMemo(() => {
    const sum = tours.reduce(
      (acc, t) => ({
        opens: acc.opens + t.opens,
        uniqueVisitors: acc.uniqueVisitors + t.uniqueVisitors,
        shares: acc.shares + t.shares,
        contacts: acc.contacts + t.contacts,
        // Prosek udela se računa preko posetilaca, ne kao prosek procenata -
        // inače bi tura sa 2 posete imala istu težinu kao ona sa 200.
        started: acc.started + Math.round((t.startRate / 100) * t.uniqueVisitors)
      }),
      { opens: 0, uniqueVisitors: 0, shares: 0, contacts: 0, started: 0 }
    );
    return {
      ...sum,
      startRate: sum.uniqueVisitors ? Math.round((sum.started / sum.uniqueVisitors) * 100) : 0,
      activeTours: tours.filter((t) => t.opens > 0).length
    };
  }, [tours]);

  const sorted = useMemo(() => {
    const list = [...tours];
    list.sort((a, b) => {
      if (sort.key === 'title') {
        const cmp = (a.title || a.slug).localeCompare(b.title || b.slug, 'sr');
        return sort.dir === 'asc' ? cmp : -cmp;
      }
      const diff = (a[sort.key] as number) - (b[sort.key] as number);
      return sort.dir === 'asc' ? diff : -diff;
    });
    return list;
  }, [tours, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'title' ? 'asc' : 'desc' }
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) setLoginError('Prijava nije uspela. Proverite email i lozinku.');
    setLoggingIn(false);
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
          onSubmit={handleLogin}
          style={{
            background: THEME.surface,
            border: '1px solid ' + THEME.border,
            borderRadius: '18px',
            padding: '28px',
            width: '100%',
            maxWidth: '380px',
            boxShadow: THEME.shadow,
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          <Logo />
          <h1 style={{ fontSize: '19px', margin: '4px 0 0', fontFamily: THEME.fontDisplay }}>
            Analitika
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: THEME.textSecondary }}>
            Prijavite se administratorskim nalogom.
          </p>
          <input
            id="analytics-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            required
            style={inputStyle}
          />
          <input
            id="analytics-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="lozinka"
            required
            style={inputStyle}
          />
          {loginError && (
            <p style={{ margin: 0, color: THEME.danger, fontSize: '13px' }}>{loginError}</p>
          )}
          <button
            type="submit"
            disabled={loggingIn}
            style={{
              ...btnStyle,
              background: THEME.accent,
              color: '#fff',
              borderColor: THEME.accent,
              padding: '11px',
              fontSize: '14px'
            }}
          >
            {loggingIn ? 'Prijava...' : 'Prijavi se'}
          </button>
        </form>
      </main>
    );
  }

  const hasData = tours.some((t) => t.opens > 0);

  return (
    <main style={wrap}>
      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
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
            <h1 style={{ fontSize: '20px', margin: 0, fontFamily: THEME.fontDisplay }}>Analitika</h1>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                style={{
                  ...btnStyle,
                  padding: '7px 14px',
                  fontSize: '13px',
                  background: days === p.days ? THEME.accent : THEME.surface,
                  color: days === p.days ? '#fff' : THEME.textPrimary,
                  borderColor: days === p.days ? THEME.accent : THEME.border
                }}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => supabase.auth.signOut()}
              style={{ ...btnStyle, padding: '7px 14px', fontSize: '13px' }}
            >
              Odjava
            </button>
          </div>
        </header>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px',
            marginBottom: '18px'
          }}
        >
          <Metric label="Otvaranja" value={totals.opens} />
          <Metric label="Posetilaca" value={totals.uniqueVisitors} />
          <Metric label="Ušlo u turu" value={`${totals.startRate}%`} />
          <Metric label="Deljenja" value={totals.shares} />
          <Metric label="Kontakt" value={totals.contacts} />
          <Metric label="Aktivnih tura" value={`${totals.activeTours}/${tours.length}`} />
        </section>

        {loading && <p style={{ color: THEME.textSecondary }}>Učitavanje...</p>}
        {error && <p style={{ color: THEME.danger }}>{error}</p>}

        {!loading && !error && !hasData && (
          <div
            style={{
              background: THEME.surface,
              border: '1px solid ' + THEME.border,
              borderRadius: '16px',
              padding: '28px',
              textAlign: 'center',
              color: THEME.textSecondary,
              boxShadow: THEME.shadow
            }}
          >
            Još nema zabeleženih poseta u ovom periodu. Podaci se pojavljuju čim neko otvori turu.
            <br />
            <span style={{ fontSize: '13px' }}>
              Tvoje posete se ne broje dok si prijavljen kao administrator.
            </span>
          </div>
        )}

        {!loading && !error && hasData && (
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
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      title={col.hint}
                      style={{
                        padding: '13px 14px',
                        textAlign: col.numeric ? 'right' : 'left',
                        fontSize: '12px',
                        fontWeight: 700,
                        letterSpacing: '0.3px',
                        textTransform: 'uppercase',
                        color: sort.key === col.key ? THEME.accent : THEME.textSecondary,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        borderBottom: '1px solid ' + THEME.border,
                        userSelect: 'none'
                      }}
                    >
                      {col.label}
                      {sort.key === col.key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((tour) => {
                  const isOpen = expanded === tour.slug;
                  const quiet = tour.opens === 0;
                  return (
                    <Fragment key={tour.slug}>
                      <tr
                        onClick={() => setExpanded(isOpen ? null : tour.slug)}
                        style={{
                          borderBottom: '1px solid ' + THEME.border,
                          cursor: 'pointer',
                          background: isOpen ? THEME.accentSoft : 'transparent',
                          color: quiet ? THEME.textMuted : THEME.textPrimary
                        }}
                      >
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                          <span style={{ color: THEME.textMuted, marginRight: '8px' }}>
                            {isOpen ? '▾' : '▸'}
                          </span>
                          {tour.title || tour.slug}
                        </td>
                        <td style={numCell}>{tour.opens}</td>
                        <td style={numCell}>{tour.uniqueVisitors}</td>
                        <td style={numCell}>
                          <StartRate value={tour.startRate} muted={quiet} />
                        </td>
                        <td style={numCell}>{tour.shares}</td>
                        <td style={numCell}>{tour.contacts}</td>
                      </tr>

                      {isOpen && (
                        <tr>
                          <td colSpan={COLUMNS.length} style={{ padding: 0 }}>
                            <div
                              style={{
                                background: THEME.surfaceAlt,
                                borderBottom: '1px solid ' + THEME.border,
                                padding: '16px 18px'
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'baseline',
                                  marginBottom: '10px',
                                  gap: '10px',
                                  flexWrap: 'wrap'
                                }}
                              >
                                <strong style={{ fontSize: '13px' }}>Vreme po prostoriji</strong>
                                <a
                                  href={`/tour/${tour.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ fontSize: '13px', color: THEME.accent, textDecoration: 'none' }}
                                >
                                  otvori turu →
                                </a>
                              </div>

                              {tour.rooms.length === 0 ? (
                                <p style={{ margin: 0, fontSize: '13px', color: THEME.textSecondary }}>
                                  Niko još nije ušao u prostorije ove ture.
                                </p>
                              ) : (
                                <table
                                  style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}
                                >
                                  <thead>
                                    <tr style={{ color: THEME.textSecondary, textAlign: 'left' }}>
                                      <th style={subCell}>Prostorija</th>
                                      <th style={{ ...subCell, textAlign: 'right' }}>Pregleda</th>
                                      <th style={{ ...subCell, textAlign: 'right' }}>Ukupno</th>
                                      <th style={{ ...subCell, textAlign: 'right' }}>Prosek</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {tour.rooms.map((room) => (
                                      <tr
                                        key={room.roomId}
                                        style={{ borderTop: '1px solid ' + THEME.border }}
                                      >
                                        <td style={subCell}>{room.title}</td>
                                        <td style={{ ...subCell, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                          {room.views}
                                        </td>
                                        <td style={{ ...subCell, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                          {formatDuration(room.totalMs)}
                                        </td>
                                        <td style={{ ...subCell, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                          {formatDuration(room.avgMs)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p style={{ marginTop: '14px', fontSize: '12.5px', color: THEME.textMuted }}>
          Klikni na red da vidiš prostorije. Klikni na zaglavlje kolone da sortiraš.
        </p>
      </div>
    </main>
  );
}

// Udeo se čita brže kad ima i traku uz broj - odmah se vidi koja tura
// zadržava posetioca, a koja ih gubi na početnom ekranu.
function StartRate({ value, muted }: { value: number; muted: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
      <span
        style={{
          width: '46px',
          height: '5px',
          borderRadius: '999px',
          background: THEME.border,
          overflow: 'hidden',
          display: 'inline-flex'
        }}
      >
        <span
          style={{
            width: `${Math.min(value, 100)}%`,
            background: muted ? THEME.textMuted : THEME.accent,
            display: 'block'
          }}
        />
      </span>
      <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: '38px' }}>{value}%</span>
    </span>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      style={{
        background: THEME.surface,
        border: '1px solid ' + THEME.border,
        borderRadius: '12px',
        padding: '12px 14px',
        boxShadow: THEME.shadow
      }}
    >
      <div style={{ fontSize: '11px', color: THEME.textSecondary, letterSpacing: '0.4px' }}>
        {label}
      </div>
      <div
        style={{
          fontSize: '22px',
          fontWeight: 800,
          fontFamily: THEME.fontDisplay,
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {value}
      </div>
    </div>
  );
}

const numCell: React.CSSProperties = {
  padding: '12px 14px',
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap'
};

const subCell: React.CSSProperties = { padding: '7px 6px', fontWeight: 500 };

const inputStyle: React.CSSProperties = {
  padding: '11px 12px',
  borderRadius: '10px',
  border: '1px solid ' + THEME.border,
  fontSize: '14px',
  fontFamily: 'inherit',
  background: THEME.surfaceAlt,
  color: THEME.textPrimary
};
