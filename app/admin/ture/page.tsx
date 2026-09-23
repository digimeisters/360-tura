'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { FORM, FormThemeStyle, formBtnStyle } from '../../lib/formTheme';
import { Logo } from '../../tour/[slug]/Logo';
import { slugify } from '../../lib/slug';
import { SITE_URL } from '../../lib/site';
import {
  STRUCTURE_ORDER,
  HEATING_OPTIONS,
  YES_NO,
  BUILD_STATUS_OPTIONS,
  FINISH_STATUS_OPTIONS,
  neighbourhoodsFor
} from '../../lib/propertyTaxonomy';
import { categoryQuestions } from '../../tour/[slug]/translations';

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
  category: string | null;
  property_type: string | null;
  agent_name: string | null;
  agent_phone: string | null;
  agent_email: string | null;
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
};

const STATUS_LABELS: Record<TourRow['status'], string> = {
  active: 'Aktivna',
  rented: 'Izdato',
  sold: 'Prodato',
  paused: 'Pauza'
};

type FormState = {
  title: string;
  agency_name: string;
  address: string;
  city: string;
  district: string;
  structure: string;
  area_sqm: string;
  price: string;
  floor: string;
  has_elevator: string;
  has_basement: string;
  heating: string;
  build_status: string;
  finish_status: string;
  property_type: string;
  category: string;
  agent_name: string;
  agent_phone: string;
  agent_email: string;
  /** Srpski odgovori na pet pitanja - samo pri izmeni postojeće ture. */
  faq: string[];
};

const EMPTY_FORM: FormState = {
  title: '',
  agency_name: '',
  address: '',
  city: '',
  district: '',
  structure: '',
  area_sqm: '',
  price: '',
  floor: '',
  has_elevator: '',
  has_basement: '',
  heating: '',
  build_status: '',
  finish_status: '',
  property_type: '',
  category: 'rent',
  agent_name: '',
  agent_phone: '',
  agent_email: '',
  faq: ['', '', '', '', '']
};

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Izdavanje',
  sale: 'Prodaja',
  booking: 'Stan na dan'
};

/**
 * Kod za ugradnju ture na sajt agencije (obećano na sajtu i u ponudama -
 * vidi HomePage.tsx, FAQ, agencyCopy.ts). `allow` sa senzorima je bitan:
 * bez njega bi žiroskop i ceo ekran ćutali kad je tura ugrađena na TUĐEM
 * domenu, jer pregledač po difoltu ne prosleđuje te dozvole u iframe.
 */
function embedSnippet(slug: string): string {
  const url = `${SITE_URL}/tour/${slug}`;
  return `<iframe src="${url}" width="100%" height="600" style="border:0;border-radius:12px;overflow:hidden" allow="fullscreen; accelerometer; gyroscope; magnetometer" allowfullscreen loading="lazy"></iframe>`;
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
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);
  const [updatingStatusSlug, setUpdatingStatusSlug] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [copiedEmbedSlug, setCopiedEmbedSlug] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  // Tajni linkovi mesečnih izveštaja (lib/agencyReport.ts) - potpisuje ih server.
  const [agencyReports, setAgencyReports] = useState<{ agency: string; tours: number; path: string }[]>([]);
  const [copiedReport, setCopiedReport] = useState<string | null>(null);

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
      setAgencyReports(json.agencyReports ?? []);
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
      // Sačuvano, ali prevod nekog odgovora nije uspeo - vidi buildFaqUpdate.
      if (json.warning) setError(json.warning);
      setForm(EMPTY_FORM);
      setEditingSlug(null);
      await load();
    } catch {
      setError('Nema veze sa serverom.');
    } finally {
      setSaving(false);
    }
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
    setTimeout(() => setCopiedEmbedSlug((cur) => (cur === tour.slug ? null : cur)), 1800);
  };

  const startEdit = (tour: TourRow) => {
    setEditingSlug(tour.slug);
    setNotice('');
    setError('');
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
      property_type: tour.property_type || '',
      category: tour.category || 'rent',
      agent_name: tour.agent_name || '',
      agent_phone: tour.agent_phone || '',
      agent_email: tour.agent_email || '',
      faq: [tour.faq_1_i18n, tour.faq_2_i18n, tour.faq_3_i18n, tour.faq_4_i18n, tour.faq_5_i18n].map(pickSr)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const districtOptions = neighbourhoodsFor(form.city);
  // Zatečena struktura koje nema u listi (ručni unos, preimenovana stavka)
  // ne sme tiho da se izgubi kad se tura sačuva iz ovog formulara.
  const structureOptions = STRUCTURE_ORDER.includes(form.structure) || !form.structure
    ? STRUCTURE_ORDER
    : [form.structure, ...STRUCTURE_ORDER];

  const wrap: React.CSSProperties = {
    minHeight: '100dvh',
    background: FORM.bg,
    color: FORM.textPrimary,
    fontFamily: FORM.fontBody,
    padding: '24px 20px 64px'
  };

  if (checkingSession) {
    return (
      <main className="k-form" style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <FormThemeStyle />
        <p style={{ color: FORM.textSecondary }}>Provera pristupa...</p>
      </main>
    );
  }

  if (!loggedIn) {
    return (
      <main className="k-form" style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <FormThemeStyle />
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
          <h1 style={{ fontSize: '19px', margin: '4px 0 0', fontFamily: FORM.fontDisplay }}>Ture</h1>
          <p style={{ margin: 0, fontSize: '14px', color: FORM.textSecondary }}>
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
          {loginError && <p style={{ margin: 0, color: FORM.danger, fontSize: '13px' }}>{loginError}</p>}
          <button type="submit" disabled={loggingIn} style={primaryBtn}>
            {loggingIn ? 'Prijava...' : 'Prijavi se'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="k-form" style={wrap}>
      <FormThemeStyle />
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
            <h1 style={{ fontSize: '20px', margin: 0, fontFamily: FORM.fontDisplay }}>Ture</h1>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <a href="/admin/analitika" style={{ ...formBtnStyle, padding: '7px 14px', fontSize: '13px', textDecoration: 'none' }}>
              Analitika
            </a>
            <button onClick={() => supabase.auth.signOut()} style={{ ...formBtnStyle, padding: '7px 14px', fontSize: '13px' }}>
              Odjava
            </button>
          </div>
        </header>

        {/* Mesečni izveštaj za agenciju: tajni link, agencija vidi samo svoje
            ture (posete, ulazak u turu, kontakt, zahtevi za razgledanje). */}
        {agencyReports.length > 0 && (
          <section style={{ ...cardStyle, maxWidth: 'none', marginBottom: '22px' }}>
            <h2 style={{ fontSize: '15px', margin: 0, fontFamily: FORM.fontDisplay }}>Izveštaji za agencije</h2>
            <p style={{ margin: 0, fontSize: '12.5px', color: FORM.textSecondary }}>
              Pošaljite agenciji njen link - vidi samo svoje ture, po mesecima, bez prijave. Link ne ističe.
            </p>
            {agencyReports.map((r) => (
              <div key={r.agency} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', borderTop: `1px solid ${FORM.border}`, paddingTop: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>
                  {r.agency} <span style={{ color: FORM.textSecondary, fontWeight: 400 }}>· {r.tours} {r.tours === 1 ? 'tura' : r.tours < 5 ? 'ture' : 'tura'}</span>
                </span>
                <span style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={async () => {
                      const link = `${SITE_URL}${r.path}`;
                      try {
                        await navigator.clipboard.writeText(link);
                      } catch {
                        window.prompt('Link izveštaja (Ctrl+C, pa Enter):', link);
                      }
                      setCopiedReport(r.agency);
                      setTimeout(() => setCopiedReport((cur) => (cur === r.agency ? null : cur)), 1800);
                    }}
                    style={{ ...formBtnStyle, padding: '6px 12px', fontSize: '12.5px' }}
                  >
                    {copiedReport === r.agency ? 'Kopirano ✓' : 'Kopiraj link'}
                  </button>
                  <a href={r.path} target="_blank" rel="noreferrer" style={{ ...formBtnStyle, padding: '6px 12px', fontSize: '12.5px', textDecoration: 'none' }}>
                    Otvori
                  </a>
                </span>
              </div>
            ))}
          </section>
        )}

        <form onSubmit={handleSave} style={{ ...cardStyle, maxWidth: 'none', marginBottom: '22px' }}>
          <h2 style={{ fontSize: '15px', margin: 0, fontFamily: FORM.fontDisplay }}>
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
            <p style={{ margin: '-6px 0 0', fontSize: '12.5px', color: slugTaken ? FORM.danger : FORM.textSecondary }}>
              Link:&nbsp;
              <code style={{ fontFamily: 'monospace' }}>kvadrat360.com/tour/{previewSlug || '...'}</code>
              {slugTaken && ' — već postoji, dodaće se broj na kraj.'}
            </p>
          )}
          {editingSlug && (
            <p style={{ margin: '-6px 0 0', fontSize: '12.5px', color: FORM.textSecondary }}>
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
                <option value="booking">Stan na dan</option>
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
            <Field label="Grad" hint="Po njemu se filtrira spisak tura — isti grad mora svuda da bude isto napisan.">
              <input
                id="tour-city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="npr. Kragujevac"
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={twoCol}>
            <Field label="Naselje" hint="Filter na spisku tura. Nudi se prema upisanom gradu.">
              <input
                id="tour-district"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                placeholder={districtOptions[0] ? `npr. ${districtOptions[0]}` : 'npr. Centar'}
                list="admin-naselja"
                style={inputStyle}
              />
              {/* Slobodan unos, a ne meni: ovde se sređuju i ture iz gradova
                  za koje spisak naselja još ne postoji. */}
              <datalist id="admin-naselja">
                {districtOptions.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </Field>
            <Field label="Struktura" hint="Filter na spisku tura — mora da bude iz ponuđene liste.">
              <select
                id="tour-structure"
                value={form.structure}
                onChange={(e) => setForm({ ...form, structure: e.target.value })}
                style={inputStyle}
              >
                <option value="">— nije određena —</option>
                {structureOptions.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>

          <div style={twoCol}>
            <Field label="Kvadratura (m²)" hint="Klizač na spisku tura. Prazno = tura prolazi kroz klizač bez ograničenja.">
              <input
                id="tour-area"
                inputMode="decimal"
                value={form.area_sqm}
                onChange={(e) => setForm({ ...form, area_sqm: e.target.value })}
                placeholder="npr. 58"
                style={inputStyle}
              />
            </Field>
            <Field
              label="Cena (EUR)"
              hint={
                form.category === 'sale'
                  ? 'Ukupna prodajna cena.'
                  : form.category === 'booking'
                    ? 'Cena po noćenju.'
                    : 'Mesečna zakupnina.'
              }
            >
              <input
                id="tour-price"
                inputMode="decimal"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder={form.category === 'sale' ? 'npr. 72000' : 'npr. 450'}
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={twoCol}>
            <Field label="Sprat" hint="Red u tabeli osnovnih podataka u turi (Info modal).">
              <input
                id="tour-floor"
                value={form.floor}
                onChange={(e) => setForm({ ...form, floor: e.target.value })}
                placeholder="npr. 3/6"
                style={inputStyle}
              />
            </Field>
            <Field label="Grejanje">
              <select
                id="tour-heating"
                value={form.heating}
                onChange={(e) => setForm({ ...form, heating: e.target.value })}
                style={inputStyle}
              >
                <option value="">— nije određeno —</option>
                {HEATING_OPTIONS.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </Field>
          </div>

          <div style={twoCol}>
            <Field label="Lift">
              <select
                id="tour-elevator"
                value={form.has_elevator}
                onChange={(e) => setForm({ ...form, has_elevator: e.target.value })}
                style={inputStyle}
              >
                <option value="">— nije određeno —</option>
                {YES_NO.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Podrum">
              <select
                id="tour-basement"
                value={form.has_basement}
                onChange={(e) => setForm({ ...form, has_basement: e.target.value })}
                style={inputStyle}
              >
                <option value="">— nije određeno —</option>
                {YES_NO.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
          </div>

          <div style={twoCol}>
            <Field label="Status gradnje">
              <select
                id="tour-build-status"
                value={form.build_status}
                onChange={(e) => setForm({ ...form, build_status: e.target.value })}
                style={inputStyle}
              >
                <option value="">— nije određeno —</option>
                {BUILD_STATUS_OPTIONS.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Stanje" hint="Stanje enterijera, nezavisno od statusa gradnje.">
              <select
                id="tour-finish-status"
                value={form.finish_status}
                onChange={(e) => setForm({ ...form, finish_status: e.target.value })}
                style={inputStyle}
              >
                <option value="">— nije određeno —</option>
                {FINISH_STATUS_OPTIONS.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
          </div>

          <div style={twoCol}>
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

          {/* Odgovori na pet pitanja (dugme "Pitanja" u turi). Samo pri izmeni:
              nova tura ih dobija iz upitnika. Pitanja zavise od tipa oglasa,
              a odgovor stoji na istom mestu - zato se pri promeni tipa
              oglasa i odgovori moraju proveriti. */}
          {editingSlug && (
            <fieldset style={{ border: `1px solid ${FORM.border}`, borderRadius: '12px', padding: '12px 14px 14px', margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <legend style={{ padding: '0 6px', fontSize: '13.5px', fontWeight: 700 }}>Odgovori na pitanja</legend>
              <p style={{ margin: 0, fontSize: '12.5px', color: FORM.textSecondary }}>
                Pišete na srpskom. Izmenjen odgovor se pri čuvanju sam prevodi na jezike koje tura ima.
                Jedan kratak red po odgovoru; prazno polje = pitanje se ne prikazuje.
              </p>
              {(categoryQuestions[form.category]?.sr ?? categoryQuestions.rent.sr).map((question, i) => (
                <Field key={i} label={`${i + 1}. ${question}`}>
                  <textarea
                    id={`tour-faq-${i + 1}`}
                    value={form.faq[i] ?? ''}
                    onChange={(e) => {
                      const faq = [...form.faq];
                      faq[i] = e.target.value;
                      setForm({ ...form, faq });
                    }}
                    rows={2}
                    maxLength={400}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </Field>
              ))}
            </fieldset>
          )}

          {error && <p style={{ margin: 0, color: FORM.danger, fontSize: '13px' }}>{error}</p>}
          {notice && <p style={{ margin: 0, color: FORM.success, fontSize: '13px' }}>{notice}</p>}

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
                style={{ ...formBtnStyle, padding: '11px 16px', fontSize: '14px' }}
              >
                Otkaži
              </button>
            )}
          </div>
        </form>

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
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr>
                {['Tura', 'Stanje', 'Nekretnina', 'Agencija', 'Tip', 'Sobe', ''].map((h, i) => (
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
              {tours.map((tour) => {
                const missingPanorama = tour.rooms > 0 && tour.roomsWithPanorama < tour.rooms;
                return (
                  <tr key={tour.slug} style={{ borderBottom: '1px solid ' + FORM.border }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600 }}>{pickTitle(tour)}</div>
                      <div style={{ fontSize: '12px', color: FORM.textMuted, fontFamily: 'monospace' }}>
                        /tour/{tour.slug}
                      </div>
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
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <select
                        value={tour.status}
                        onChange={(e) => void updateStatus(tour, e.target.value as TourRow['status'])}
                        disabled={updatingStatusSlug === tour.slug}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: tour.status === 'active' ? FORM.textPrimary : '#fff',
                          background: tour.status === 'active' ? FORM.surface : FORM.danger,
                          border: '1px solid ' + (tour.status === 'active' ? FORM.border : FORM.danger)
                        }}
                      >
                        {(Object.keys(STATUS_LABELS) as TourRow['status'][]).map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
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
                        href={`/tour/${tour.slug}?admin=1`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ ...formBtnStyle, padding: '6px 12px', fontSize: '12.5px', textDecoration: 'none', marginRight: '6px' }}
                      >
                        Uredi sadržaj
                      </a>
                      <button
                        onClick={() => void copyEmbedCode(tour)}
                        title="Kopira <iframe> kod za ugradnju ture na sajt agencije"
                        style={{
                          ...formBtnStyle,
                          padding: '6px 12px',
                          fontSize: '12.5px',
                          ...(copiedEmbedSlug === tour.slug
                            ? { background: FORM.success, color: '#fff', borderColor: FORM.success }
                            : {})
                        }}
                      >
                        {copiedEmbedSlug === tour.slug ? 'Kopirano ✓' : 'Iframe'}
                      </button>
                      <button
                        onClick={() => void deleteTour(tour)}
                        disabled={deletingSlug === tour.slug}
                        title="Trajno briše turu, sobe, panorame i statistiku - ne može se vratiti"
                        style={{
                          ...formBtnStyle,
                          padding: '6px 12px',
                          fontSize: '12.5px',
                          marginLeft: '6px',
                          background: FORM.danger,
                          color: '#fff',
                          borderColor: FORM.danger
                        }}
                      >
                        {deletingSlug === tour.slug ? '…' : 'Obriši'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p style={{ marginTop: '14px', fontSize: '12.5px', color: FORM.textMuted }}>
          {"„Uredi sadržaj“"} otvara turu u admin režimu, gde se dodaju sobe, panorame i hotspotovi.
          {"„Iframe“"} kopira gotov kod za ugradnju ture na sajt agencije — radi tek kad je tura objavljena.
          {"„Obriši“"} trajno uklanja turu, sobe, panorame i statistiku — traži da upišeš slug ture za potvrdu,
          jer se ne može vratiti. Crveno kod broja soba znači da neka soba nema panoramu. Nova tura kreće
          {"„u pripremi“"} — link radi samo tebi dok je ne objaviš.
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
      <span style={{ fontSize: '12.5px', fontWeight: 600, color: FORM.textSecondary }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: '11.5px', color: FORM.textMuted }}>{hint}</span>}
    </label>
  );
}

const cardStyle: React.CSSProperties = {
  background: FORM.surface,
  border: '1px solid ' + FORM.border,
  borderRadius: '18px',
  padding: '22px',
  width: '100%',
  maxWidth: '380px',
  boxShadow: FORM.shadow,
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
  border: '1px solid ' + FORM.border,
  fontSize: '14px',
  fontFamily: 'inherit',
  background: FORM.surfaceAlt,
  color: FORM.textPrimary,
  width: '100%'
};

const primaryBtn: React.CSSProperties = {
  ...formBtnStyle,
  background: FORM.accent,
  color: FORM.onAccent,
  borderColor: FORM.accent,
  padding: '11px 18px',
  fontSize: '14px'
};
