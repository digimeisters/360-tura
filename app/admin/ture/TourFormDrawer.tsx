'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FORM, formBtnStyle } from '../../lib/formTheme';
import { slugify } from '../../lib/slug';
import {
  STRUCTURE_ORDER,
  HEATING_OPTIONS,
  YES_NO,
  BUILD_STATUS_OPTIONS,
  FINISH_STATUS_OPTIONS,
  TERRACE_OPTIONS,
  PARKING_OPTIONS,
  DEPOSIT_OPTIONS,
  REGISTRATION_OPTIONS,
  neighbourhoodsFor
} from '../../lib/propertyTaxonomy';
import { categoryQuestions } from '../../tour/[slug]/translations';
import AgencyPicker from './AgencyPicker';
import type { FormState } from './tourForm';

/**
 * Forma ture u panelu sa desne strane (spec 2026-10-24-admin-okvir): otvara
 * se samo na "+ Nova tura" i "Izmeni", lista ostaje iza. Polja su ista kao
 * ranije u jednoj dugačkoj formi, podeljena na kartice.
 */

export type DrawerTab = 'basic' | 'info' | 'faq' | 'agent';

const TABS: { key: DrawerTab; label: string }[] = [
  { key: 'basic', label: 'Osnovno' },
  { key: 'info', label: 'Podaci za Info' },
  { key: 'faq', label: 'Pitanja' },
  { key: 'agent', label: 'Agent' }
];

export default function TourFormDrawer({
  open,
  editingSlug,
  form,
  onChange,
  agencies,
  existingSlugs,
  saving,
  error,
  onSave,
  onClose
}: {
  open: boolean;
  /** null = nova tura */
  editingSlug: string | null;
  form: FormState;
  onChange: (next: FormState) => void;
  agencies: string[];
  /** Postojeći linkovi - pregled linka nove ture javlja kad je zauzet. */
  existingSlugs: string[];
  saving: boolean;
  /** Greška čuvanja, prikazuje se iznad dugmadi. */
  error: string;
  onSave: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<DrawerTab>('basic');
  const [emailError, setEmailError] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  // Svaki put kad se panel otvori, kreće od kartice "Osnovno"
  // (poređenje sa prethodnim stanjem tokom iscrtavanja, bez effect-a).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTab('basic');
      setEmailError('');
    }
  }

  // Esc zatvara panel - osim kad je iznad njega otvoren neki drugi prozor.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const others = [...document.querySelectorAll('[role="dialog"], [aria-modal="true"]')].filter(
        // Samo prozori koji se stvarno vide (npr. meni za telefon je na računaru skriven).
        (el) => !panelRef.current?.contains(el) && el !== panelRef.current && (el as HTMLElement).getClientRects().length > 0
      );
      if (others.length) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const previewSlug = useMemo(() => slugify(form.title), [form.title]);
  const slugTaken = !editingSlug && previewSlug !== '' && existingSlugs.includes(previewSlug);
  const districtOptions = neighbourhoodsFor(form.city);
  // Zatečena tura može da ima strukturu van liste - i dalje se vidi i čuva.
  const structureOptions = STRUCTURE_ORDER.includes(form.structure) || !form.structure ? STRUCTURE_ORDER : [form.structure, ...STRUCTURE_ORDER];
  // Odgovori na pitanja postoje tek posle kreiranja ture (stižu iz upitnika).
  const tabs = editingSlug ? TABS : TABS.filter((t) => t.key !== 'faq');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setTab('basic');
      // Polje se crta tek posle promene kartice.
      requestAnimationFrame(() => document.getElementById('tour-title')?.focus());
      return;
    }
    // Na ovu adresu stižu zahtevi za razgledanje (Resend) - pogrešna adresa
    // tiho gubi kupce, a server proverava samo dužinu.
    const agentEmail = form.agent_email.trim();
    if (agentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(agentEmail)) {
      setEmailError('Email agenta nije ispravan (npr. ime@agencija.rs).');
      setTab('agent');
      requestAnimationFrame(() => document.getElementById('tour-agent-email')?.focus());
      return;
    }
    setEmailError('');
    onSave();
  };

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(17,19,24,.28)' }} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-drawer-title"
        className="k-tour-drawer"
        style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 160, background: FORM.surface, borderLeft: '1px solid ' + FORM.border, boxShadow: '-16px 0 40px rgba(0,0,0,.12)', display: 'flex', flexDirection: 'column' }}
      >
        <style>{'.k-tour-drawer{width:min(460px,100vw)} @media (max-width:899px){.k-tour-drawer{width:100vw}}'}</style>
        <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '18px 20px 10px' }}>
            <h2 id="tour-drawer-title" style={{ fontSize: '16px', margin: 0, fontFamily: FORM.fontDisplay }}>
              {editingSlug ? `Izmena ture: ${editingSlug}` : 'Nova tura'}
            </h2>
            <button type="button" onClick={onClose} aria-label="Zatvori" style={{ ...formBtnStyle, padding: '4px 11px', fontSize: '18px', lineHeight: 1 }}>
              ×
            </button>
          </div>
          <div role="tablist" style={{ display: 'flex', gap: '2px', padding: '0 20px', borderBottom: '1px solid ' + FORM.border }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                style={{ padding: '8px 10px', border: 'none', background: 'none', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer', color: tab === t.key ? FORM.textPrimary : FORM.textSecondary, fontWeight: tab === t.key ? 700 : 500, borderBottom: '2px solid ' + (tab === t.key ? FORM.accent : 'transparent'), marginBottom: '-1px' }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {tab === 'basic' && (
              <>
          <Field label="Naslov oglasa" hint="Ovo vidi klijent kad podeli turu.">
            <input
              id="tour-title"
              value={form.title}
              onChange={(e) => onChange({ ...form, title: e.target.value })}
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
              <AgencyPicker
                value={form.agency_name}
                agencies={agencies}
                onChange={(agency) => onChange({ ...form, agency_name: agency })}
                inputStyle={inputStyle}
              />
            </Field>
            <Field label="Tip oglasa">
              <select
                id="tour-category"
                value={form.category}
                onChange={(e) => onChange({ ...form, category: e.target.value })}
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
                onChange={(e) => onChange({ ...form, address: e.target.value })}
                style={inputStyle}
              />
            </Field>
            <Field label="Grad" hint="Po njemu se filtrira spisak tura — isti grad mora svuda da bude isto napisan.">
              <input
                id="tour-city"
                value={form.city}
                onChange={(e) => onChange({ ...form, city: e.target.value })}
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
                onChange={(e) => onChange({ ...form, district: e.target.value })}
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
                onChange={(e) => onChange({ ...form, structure: e.target.value })}
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
                onChange={(e) => onChange({ ...form, area_sqm: e.target.value })}
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
                onChange={(e) => onChange({ ...form, price: e.target.value })}
                placeholder={form.category === 'sale' ? 'npr. 72000' : 'npr. 450'}
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={twoCol}>
            <Field label="Tip nekretnine" hint="npr. Dvosoban stan">
              <input
                id="tour-property-type"
                value={form.property_type}
                onChange={(e) => onChange({ ...form, property_type: e.target.value })}
                style={inputStyle}
              />
            </Field>
          </div>

          {/* Krug sa logom na mestu stativa (NadirLogo.tsx): logo agencije,
              ili Kvadrat360 znak. Isključuje se kad klijent ne želi logo. */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
            <input
              id="tour-nadir-logo"
              type="checkbox"
              checked={form.nadir_logo}
              onChange={(e) => onChange({ ...form, nadir_logo: e.target.checked })}
              style={{ width: '18px', height: '18px', marginTop: '1px', accentColor: FORM.accent }}
            />
            <span>
              <b>Logo na mestu stativa</b>
              <span style={{ display: 'block', fontSize: '12.5px', color: FORM.textSecondary }}>
                Krug sa logom agencije (bez njega Kvadrat360 znak) kad posetilac pogleda nadole. Isključite ako klijent ne želi logo.
              </span>
            </span>
          </label>

              </>
            )}

            {tab === 'info' && (
              <>
          <div style={twoCol}>
            <Field label="Sprat" hint="Red u tabeli osnovnih podataka u turi (Info modal).">
              <input
                id="tour-floor"
                value={form.floor}
                onChange={(e) => onChange({ ...form, floor: e.target.value })}
                placeholder="npr. 3/6"
                style={inputStyle}
              />
            </Field>
            <Field label="Grejanje">
              <select
                id="tour-heating"
                value={form.heating}
                onChange={(e) => onChange({ ...form, heating: e.target.value })}
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
                onChange={(e) => onChange({ ...form, has_elevator: e.target.value })}
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
                onChange={(e) => onChange({ ...form, has_basement: e.target.value })}
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
                onChange={(e) => onChange({ ...form, build_status: e.target.value })}
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
                onChange={(e) => onChange({ ...form, finish_status: e.target.value })}
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
            <Field label="Terasa / balkon">
              <select
                id="tour-terrace"
                value={form.terrace}
                onChange={(e) => onChange({ ...form, terrace: e.target.value })}
                style={inputStyle}
              >
                <option value="">— nije određeno —</option>
                {TERRACE_OPTIONS.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Parking">
              <select
                id="tour-parking"
                value={form.parking}
                onChange={(e) => onChange({ ...form, parking: e.target.value })}
                style={inputStyle}
              >
                <option value="">— nije određeno —</option>
                {PARKING_OPTIONS.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Depozit samo za izdavanje, uknjiženost samo za prodaju - tura ih
              ionako prikazuje samo za tu vrstu oglasa. */}
          {(form.category === 'rent' || form.category === 'sale') && (
            <div style={twoCol}>
              {form.category === 'rent' ? (
              <Field label="Depozit">
                <select
                  id="tour-deposit"
                  value={form.deposit}
                  onChange={(e) => onChange({ ...form, deposit: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">— nije određeno —</option>
                  {DEPOSIT_OPTIONS.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
                ) : (
              <Field label="Uknjiženost">
                <select
                  id="tour-registration"
                  value={form.registration}
                  onChange={(e) => onChange({ ...form, registration: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">— nije određeno —</option>
                  {REGISTRATION_OPTIONS.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
                )}
            </div>
          )}

              </>
            )}

            {tab === 'faq' && editingSlug && (
              <>
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
                      onChange({ ...form, faq });
                    }}
                    rows={2}
                    maxLength={400}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </Field>
              ))}
              </>
            )}

            {tab === 'agent' && (
              <>
          <div style={twoCol}>
            <Field label="Agent">
              <input
                id="tour-agent-name"
                value={form.agent_name}
                onChange={(e) => onChange({ ...form, agent_name: e.target.value })}
                style={inputStyle}
              />
            </Field>
            <Field label="Telefon agenta">
              <input
                id="tour-agent-phone"
                value={form.agent_phone}
                onChange={(e) => onChange({ ...form, agent_phone: e.target.value })}
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Email agenta" hint="Na ovu adresu agentu stižu zahtevi za razgledanje iz ture.">
            <input
              id="tour-agent-email"
              type="email"
              value={form.agent_email}
              onChange={(e) => onChange({ ...form, agent_email: e.target.value })}
              style={inputStyle}
            />
          </Field>

              </>
            )}
          </div>

          <div style={{ borderTop: '1px solid ' + FORM.border, padding: '12px 20px calc(12px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(emailError || error) && <p style={{ margin: 0, color: FORM.danger, fontSize: '13px' }}>{emailError || error}</p>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} style={{ ...formBtnStyle, padding: '10px 16px', fontSize: '14px' }}>
                Otkaži
              </button>
              <button type="submit" disabled={saving} style={{ ...formBtnStyle, background: FORM.accent, color: FORM.onAccent, borderColor: FORM.accent, padding: '10px 18px', fontSize: '14px' }}>
                {saving ? 'Čuvanje…' : editingSlug ? 'Sačuvaj izmene' : 'Kreiraj turu'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <span style={{ fontSize: '12.5px', fontWeight: 600, color: FORM.textSecondary }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: '11.5px', color: FORM.textMuted }}>{hint}</span>}
    </label>
  );
}

const twoCol: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
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
