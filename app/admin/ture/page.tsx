'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { FORM, formBtnStyle } from '../../lib/formTheme';
import { embedSnippet } from '../../lib/embedCode';
import TourQrDialog from './TourQrDialog';
import SendToClientDialog from './SendToClientDialog';
import SendLiveLinkDialog from './SendLiveLinkDialog';
import TourVideoLauncher from './TourVideoLauncher';
import TourSnapshotModal from './TourSnapshotModal';
import TourIntroModal from './TourIntroModal';
import TourFormDrawer from './TourFormDrawer';
import TourRowMenu, { type TourRowAction } from './TourRowMenu';
import { CATEGORY_LABELS, EMPTY_FORM, type FormState } from './tourForm';
import { TourFilterBar, formatCreatedDate, useTourListFilter } from './TourListFilters';


type TourRow = {
  slug: string;
  title: string | null;
  title_i18n: unknown;
  agency_name: string | null;
  address: string | null;
  city: string | null;
  /** Filteri na /ture (migracija 012); zatečene ture su prazne. */
  district: string | null;
  structure: string | null;
  area_sqm: number | string | null;
  price: number | string | null;
  /** Tabela osnovnih podataka u Info modalu (migracije 014/015); zatečene ture su prazne. */
  floor: string | null;
  has_elevator: string | null;
  has_basement: string | null;
  heating: string | null;
  build_status: string | null;
  finish_status: string | null;
  terrace: string | null;
  parking: string | null;
  deposit: string | null;
  registration: string | null;
  category: string | null;
  property_type: string | null;
  agent_name: string | null;
  agent_phone: string | null;
  agent_email: string | null;
  /** Krug sa logom na mestu stativa (migracija 027); false = klijent ne želi logo. */
  nadir_logo?: boolean;
  created_at: string | null;
  published: boolean;
  // Nezavisno od `published` - da li je nekretnina i dalje dostupna
  // (migracija 010). Kad nije, posetilac vidi poruku umesto ture.
  status: 'active' | 'rented' | 'sold' | 'paused';
  /** Odgovori na pet pitanja ture (JSONB po jezicima); u formi se menja samo srpski. */
  faq_1_i18n?: unknown;
  faq_2_i18n?: unknown;
  faq_3_i18n?: unknown;
  faq_4_i18n?: unknown;
  faq_5_i18n?: unknown;
  rooms: number;
  roomsWithPanorama: number;
  /** Agentov link za razgledanje uživo (/tour/<slug>?agent=<token>), pravi ga server. */
  liveGuidePath: string;
};

const STATUS_LABELS: Record<TourRow['status'], string> = {
  active: 'Aktivna',
  rented: 'Izdato',
  sold: 'Prodato',
  paused: 'Pauza'
};

/** Srpska množina: 1 tura, 2-4 ture, 5+ (i 11-14) tura. */
function plural(n: number, one: string, few: string, many: string): string {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return one;
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return few;
  return many;
}

/** Srpski tekst iz i18n polja (objekat ili stariji JSON-string). */
function pickSr(raw: unknown): string {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  if (parsed && typeof parsed === 'object') {
    const rec = parsed as Record<string, string>;
    return rec.sr || '';
  }
  return typeof parsed === 'string' ? parsed : '';
}

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
  const [tours, setTours] = useState<TourRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  // Panel sa formom (TourFormDrawer): otvara se na "+ Nova tura" i "Izmeni".
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);
  const [updatingStatusSlug, setUpdatingStatusSlug] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [copiedEmbedSlug, setCopiedEmbedSlug] = useState<string | null>(null);
  // Tura čiji je QR prozor otvoren (Premium: QR kod za oglas, letak i izlog).
  const [qrTour, setQrTour] = useState<TourRow | null>(null);
  const [sendTour, setSendTour] = useState<TourRow | null>(null);
  // Tura čiji je prozor "Link za vođenje uživo" otvoren (mejl agentu ili kopiranje).
  const [liveTour, setLiveTour] = useState<TourRow | null>(null);
  // Tura za koju se pravi kratak video za Instagram/Facebook (Premium).
  const [videoSlug, setVideoSlug] = useState<string | null>(null);
  // Snimak iz ture: slika kadra za oglas/mreže sa bedžom i linkom (TourSnapshotModal).
  const [snapshotSlug, setSnapshotSlug] = useState<string | null>(null);
  // Uvod ture: AI tekst + glas na početku vodiča (TourIntroModal).
  const [introSlug, setIntroSlug] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  // Pretraga, filteri i redosled spiska tura - vidi TourListFilters.tsx.
  const tourFilter = useTourListFilter(tours, pickTitle);
  // Agencije koje već imaju turu - za izbor u formi (AgencyPicker).
  const agencyNames = useMemo(
    () => [...new Set(tours.map((t) => t.agency_name?.trim()).filter((a): a is string => Boolean(a)))].sort((a, b) => a.localeCompare(b, 'sr')),
    [tours]
  );

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

  // Prijavu drži okvir admina (components/admin/AdminShell.tsx).
  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const existingSlugs = useMemo(() => tours.map((t) => t.slug), [tours]);
  const publishedCount = tours.filter((t) => t.published).length;

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    setNotice('');
    setError('');
    setFormError('');
    try {
      const res = await authedFetch('/api/admin/tours', {
        method: editingSlug ? 'PATCH' : 'POST',
        body: JSON.stringify(editingSlug ? { ...form, slug: editingSlug } : form)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.error || 'Nije sačuvano.');
        return;
      }
      setNotice(editingSlug ? 'Izmene su sačuvane.' : `Tura je kreirana: /tour/${json.slug}`);
      // Sačuvano, ali prevod nekog odgovora nije uspeo - vidi buildFaqUpdate.
      if (json.warning) setError(json.warning);
      setForm(EMPTY_FORM);
      setEditingSlug(null);
      setDrawerOpen(false);
      await load();
    } catch {
      setFormError('Nema veze sa serverom.');
    } finally {
      setSaving(false);
    }
  };

  const openNew = () => {
    setEditingSlug(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setNotice('');
    setDrawerOpen(true);
  };

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingSlug(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }, []);

  // Radnje iz menija "⋯" u redu tabele (TourRowMenu).
  const rowAction = (tour: TourRow, action: TourRowAction) => {
    if (action === 'intro') setIntroSlug(tour.slug);
    else if (action === 'send') setSendTour(tour);
    else if (action === 'qr') setQrTour(tour);
    else if (action === 'video') setVideoSlug(tour.slug);
    else if (action === 'snapshot') setSnapshotSlug(tour.slug);
    else if (action === 'embed') void copyEmbedCode(tour);
    else if (action === 'live') setLiveTour(tour);
    else if (action === 'nearby') void refreshNearby(tour);
    else if (action === 'delete') void deleteTour(tour);
  };

  // Objavljivanje se namerno pita pre nego što se uradi: skidanje sa objave
  // obara link koji je možda već podeljen, a objavljivanje pušta turu u
  // sitemap i pred kupce.
  const togglePublished = async (tour: TourRow) => {
    const next = !tour.published;

    if (next && tour.rooms === 0) {
      setError('Tura nema nijednu sobu - nema šta da se objavi.');
      return;
    }
    if (next && tour.roomsWithPanorama < tour.rooms) {
      const ok = confirm(
        `Neke sobe nemaju panoramu (${tour.roomsWithPanorama}/${tour.rooms}). Ipak objaviti turu?`
      );
      if (!ok) return;
    }
    if (!next && !confirm('Skinuti turu sa objave? Podeljeni linkovi prestaju da rade.')) {
      return;
    }

    setTogglingSlug(tour.slug);
    setNotice('');
    setError('');
    try {
      const res = await authedFetch('/api/admin/tours', {
        method: 'PATCH',
        body: JSON.stringify({ slug: tour.slug, published: next })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Stanje nije promenjeno.');
        return;
      }
      setNotice(next ? 'Tura je objavljena.' : 'Tura je vraćena u pripremu.');
      await load();
    } catch {
      setError('Nema veze sa serverom.');
    } finally {
      setTogglingSlug(null);
    }
  };

  // Prelazak sa "Aktivna" na bilo šta drugo se pita, jer odmah sklanja turu
  // sa podeljenih linkova (posetilac vidi poruku umesto ture); povratak na
  // "Aktivna" ne pita ništa - ništa se time ne gubi.
  const updateStatus = async (tour: TourRow, status: TourRow['status']) => {
    if (status === tour.status) return;
    if (
      tour.status === 'active' &&
      !confirm(`Nekretnina "${pickTitle(tour)}" postaje "${STATUS_LABELS[status]}" - posetioci više ne vide turu, samo poruku i kontakt. Nastaviti?`)
    ) {
      return;
    }

    setUpdatingStatusSlug(tour.slug);
    setNotice('');
    setError('');
    try {
      const res = await authedFetch('/api/admin/tours', {
        method: 'PATCH',
        body: JSON.stringify({ slug: tour.slug, status })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Stanje nije promenjeno.');
        return;
      }
      setNotice(`Stanje promenjeno: ${STATUS_LABELS[status]}.`);
      await load();
    } catch {
      setError('Nema veze sa serverom.');
    } finally {
      setUpdatingStatusSlug(null);
    }
  };

  // Trajno brisanje - soba, panorame na R2 i statistika idu sa turom, bez
  // povratka. Zato traži da admin UPIŠE tačan slug (ne samo OK na prozorčić)
  // - isti nivo opreza kao GitHub traži za brisanje repozitorijuma.
  const deleteTour = async (tour: TourRow) => {
    const typed = window.prompt(
      `Ovo TRAJNO briše turu "${pickTitle(tour)}" - sve sobe, panorame i statistiku poseta. Ne može se vratiti.\n\nZa potvrdu, upišite tačan slug ture:\n${tour.slug}`
    );
    if (typed === null) return;
    if (typed.trim() !== tour.slug) {
      alert('Upisani slug se ne poklapa - tura NIJE obrisana.');
      return;
    }

    setDeletingSlug(tour.slug);
    setNotice('');
    setError('');
    try {
      const res = await authedFetch('/api/admin/tours', {
        method: 'DELETE',
        body: JSON.stringify({ slug: tour.slug })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Tura nije obrisana.');
        return;
      }
      setNotice(`Tura "${pickTitle(tour)}" je obrisana.`);
      await load();
    } catch {
      setError('Nema veze sa serverom.');
    } finally {
      setDeletingSlug(null);
    }
  };

  const copyEmbedCode = async (tour: TourRow) => {
    const snippet = embedSnippet(tour.slug);
    try {
      await navigator.clipboard.writeText(snippet);
    } catch {
      // Clipboard može biti nedostupan (starije okruženje, bez dozvole) -
      // prompt sa selektovanim tekstom i dalje daje kopiranje preko Ctrl+C.
      window.prompt('Kod za ugradnju (Ctrl+C, pa Enter):', snippet);
    }
    setCopiedEmbedSlug(tour.slug);
    // Meni "⋯" se zatvara na klik, pa potvrda stoji iznad liste.
    setNotice(`Kod za sajt je kopiran (${pickTitle(tour)}).`);
    setTimeout(() => setCopiedEmbedSlug((cur) => (cur === tour.slug ? null : cur)), 1800);
  };

  // "Osveži okolinu": ponovo pita OpenStreetMap (sama se puni pri čuvanju ture).
  const refreshNearby = async (tour: TourRow) => {
    setNotice('Tražim okolinu…');
    setError('');
    try {
      const res = await authedFetch('/api/admin/tours', {
        method: 'PATCH',
        body: JSON.stringify({ slug: tour.slug, action: 'nearby-refresh' })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setNotice('');
        setError(json.error || 'Okolina nije osvežena.');
        return;
      }
      setNotice(`Okolina je osvežena (${Array.isArray(json.nearby) ? json.nearby.length : 0} mesta).`);
    } catch {
      setNotice('');
      setError('Nema veze sa serverom.');
    }
  };

  const startEdit = (tour: TourRow) => {
    setEditingSlug(tour.slug);
    setNotice('');
    setError('');
    setFormError('');
    setDrawerOpen(true);
    setForm({
      title: pickTitle(tour),
      agency_name: tour.agency_name || '',
      address: tour.address || '',
      city: tour.city || '',
      district: tour.district || '',
      structure: tour.structure || '',
      area_sqm: tour.area_sqm === null || tour.area_sqm === undefined ? '' : String(tour.area_sqm),
      price: tour.price === null || tour.price === undefined ? '' : String(tour.price),
      floor: tour.floor || '',
      has_elevator: tour.has_elevator || '',
      has_basement: tour.has_basement || '',
      heating: tour.heating || '',
      build_status: tour.build_status || '',
      finish_status: tour.finish_status || '',
      terrace: tour.terrace || '',
      parking: tour.parking || '',
      deposit: tour.deposit || '',
      registration: tour.registration || '',
      property_type: tour.property_type || '',
      category: tour.category || 'rent',
      agent_name: tour.agent_name || '',
      agent_phone: tour.agent_phone || '',
      agent_email: tour.agent_email || '',
      nadir_logo: tour.nadir_logo !== false,
      faq: [tour.faq_1_i18n, tour.faq_2_i18n, tour.faq_3_i18n, tour.faq_4_i18n, tour.faq_5_i18n].map(pickSr)
    });
  };

  const wrap: React.CSSProperties = {
    minHeight: '100dvh',
    background: FORM.bg,
    color: FORM.textPrimary,
    fontFamily: FORM.fontBody,
    padding: '24px 20px 64px'
  };

  return (
    <main className="k-form" style={wrap}>
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        <header style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '20px', margin: 0, fontFamily: FORM.fontDisplay }}>Ture</h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: FORM.textSecondary }}>
              {tours.length} {plural(tours.length, 'tura', 'ture', 'tura')} · {publishedCount} {plural(publishedCount, 'objavljena', 'objavljene', 'objavljenih')}
            </p>
          </div>
          <button type="button" onClick={openNew} style={primaryBtn}>
            + Nova tura
          </button>
        </header>

        {notice && <p style={{ margin: '0 0 12px', color: FORM.success, fontSize: '13.5px' }}>{notice}</p>}
        {error && <p style={{ margin: '0 0 12px', color: FORM.danger, fontSize: '13.5px' }}>{error}</p>}

        {loading && <p style={{ color: FORM.textSecondary }}>Učitavanje...</p>}

        <div
          style={{
            background: FORM.surface,
            border: '1px solid ' + FORM.border,
            borderRadius: '16px',
            boxShadow: FORM.shadow,
            overflowX: 'auto'
          }}
        >
          {tours.length > 0 && (
            <TourFilterBar state={tourFilter} total={tours.length} categoryLabels={CATEGORY_LABELS} statusLabels={STATUS_LABELS} />
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr>
                {['Tura', 'Kreirana', 'Stanje', 'Agencija', 'Tip', 'Sobe', ''].map((h, i) => (
                  <th
                    key={h || i}
                    style={{
                      padding: '13px 14px',
                      textAlign: i === 5 ? 'right' : 'left',
                      fontSize: '12px',
                      fontWeight: 700,
                      letterSpacing: '0.3px',
                      textTransform: 'uppercase',
                      color: FORM.textSecondary,
                      borderBottom: '1px solid ' + FORM.border,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tourFilter.visible.map((tour) => {
                const missingPanorama = tour.rooms > 0 && tour.roomsWithPanorama < tour.rooms;
                return (
                  <tr key={tour.slug} style={{ borderBottom: '1px solid ' + FORM.border }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600 }}>{pickTitle(tour)}</div>
                      <div style={{ fontSize: '12px', color: FORM.textMuted, fontFamily: 'monospace' }}>
                        {tour.city ? `${tour.city} · ` : ''}/tour/{tour.slug}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: FORM.textSecondary }}>
                      {formatCreatedDate(tour.created_at)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 9px',
                          borderRadius: '999px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          letterSpacing: '0.2px',
                          whiteSpace: 'nowrap',
                          color: tour.published ? FORM.success : FORM.textSecondary,
                          background: tour.published ? '#eaf7ee' : FORM.surfaceAlt,
                          border: '1px solid ' + (tour.published ? '#c7e8d1' : FORM.border)
                        }}
                      >
                        {tour.published ? 'Objavljena' : 'U pripremi'}
                      </span>
                      {tour.status !== 'active' && (
                        <span
                          style={{
                            display: 'inline-block',
                            marginLeft: '6px',
                            padding: '3px 9px',
                            borderRadius: '999px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            color: '#fff',
                            background: FORM.danger
                          }}
                        >
                          {STATUS_LABELS[tour.status]}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', color: tour.agency_name ? FORM.textPrimary : FORM.textMuted }}>
                      {tour.agency_name || '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {CATEGORY_LABELS[tour.category || 'rent'] || tour.category}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {tour.rooms === 0 ? (
                        <span style={{ color: FORM.danger, fontSize: '13px' }}>nema soba</span>
                      ) : missingPanorama ? (
                        <span style={{ color: FORM.danger, fontSize: '13px' }}>
                          {tour.roomsWithPanorama}/{tour.rooms}
                        </span>
                      ) : (
                        tour.rooms
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => void togglePublished(tour)}
                        disabled={togglingSlug === tour.slug}
                        style={{
                          ...formBtnStyle,
                          padding: '6px 12px',
                          fontSize: '12.5px',
                          marginRight: '6px',
                          ...(tour.published
                            ? {}
                            : { background: FORM.accent, color: FORM.onAccent, borderColor: FORM.accent })
                        }}
                      >
                        {togglingSlug === tour.slug ? '…' : tour.published ? 'Skini' : 'Objavi'}
                      </button>
                      <button
                        onClick={() => startEdit(tour)}
                        style={{ ...formBtnStyle, padding: '6px 12px', fontSize: '12.5px', marginRight: '6px' }}
                      >
                        Izmeni
                      </button>
                      <a
                        href={`/tour/${tour.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ ...formBtnStyle, padding: '6px 12px', fontSize: '12.5px', textDecoration: 'none', marginRight: '6px' }}
                      >
                        Otvori ↗
                      </a>
                      <TourRowMenu
                        slug={tour.slug}
                        status={tour.status}
                        statusLabels={STATUS_LABELS}
                        embedCopied={copiedEmbedSlug === tour.slug}
                        noPanorama={tour.roomsWithPanorama === 0}
                        busy={deletingSlug === tour.slug || updatingStatusSlug === tour.slug}
                        onAction={(action) => rowAction(tour, action)}
                        onStatus={(status) => void updateStatus(tour, status)}
                      />
                    </td>
                  </tr>
                );
              })}
              {tours.length > 0 && tourFilter.visible.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '22px 14px', textAlign: 'center', color: FORM.textSecondary }}>
                    Nijedna tura ne odgovara filterima.{' '}
                    <button type="button" onClick={tourFilter.reset} style={{ ...formBtnStyle, padding: '5px 10px', fontSize: '12.5px', marginLeft: '6px' }}>
                      Poništi filtere
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p style={{ marginTop: '14px', fontSize: '12.5px', color: FORM.textMuted }}>
          Ostale radnje su u meniju {"„⋯“"}: sadržaj ture (sobe, plan, uvod), deljenje (klijentu, QR, video, snimak, kod za sajt), stanje nekretnine i brisanje.
          Crveno kod broja soba znači da neka soba nema panoramu. Nova tura kreće {"„u pripremi“"} — link radi samo tebi dok je ne objaviš.
        </p>
      </div>
      <TourFormDrawer
        open={drawerOpen}
        editingSlug={editingSlug}
        form={form}
        onChange={setForm}
        agencies={agencyNames}
        existingSlugs={existingSlugs}
        saving={saving}
        error={formError}
        onSave={() => void handleSave()}
        onClose={closeDrawer}
      />
      {videoSlug && <TourVideoLauncher slug={videoSlug} onClose={() => setVideoSlug(null)} />}
      {snapshotSlug && <TourSnapshotModal slug={snapshotSlug} onClose={() => setSnapshotSlug(null)} />}
      {introSlug && <TourIntroModal slug={introSlug} onClose={() => setIntroSlug(null)} />}
      {qrTour && (
        <TourQrDialog
          slug={qrTour.slug}
          title={pickTitle(qrTour)}
          published={Boolean(qrTour.published)}
          onClose={() => setQrTour(null)}
        />
      )}
      {sendTour && (
        <SendToClientDialog
          slug={sendTour.slug}
          title={pickTitle(sendTour)}
          published={Boolean(sendTour.published) && sendTour.status === 'active'}
          defaultTo={sendTour.agent_email || ''}
          defaultName={(sendTour.agent_name || '').split(/\s+/)[0] || ''}
          onClose={() => setSendTour(null)}
          onSent={(to) => {
            // Prozor ostaje otvoren i sam prikazuje "Poslato" - ovde samo trag na vrhu strane.
            setError('');
            setNotice(`Mejl „Vaša tura je gotova“ je poslat na ${to}.`);
          }}
        />
      )}
      {liveTour && (
        <SendLiveLinkDialog
          slug={liveTour.slug}
          title={pickTitle(liveTour)}
          published={Boolean(liveTour.published) && liveTour.status === 'active'}
          guidePath={liveTour.liveGuidePath}
          defaultTo={liveTour.agent_email || ''}
          defaultName={(liveTour.agent_name || '').split(/\s+/)[0] || ''}
          onClose={() => setLiveTour(null)}
          onSent={(to) => {
            setError('');
            setNotice(`Link za vođenje uživo je poslat na ${to}.`);
          }}
        />
      )}
    </main>
  );
}

const primaryBtn: React.CSSProperties = {
  ...formBtnStyle,
  background: FORM.accent,
  color: FORM.onAccent,
  borderColor: FORM.accent,
  padding: '11px 18px',
  fontSize: '14px'
};
