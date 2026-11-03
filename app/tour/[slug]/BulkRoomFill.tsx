'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { adminAuthHeader } from '../../lib/authFetch';
import { THEME } from './theme';
import { getLocalizedText, parseEstablish, parseWaypoints } from './utils';
import { applyRoomDraft, requestRoomDraft, requestTourPlan, type AiDraft } from './roomDraftApply';
import { MAX_ROOM_NOTE_CHARS } from '../../lib/aiNotes';
import { isOverloadError, OVERLOAD_PAUSE_MS } from '../../lib/aiOverload';
import { visitOrder } from '../../lib/roomAiContext';
import type { TourPlanEntry } from '../../lib/roomDraftPrompt';
import type { Language, Room, Tour, Waypoint } from './types';

/**
 * "🤖 AI sve sobe" (vlasnik, 2026-10-31; maketa public/mockup/AiSveSobe.html):
 * umesto "AI Popuni Sobu" soba po soba - (1) izbor soba (unapred one bez
 * teksta) i jezika, (2) AI predlog za svaku redom pa pregled jedne po jedne,
 * (3) prevod, glas i upis, soba po soba (gotova soba je sačuvana i kad
 * kasnija pukne). Vrata i ručne tačke se ne diraju (applyRoomDraft).
 *
 * Od 2026-11-03 (spec docs/superpowers/specs/2026-11-03-ai-tekst-soba-design.md):
 * sobe idu redom obilaska (vodič), uz napomenu po sobi i plan cele ture
 * (plan_tour); posle "preopterećen" pauza pre sledeće sobe; sobe koje nisu
 * uspele dobijaju "Pokušaj ponovo"; zatvaranje taba pita dok ima nesačuvanih
 * nacrta.
 */

const LANGS: Language[] = ['sr', 'en', 'de', 'ru'];

type ReviewField = 'title' | 'intro' | 'detail' | 'wpTitle' | 'wpText';
type Suggestion = { field: ReviewField; index: number; original: string; suggested: string; reason: string };

type Phase =
  | { kind: 'pick' }
  | { kind: 'drafting'; done: number; total: number; current: string; note?: string }
  | { kind: 'failed' }
  | { kind: 'review'; index: number }
  | { kind: 'applying'; lines: Record<string, string> }
  | { kind: 'done'; lines: Record<string, string> };

type Item = { room: Room; draft: AiDraft | null; error: string | null; accepted: boolean | null };

/** "Jedna soba nije uspela" / "3 sobe nisu uspele" / "5 soba nije uspelo". */
function failedLabel(n: number): string {
  if (n === 1) return 'Jedna soba nije uspela:';
  const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14);
  return few ? `${n} sobe nisu uspele:` : `${n} soba nije uspelo:`;
}

function hasText(room: Room): boolean {
  const e = parseEstablish(room.establish_i18n);
  return Boolean(getLocalizedText(e.intro_i18n, 'sr') || getLocalizedText(e.detail_i18n, 'sr') || getLocalizedText(e.text_i18n, 'sr'));
}

export default function BulkRoomFill({
  rooms,
  tour,
  onRoomSaved,
  onClose
}: {
  rooms: Room[];
  tour: Tour | null;
  /** Soba je sačuvana - strana osvežava stanje i tačke ako je soba na ekranu. */
  onRoomSaved: (roomId: string | number, patch: Pick<Room, 'title_i18n' | 'establish_i18n' | 'waypoints_i18n'>) => void;
  onClose: () => void;
}) {
  // Red obilaska iz vodiča: tim redom AI piše i prelaze ("Iz hodnika...").
  const order = useMemo(
    () => visitOrder(tour?.guide_path, rooms.map((r, i) => ({ id: String(r.id), order_index: r.order_index ?? i + 1 }))),
    [tour?.guide_path, rooms]
  );
  const candidates = useMemo(() => {
    const pos = new Map(order.ids.map((id, i) => [id, i]));
    return rooms
      .filter((r) => r.panorama_url_cf || r.panorama_url)
      .sort((a, b) => (pos.get(String(a.id)) ?? 0) - (pos.get(String(b.id)) ?? 0));
  }, [rooms, order]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(candidates.filter((r) => !hasText(r)).map((r) => String(r.id))));
  const [langs, setLangs] = useState<Language[]>(['sr']);
  const [voice, setVoice] = useState<Language[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: 'pick' });
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // Napomene soba za AI (tour_ai_notes): šta je učitano i šta je sad u poljima.
  const [notes, setNotes] = useState<Record<string, string>>({});
  const savedNotes = useRef<Record<string, string>>({});
  // Dok se napomene ne učitaju, šalje se samo ono što je admin sam upisao -
  // inače bi prazno polje sakrilo sačuvanu napomenu sobe.
  const [notesLoaded, setNotesLoaded] = useState(false);
  const touched = useRef<Set<string>>(new Set());
  const [plan, setPlan] = useState<Record<string, TourPlanEntry>>({});
  const [planNote, setPlanNote] = useState<string | null>(null);

  useEffect(() => {
    if (!tour?.slug) return;
    let alive = true;
    void (async () => {
      try {
        const res = await fetch(`/api/admin/ai-notes?slug=${encodeURIComponent(tour.slug)}`, { headers: await adminAuthHeader() });
        const result = await res.json();
        if (alive && result.success) {
          savedNotes.current = result.notes.roomNotes ?? {};
          // Ono što je admin već počeo da kuca ostaje.
          setNotes((typed) => ({ ...(result.notes.roomNotes ?? {}), ...typed }));
          setNotesLoaded(true);
        }
      } catch {
        // Bez napomena AI i dalje radi.
      }
    })();
    return () => {
      alive = false;
    };
  }, [tour?.slug]);

  // Nacrti su samo u memoriji dok se ne prihvate - zatvaranje taba prvo pita.
  const unsaved = phase.kind === 'drafting' || phase.kind === 'applying' || items.some((it) => it.draft && it.accepted === null);
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const title = (r: Room, i: number) => getLocalizedText(r.title_i18n, 'sr') || `Soba ${i + 1}`;
  const working = phase.kind === 'drafting' || phase.kind === 'applying';

  const noteFor = (id: string) => (notesLoaded || touched.current.has(id) ? (notes[id] ?? '') : undefined);

  /** Nacrti iz iste serije, da AI vidi nove uvode i nazive (još nisu u bazi). */
  const siblingsOf = (list: Item[], exceptId: string) =>
    list
      .filter((it) => it.draft && String(it.room.id) !== exceptId)
      .map((it) => ({
        id: String(it.room.id),
        title: it.draft!.title,
        narration: `${it.draft!.narrationIntro} ${it.draft!.narrationDetail}`.trim()
      }));

  const saveNotes = async () => {
    if (!tour?.slug) return;
    const changed = Object.fromEntries(Object.entries(notes).filter(([id, text]) => (savedNotes.current[id] ?? '') !== text));
    for (const id of Object.keys(savedNotes.current)) if (!(id in notes)) changed[id] = '';
    if (!Object.keys(changed).length) return;
    try {
      const res = await fetch('/api/admin/ai-notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
        body: JSON.stringify({ slug: tour.slug, roomNotes: changed })
      });
      const result = await res.json();
      if (result.success) savedNotes.current = result.notes.roomNotes ?? {};
    } catch {
      // Napomena i dalje ide uz zahtev za nacrt (roomNote), samo nije sačuvana.
    }
  };

  /** Nacrti za date stavke, redom; greška jedne ne zaustavlja ostale. */
  const draftItems = async (list: Item[], indexes: number[], usePlan: Record<string, TourPlanEntry>) => {
    for (let k = 0; k < indexes.length; k++) {
      const i = indexes[k];
      setPhase({ kind: 'drafting', done: k, total: indexes.length, current: title(list[i].room, i) });
      const id = String(list[i].room.id);
      try {
        const draft = await requestRoomDraft(list[i].room, tour?.category, {
          plan: usePlan[id],
          roomNote: noteFor(id),
          siblings: siblingsOf(list, id)
        });
        list[i] = { ...list[i], draft, error: null };
      } catch (e) {
        const message = e instanceof Error ? e.message : 'AI nije uspeo.';
        list[i] = { ...list[i], error: message };
        if (isOverloadError(message) && k < indexes.length - 1) {
          setPhase({ kind: 'drafting', done: k + 1, total: indexes.length, current: title(list[i].room, i), note: 'Gemini je preopterećen, čekam par sekundi…' });
          await new Promise((r) => setTimeout(r, OVERLOAD_PAUSE_MS));
        }
      }
      setItems([...list]);
    }
    setSuggestions(null);
    const first = list.findIndex((it) => it.draft);
    if (list.some((it) => it.error && !it.draft)) setPhase({ kind: 'failed' });
    else if (first >= 0) setPhase({ kind: 'review', index: first });
    else setPhase({ kind: 'done', lines: Object.fromEntries(list.map((it) => [String(it.room.id), `✗ ${it.error}`])) });
  };

  const makeDrafts = async () => {
    const chosen = candidates.filter((r) => selected.has(String(r.id)));
    const list: Item[] = chosen.map((room) => ({ room, draft: null, error: null, accepted: null }));
    setItems(list);
    setPhase({ kind: 'drafting', done: 0, total: list.length, current: '', note: 'Pravim plan cele ture…' });
    await saveNotes();
    let usePlan: Record<string, TourPlanEntry> = {};
    if (tour?.slug) {
      try {
        usePlan = (await requestTourPlan(tour.slug, tour.category)).plan;
        setPlanNote(null);
      } catch {
        setPlanNote('Plan ture nije uspeo - sobe se pišu bez plana.');
      }
    }
    setPlan(usePlan);
    await draftItems(list, list.map((_, i) => i), usePlan);
  };

  const retryFailed = async () => {
    const list = [...items];
    await draftItems(list, list.flatMap((it, i) => (it.error && !it.draft ? [i] : [])), plan);
  };

  const continueToReview = () => {
    const first = items.findIndex((it) => it.draft);
    if (first >= 0) go(first);
    else setPhase({ kind: 'done', lines: Object.fromEntries(items.map((it) => [String(it.room.id), `✗ ${it.error}`])) });
  };

  const current = phase.kind === 'review' ? items[phase.index] : null;
  const setDraft = (patch: Partial<AiDraft>) => {
    if (phase.kind !== 'review') return;
    setItems((all) => all.map((it, i) => (i === phase.index && it.draft ? { ...it, draft: { ...it.draft, ...patch } } : it)));
  };
  const setWaypoint = (wi: number, patch: Partial<Waypoint>) => {
    if (!current?.draft) return;
    setDraft({ waypoints: current.draft.waypoints.map((w, i) => (i === wi ? { ...w, ...patch } : w)) });
  };

  const nextIndex = (from: number) => {
    for (let i = from + 1; i < items.length; i++) if (items[i].draft) return i;
    return -1;
  };
  const go = (index: number) => {
    setSuggestions(null);
    setPhase({ kind: 'review', index });
  };
  const decide = (accepted: boolean) => {
    if (phase.kind !== 'review') return;
    const updated = items.map((it, i) => (i === phase.index ? { ...it, accepted } : it));
    setItems(updated);
    const next = nextIndex(phase.index);
    if (next >= 0) go(next);
    else void applyAll(updated);
  };

  const regenerate = async () => {
    if (phase.kind !== 'review' || !current) return;
    setBusy('regen');
    try {
      const id = String(current.room.id);
      const draft = await requestRoomDraft(current.room, tour?.category, { plan: plan[id], roomNote: noteFor(id), siblings: siblingsOf(items, id) });
      setItems((all) => all.map((it, i) => (i === phase.index ? { ...it, draft } : it)));
      setSuggestions(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Novi predlog nije uspeo.');
    } finally {
      setBusy(null);
    }
  };

  const review = async () => {
    if (!current?.draft) return;
    setBusy('review');
    try {
      const res = await fetch('/api/ai/auto-populate-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
        body: JSON.stringify({
          roomId: current.room.id,
          panoramaUrl: current.room.panorama_url_cf || current.room.panorama_url,
          listingType: tour?.category,
          draft: current.draft,
          action: 'review_draft'
        })
      });
      const result = await res.json().catch(() => ({ success: false }));
      if (!result.success) throw new Error(result.error || 'Provera nije uspela.');
      setSuggestions((result.suggestions ?? []) as Suggestion[]);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Provera nije uspela.');
    } finally {
      setBusy(null);
    }
  };

  const applySuggestion = (s: Suggestion) => {
    if (!current?.draft) return;
    if (s.field === 'title') setDraft({ title: s.suggested });
    else if (s.field === 'intro') setDraft({ narrationIntro: s.suggested });
    else if (s.field === 'detail') setDraft({ narrationDetail: s.suggested });
    else if (s.field === 'wpTitle') setWaypoint(s.index, { title_i18n: { sr: s.suggested } });
    else setWaypoint(s.index, { text_i18n: { sr: s.suggested } });
    setSuggestions((list) => (list ? list.filter((x) => x !== s) : list));
  };

  const applyAll = async (list: Item[]) => {
    const todo = list.filter((it) => it.accepted && it.draft);
    const lines: Record<string, string> = {};
    for (const it of list) if (!it.accepted || !it.draft) lines[String(it.room.id)] = it.error ? `✗ ${it.error}` : 'preskočeno';
    setPhase({ kind: 'applying', lines: { ...lines } });
    const otherLangs = langs.filter((l) => l !== 'sr');
    for (const it of todo) {
      const id = String(it.room.id);
      const show = (text: string) => {
        lines[id] = text;
        setPhase({ kind: 'applying', lines: { ...lines } });
      };
      try {
        const applied = await applyRoomDraft({
          room: it.room,
          draft: it.draft!,
          otherLangs,
          voiceLangs: voice,
          onStep: (step) => show(step === 'translate' ? 'prevodim…' : step === 'voice' ? 'snimam glas…' : 'čuvam…')
        });
        onRoomSaved(it.room.id, {
          title_i18n: applied.title_i18n,
          establish_i18n: applied.establish_i18n,
          waypoints_i18n: applied.waypoints_i18n
        });
        const parts = ['✓ sačuvano'];
        if (applied.failedLangs.length) parts.push(`prevod nije uspeo: ${applied.failedLangs.map((l) => l.toUpperCase()).join(', ')}`);
        if (voice.length)
          parts.push(applied.voiceErrors.length ? `glas delimično (${applied.voiceErrors.length} grešaka)` : `glas ${applied.voiceCount}`);
        show(parts.join(' · '));
      } catch (e) {
        show(`✗ nije sačuvano: ${e instanceof Error ? e.message : 'greška'}`);
      }
    }
    setPhase({ kind: 'done', lines: { ...lines } });
  };

  const chip = (on: boolean): React.CSSProperties => ({
    padding: '5px 11px',
    borderRadius: 999,
    border: `1.5px solid ${on ? THEME.accent : THEME.border}`,
    background: on ? THEME.accentSoft : '#fff',
    color: on ? THEME.accent : THEME.textSecondary,
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer'
  });
  const btn = (kind: 'main' | 'soft' | 'plain' = 'plain'): React.CSSProperties => ({
    padding: '10px 14px',
    borderRadius: 10,
    border: `1.5px solid ${kind === 'plain' ? THEME.border : THEME.accent}`,
    background: kind === 'main' ? THEME.accent : kind === 'soft' ? THEME.accentSoft : '#fff',
    color: kind === 'main' ? '#fff' : kind === 'soft' ? THEME.accent : THEME.textPrimary,
    fontWeight: 700,
    fontSize: 13.5,
    cursor: 'pointer',
    fontFamily: THEME.fontBody
  });
  const label: React.CSSProperties = {
    margin: '0 0 6px',
    fontSize: 11.5,
    fontWeight: 800,
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    color: THEME.textMuted
  };
  const area: React.CSSProperties = {
    width: '100%',
    border: `1.5px solid ${THEME.border}`,
    borderRadius: 10,
    padding: '8px 10px',
    font: 'inherit',
    fontSize: 14,
    lineHeight: 1.5,
    resize: 'vertical',
    color: THEME.textPrimary,
    background: '#fff'
  };

  const reviewTotal = items.filter((it) => it.draft).length;
  const reviewPos = phase.kind === 'review' ? items.slice(0, phase.index + 1).filter((it) => it.draft).length : 0;

  const body = (() => {
    if (phase.kind === 'pick') {
      return (
        <>
          <div>
            <p style={label}>Sobe (redom obilaska)</p>
            {!order.fromGuide && (
              <p style={{ margin: '0 0 8px', padding: '8px 10px', borderRadius: 10, background: '#FEF3C7', color: '#92400e', fontSize: 13 }}>
                Vodič nije postavljen - prelazi će pratiti redosled soba. Postavite vodič pre AI popune.
              </p>
            )}
            <div style={{ display: 'grid', gap: 6 }}>
              {candidates.map((r, i) => {
                const id = String(r.id);
                const doors = parseWaypoints(r.waypoints_i18n).filter((w) => w.targetRoomId != null).length;
                const filled = hasText(r);
                return (
                  <div key={id} style={{ display: 'grid', gap: 4 }}>
                  <label
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '20px 64px 1fr auto',
                      gap: 10,
                      alignItems: 'center',
                      padding: 8,
                      border: `1px solid ${THEME.border}`,
                      borderRadius: 10,
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(id)}
                      onChange={() =>
                        setSelected((s) => {
                          const n = new Set(s);
                          if (n.has(id)) n.delete(id);
                          else n.add(id);
                          return n;
                        })
                      }
                    />
                    {r.preview_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- mala sličica sobe sa CDN-a
                      <img src={r.preview_url} alt="" style={{ width: 64, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                    ) : (
                      <span style={{ width: 64, height: 40, borderRadius: 6, background: THEME.surfaceAlt }} />
                    )}
                    <span>
                      <b style={{ display: 'block', fontSize: 14 }}>{title(r, i)}</b>
                      <small style={{ color: THEME.textMuted }}>vrata: {doors}</small>
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 99,
                        padding: '2px 8px',
                        background: filled ? THEME.surfaceAlt : '#FEF3C7',
                        color: filled ? THEME.textMuted : '#92400e'
                      }}
                    >
                      {filled ? 'ima tekst' : 'bez teksta'}
                    </span>
                  </label>
                  {selected.has(id) && (
                    <input
                      value={notes[id] ?? ''}
                      maxLength={MAX_ROOM_NOTE_CHARS}
                      onChange={(e) => {
                        touched.current.add(id);
                        setNotes((n) => ({ ...n, [id]: e.target.value }));
                      }}
                      placeholder="Napomena za AI (ne vidi se u turi), npr. klima ostaje, nova kada 2024"
                      aria-label={`Napomena za AI: ${title(r, i)}`}
                      style={{ ...area, resize: undefined, fontSize: 13, padding: '6px 10px' }}
                    />
                  )}
                  </div>
                );
              })}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 12.5, color: THEME.textMuted }}>
              Unapred su označene sobe bez teksta. Soba koja već ima tekst se prepisuje samo ako je označite.
            </p>
          </div>
          <div>
            <p style={label}>Jezici (prevod)</p>
            <div style={{ display: 'flex', gap: 6 }}>
              {LANGS.map((l) => (
                <button
                  key={l}
                  type="button"
                  disabled={l === 'sr'}
                  style={chip(langs.includes(l))}
                  onClick={() => {
                    setLangs((x) => toggle(x, l));
                    if (langs.includes(l)) setVoice((v) => v.filter((x) => x !== l));
                  }}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={label}>Glas (ElevenLabs)</p>
            <div style={{ display: 'flex', gap: 6 }}>
              {langs.map((l) => (
                <button key={l} type="button" style={chip(voice.includes(l))} onClick={() => setVoice((v) => toggle(v, l))}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <button type="button" disabled={!selected.size} onClick={() => void makeDrafts()} style={btn('soft')}>
            ✨ Napravi predloge za {selected.size} {selected.size === 1 ? 'sobu' : selected.size < 5 ? 'sobe' : 'soba'} (~
            {Math.max(1, Math.round((selected.size * 20) / 60))} min)
          </button>
          <p style={{ margin: 0, fontSize: 12.5, color: THEME.textMuted }}>
            Predlozi se prave jedan po jedan. Ništa se ne čuva dok ga ne pregledate.
          </p>
        </>
      );
    }
    if (phase.kind === 'drafting') {
      return (
        <>
          <div style={{ height: 8, borderRadius: 99, background: THEME.surfaceAlt, overflow: 'hidden' }}>
            <i
              style={{
                display: 'block',
                height: '100%',
                width: `${(phase.done / phase.total) * 100}%`,
                background: THEME.accent,
                transition: 'width .3s'
              }}
            />
          </div>
          {phase.current ? (
            <p style={{ margin: 0 }}>
              AI pravi predlog: <b>{phase.current}</b> ({phase.done + 1} od {phase.total})
            </p>
          ) : null}
          <p style={{ margin: 0, fontSize: 12.5, color: THEME.textMuted }}>{phase.note ?? 'Ostavite prozor otvoren dok traje.'}</p>
        </>
      );
    }
    if (phase.kind === 'failed') {
      const failed = items.filter((it) => it.error && !it.draft);
      return (
        <>
          <p style={{ margin: 0 }}>
            {failedLabel(failed.length)}
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4, fontSize: 13.5 }}>
            {failed.map((it) => (
              <li key={String(it.room.id)}>
                <b>{title(it.room, items.indexOf(it))}</b> <small style={{ color: THEME.textMuted }}>✗ {it.error}</small>
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => void retryFailed()} style={btn('soft')}>
              ↻ Pokušaj ponovo
            </button>
            <button type="button" onClick={continueToReview} style={btn()}>
              {items.some((it) => it.draft) ? 'Nastavi na pregled bez njih' : 'Dalje'}
            </button>
          </div>
        </>
      );
    }
    if (phase.kind === 'review' && current?.draft) {
      const d = current.draft;
      return (
        <>
          <p style={{ margin: 0, fontSize: 13, color: THEME.textMuted }}>
            {reviewPos} od {reviewTotal} ·{' '}
            {items
              .filter((it) => it.draft)
              .map((it, i) => `${title(it.room, i)}${it.accepted ? ' ✓' : it.accepted === false ? ' –' : ''}`)
              .join(' · ')}
          </p>
          {planNote && <p style={{ margin: 0, fontSize: 12.5, color: '#92400e' }}>{planNote}</p>}
          {d.problems && d.problems.length > 0 && (
            <div style={{ background: '#FEF3C7', border: '1px solid #F5DFA0', borderRadius: 12, padding: 10, fontSize: 13, display: 'grid', gap: 4 }}>
              <b>Proveriti pre čuvanja:</b>
              {d.problems.map((p, i) => (
                <span key={i}>• {p}</span>
              ))}
            </div>
          )}
          {current.room.preview_url && (
            // eslint-disable-next-line @next/next/no-img-element -- sličica sobe za pregled teksta
            <img src={current.room.preview_url} alt="" style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 12 }} />
          )}
          <div>
            <p style={label}>Naziv</p>
            <input value={d.title} onChange={(e) => setDraft({ title: e.target.value })} style={{ ...area, resize: undefined }} />
          </div>
          <div>
            <p style={label}>Namena sobe (uvod)</p>
            <textarea value={d.narrationIntro} rows={3} onChange={(e) => setDraft({ narrationIntro: e.target.value })} style={area} />
          </div>
          <div>
            <p style={label}>Specifično</p>
            <textarea value={d.narrationDetail} rows={3} onChange={(e) => setDraft({ narrationDetail: e.target.value })} style={area} />
          </div>
          {d.waypoints.length > 0 && (
            <div>
              <p style={label}>Info-tačke ({d.waypoints.length})</p>
              <div style={{ display: 'grid', gap: 6 }}>
                {d.waypoints.map((w, wi) => (
                  <div key={wi} style={{ border: `1px solid ${THEME.border}`, borderRadius: 10, padding: 8, display: 'grid', gap: 4 }}>
                    <input
                      value={getLocalizedText(w.title_i18n, 'sr')}
                      onChange={(e) => setWaypoint(wi, { title_i18n: { sr: e.target.value } })}
                      style={{ ...area, fontWeight: 700, padding: '6px 8px' }}
                    />
                    <textarea
                      value={getLocalizedText(w.text_i18n, 'sr')}
                      rows={2}
                      onChange={(e) => setWaypoint(wi, { text_i18n: { sr: e.target.value } })}
                      style={{ ...area, padding: '6px 8px' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          {suggestions && (
            <div
              style={{
                background: '#FFF8E6',
                border: '1px solid #F5DFA0',
                borderRadius: 12,
                padding: 10,
                display: 'grid',
                gap: 6,
                fontSize: 13
              }}
            >
              <b>AI lektor{suggestions.length ? '' : ': nema predloga'}</b>
              {suggestions.map((s, i) => (
                <div key={i} style={{ display: 'grid', gap: 4 }}>
                  <span>
                    <b>
                      {s.field === 'title'
                        ? 'Naziv'
                        : s.field === 'intro'
                          ? 'Uvod'
                          : s.field === 'detail'
                            ? 'Specifično'
                            : `Tačka ${s.index + 1}`}
                      :
                    </b>{' '}
                    {s.suggested}
                  </span>
                  <small style={{ color: THEME.textMuted }}>{s.reason}</small>
                  <button
                    type="button"
                    onClick={() => applySuggestion(s)}
                    style={{ ...btn('soft'), padding: '5px 10px', fontSize: 12.5, justifySelf: 'start' }}
                  >
                    Primeni
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" disabled={busy !== null} onClick={() => void review()} style={btn()}>
              {busy === 'review' ? 'Proveravam…' : '✎ Proveri i ispravi (AI lektor)'}
            </button>
            <button type="button" disabled={busy !== null} onClick={() => void regenerate()} style={btn()}>
              {busy === 'regen' ? 'Pravim…' : '↻ Novi predlog'}
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={busy !== null || reviewPos <= 1}
              onClick={() => {
                for (let i = phase.index - 1; i >= 0; i--) if (items[i].draft) return go(i);
              }}
              style={btn()}
            >
              ← Prethodna
            </button>
            <span style={{ display: 'flex', gap: 8 }}>
              <button type="button" disabled={busy !== null} onClick={() => decide(false)} style={btn()}>
                Preskoči sobu
              </button>
              <button type="button" disabled={busy !== null} onClick={() => decide(true)} style={btn('main')}>
                {nextIndex(phase.index) >= 0 ? 'Prihvati → sledeća' : 'Prihvati i sačuvaj sve'}
              </button>
            </span>
          </div>
        </>
      );
    }
    const lines = phase.kind === 'applying' || phase.kind === 'done' ? phase.lines : {};
    return (
      <>
        <div style={{ display: 'grid', gap: 6 }}>
          {items.map((it, i) => {
            const text = lines[String(it.room.id)] ?? 'čeka';
            return (
              <div
                key={String(it.room.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  fontSize: 13.5,
                  padding: '6px 0',
                  borderBottom: `1px dashed ${THEME.border}`
                }}
              >
                <span>{title(it.room, i)}</span>
                <span
                  style={{
                    color: text.startsWith('✓') ? THEME.success : text.startsWith('✗') ? THEME.danger : THEME.textMuted,
                    fontWeight: 700,
                    textAlign: 'right'
                  }}
                >
                  {text}
                </span>
              </div>
            );
          })}
        </div>
        <p style={{ margin: 0, fontSize: 12.5, color: THEME.textMuted }}>
          {phase.kind === 'applying'
            ? 'Svaka soba se čuva čim je gotova. Ostavite prozor otvoren dok traje.'
            : 'Gotovo. Vrata i ručno postavljene tačke su ostale kakve su bile. Gde glas nije uspeo, pokrenite 🎙️ Glas za tu sobu.'}
        </p>
        {phase.kind === 'done' && (
          <button type="button" onClick={onClose} style={btn('main')}>
            Zatvori
          </button>
        )}
      </>
    );
  })();

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        background: 'rgba(17,17,19,.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: THEME.fontBody
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI sve sobe"
        style={{
          background: '#fff',
          color: THEME.textPrimary,
          borderRadius: 16,
          width: 'min(620px, 100%)',
          maxHeight: '92vh',
          overflow: 'auto',
          boxShadow: '0 24px 60px -30px rgba(0,0,0,.5)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: `1px solid ${THEME.border}`,
            position: 'sticky',
            top: 0,
            background: '#fff',
            zIndex: 1
          }}
        >
          <b style={{ fontSize: 16 }}>
            {phase.kind === 'review' && current ? `🤖 ${title(current.room, rooms.indexOf(current.room))}` : '🤖 AI sve sobe'}
          </b>
          <button
            type="button"
            disabled={working}
            onClick={() => {
              if (unsaved && !window.confirm('Zatvoriti? Predlozi koji nisu sačuvani se gube.')) return;
              onClose();
            }}
            aria-label="Zatvori"
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: 22,
              cursor: working ? 'default' : 'pointer',
              color: THEME.textMuted
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 14 }}>{body}</div>
      </div>
    </div>,
    document.body
  );
}
