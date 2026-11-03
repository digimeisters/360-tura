'use client';

import { THEME, btnStyle } from '../theme';
import { getLocalizedText, buildI18nObject } from '../utils';
import { AVAILABLE_LANGUAGES, reviewTargetLabel, FieldHint } from './shared';
import { type TourAdmin } from './useTourAdmin';
import { MAX_ROOM_NOTE_CHARS } from '../../../lib/aiNotes';

/** Modal: Pregled i izmena srpskog drafta + odabir jezika */
export default function DraftModal({ a }: { a: TourAdmin }) {
  const { targetLanguages, voiceLanguages, aiDraft, setAiDraft, showDraftModal, setShowDraftModal, review, reviewLoading, toggleTargetLanguage, toggleVoiceLanguage, handleReviewDraft, applySuggestion, dismissSuggestion, reviewChecks, handleConfirmDraftAndProcess, aiRoomNote, setAiRoomNote, handleRedraftWithNote, aiLoading } = a;
  return (
    <>
    {showDraftModal && aiDraft && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: THEME.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ backgroundColor: THEME.surface, border: '1px solid ' + THEME.border, borderRadius: '20px', width: '100%', maxWidth: '650px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: THEME.shadowLg }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid ' + THEME.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ color: THEME.textPrimary, fontSize: '18px', margin: 0, fontWeight: 700 }}>✏️ Pregled i Izmena AI Drafta (SR)</h2>
            <button
              onClick={() => setShowDraftModal(false)}
              title="Zatvori"
              style={{ background: 'transparent', border: 'none', color: THEME.textMuted, fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', padding: '0 4px', lineHeight: '1', flexShrink: 0 }}
            >
              ×
            </button>
          </div>

          <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {aiDraft.problems && aiDraft.problems.length > 0 && (
              <div style={{ background: '#FEF3C7', border: '1px solid #F5DFA0', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', display: 'grid', gap: '4px', color: THEME.textPrimary }}>
                <b>Proveriti pre čuvanja:</b>
                {aiDraft.problems.map((p, i) => (
                  <span key={i}>• {p}</span>
                ))}
              </div>
            )}
            <div>
              <label style={{ fontSize: '12px', color: THEME.textSecondary, display: 'block', marginBottom: '4px', fontWeight: 600 }}>Naziv sobe (SR):</label>
              <input
                type="text"
                value={aiDraft.title}
                onChange={(e) => setAiDraft({ ...aiDraft, title: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: THEME.surfaceAlt, color: THEME.textPrimary, border: '1px solid ' + THEME.borderStrong, fontSize: '14px', boxSizing: 'border-box' }}
              />
              {reviewChecks('title').map((w) => (
                <span key={w} style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#92400e', background: '#fef3c7', borderRadius: '6px', padding: '3px 7px' }}>
                  ⚠ {w}
                </span>
              ))}
            </div>

            <div>
              <label style={{ fontSize: '12px', color: THEME.textSecondary, display: 'block', marginBottom: '4px', fontWeight: 600 }}>Uvodna naracija - namena sobe (SR):</label>
              <textarea
                value={aiDraft.narrationIntro}
                onChange={(e) => setAiDraft({ ...aiDraft, narrationIntro: e.target.value })}
                rows={2}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: THEME.surfaceAlt, color: THEME.textPrimary, border: '1px solid ' + THEME.borderStrong, fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <FieldHint kind="intro" text={aiDraft.narrationIntro} checks={reviewChecks('intro')} />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: THEME.textSecondary, display: 'block', marginBottom: '4px', fontWeight: 600 }}>Uvodna naracija - specifično za sobu (SR):</label>
              <textarea
                value={aiDraft.narrationDetail}
                onChange={(e) => setAiDraft({ ...aiDraft, narrationDetail: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: THEME.surfaceAlt, color: THEME.textPrimary, border: '1px solid ' + THEME.borderStrong, fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <FieldHint kind="detail" text={aiDraft.narrationDetail} checks={reviewChecks('detail')} />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: THEME.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 600 }}>Generisane tačke ({aiDraft.waypoints.length}):</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
                {aiDraft.waypoints.map((wp, i) => (
                  <div key={i} style={{ backgroundColor: THEME.surfaceAlt, padding: '12px', borderRadius: '10px', fontSize: '13px', border: '1px solid ' + THEME.border, color: THEME.textPrimary, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ color: THEME.accent, fontWeight: 'bold' }}>Tačka {i + 1}:</span>
                    <input
                      type="text"
                      placeholder="Naslov tačke (SR)..."
                      value={getLocalizedText(wp.title_i18n, 'sr')}
                      onChange={(e) => {
                        const updatedWps = [...aiDraft.waypoints];
                        updatedWps[i] = {
                          ...updatedWps[i],
                          title_i18n: buildI18nObject(e.target.value, updatedWps[i].title_i18n, 'sr')
                        };
                        setAiDraft({ ...aiDraft, waypoints: updatedWps });
                      }}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: THEME.surface, color: THEME.textPrimary, border: '1px solid ' + THEME.borderStrong, fontSize: '12px', boxSizing: 'border-box' }}
                    />
                    <FieldHint kind="wpTitle" text={getLocalizedText(wp.title_i18n, 'sr')} checks={reviewChecks('wpTitle', i)} />
                    <textarea
                      placeholder="Opis / Tekst tačke (SR)..."
                      value={getLocalizedText(wp.text_i18n, 'sr')}
                      onChange={(e) => {
                        const updatedWps = [...aiDraft.waypoints];
                        updatedWps[i] = {
                          ...updatedWps[i],
                          text_i18n: buildI18nObject(e.target.value, updatedWps[i].text_i18n, 'sr')
                        };
                        setAiDraft({ ...aiDraft, waypoints: updatedWps });
                      }}
                      rows={2}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: THEME.surface, color: THEME.textPrimary, border: '1px solid ' + THEME.borderStrong, fontSize: '12px', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                    <FieldHint kind="wpText" text={getLocalizedText(wp.text_i18n, 'sr')} checks={reviewChecks('wpText', i)} />
                  </div>
                ))}
              </div>
            </div>

            {/* PROVERI I ISPRAVI - AI lektor pre prevoda i glasa */}
            <div style={{ backgroundColor: THEME.surfaceAlt, padding: '12px 14px', borderRadius: '10px', border: '1px solid ' + THEME.border, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: THEME.textSecondary, fontWeight: 600, flex: '1 1 260px' }}>
                  Pre prevoda: AI lektor proverava gramatiku, prirodnost za glas, ponavljanja i ono što se ne vidi na slici. Ništa ne menja sam.
                </span>
                <button
                  type="button"
                  onClick={handleReviewDraft}
                  disabled={reviewLoading}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: THEME.accent, color: '#fff', fontWeight: 700, fontSize: '13px', cursor: reviewLoading ? 'wait' : 'pointer', opacity: reviewLoading ? 0.7 : 1, flexShrink: 0 }}
                >
                  {reviewLoading ? 'Proveravam…' : review ? '🔍 Proveri ponovo' : '🔍 Proveri i ispravi'}
                </button>
              </div>

              {review && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: THEME.accent }}>
                      {review.suggestions.length === 0 && review.checks.length === 0
                        ? '✓ Tekst je u redu – nema predloga.'
                        : `${review.suggestions.length} predlog(a) · ${review.checks.length} za proveru (žuto ispod polja)`}
                    </span>
                    {review.suggestions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => review.suggestions.forEach(applySuggestion)}
                        style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid ' + THEME.borderStrong, background: THEME.surface, color: THEME.textPrimary, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Prihvati sve
                      </button>
                    )}
                  </div>
                  {review.suggestions.map((s, i) => (
                    <div key={`${s.field}-${s.index}-${i}`} style={{ background: THEME.surface, border: '1px solid ' + THEME.border, borderRadius: '8px', padding: '10px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <b style={{ color: THEME.textPrimary }}>{reviewTargetLabel(s.field, s.index)}</b>
                        <span style={{ display: 'flex', gap: '6px' }}>
                          <button type="button" onClick={() => dismissSuggestion(s)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid ' + THEME.borderStrong, background: THEME.surface, color: THEME.textSecondary, fontSize: '12px', cursor: 'pointer' }}>
                            Odbaci
                          </button>
                          <button type="button" onClick={() => applySuggestion(s)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: THEME.accent, color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                            Prihvati
                          </button>
                        </span>
                      </div>
                      <span style={{ color: '#b91c1c', textDecoration: 'line-through' }}>{s.original}</span>
                      <span style={{ color: '#15803d' }}>{s.suggested}</span>
                      {s.reason && <span style={{ fontSize: '11px', color: THEME.textSecondary }}>{s.reason}</span>}
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* NAPOMENA ZA AI: ono što se na panorami ne vidi (tour_ai_notes) */}
            <div style={{ backgroundColor: THEME.surfaceAlt, padding: '12px 14px', borderRadius: '10px', border: '1px solid ' + THEME.border, display: 'grid', gap: '8px' }}>
              <label htmlFor="ai-room-note" style={{ fontSize: '12px', color: THEME.textSecondary, fontWeight: 700 }}>
                Napomena za AI (ne vidi se u turi):
              </label>
              <textarea
                id="ai-room-note"
                value={aiRoomNote}
                maxLength={MAX_ROOM_NOTE_CHARS}
                rows={2}
                onChange={(e) => setAiRoomNote(e.target.value)}
                placeholder="npr. klima ostaje, nova kada 2024"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid ' + THEME.border, font: 'inherit', fontSize: '13px', resize: 'vertical' }}
              />
              <button
                type="button"
                disabled={aiLoading}
                onClick={() => void handleRedraftWithNote()}
                style={{ ...btnStyle, justifySelf: 'start', padding: '7px 12px', fontSize: '13px' }}
              >
                {aiLoading ? 'Pišem…' : '↻ Napiši ponovo sa napomenom'}
              </button>
            </div>

            {/* SELEKCIJA CILJNIH JEZIKA DIREKTNO U MODALU */}
            <div style={{ backgroundColor: THEME.surfaceAlt, padding: '12px 14px', borderRadius: '10px', border: '1px solid ' + THEME.border }}>
              <label style={{ fontSize: '12px', color: THEME.accent, display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                Prevedi i ubaci u scenu na sledeće jezike:
              </label>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {AVAILABLE_LANGUAGES.map((l) => (
                  <label key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: THEME.textPrimary }}>
                    <input
                      type="checkbox"
                      checked={targetLanguages.includes(l)}
                      onChange={() => toggleTargetLanguage(l)}
                      style={{ accentColor: THEME.accent, width: '16px', height: '16px' }}
                    />
                    {l.toUpperCase()} {l === 'sr' && '(Maternji)'}
                  </label>
                ))}
              </div>
            </div>

            {/* SELEKCIJA JEZIKA ZA AI GLASOVNU NARACIJU (OPCIONO) */}
            <div style={{ backgroundColor: THEME.surfaceAlt, padding: '12px 14px', borderRadius: '10px', border: '1px solid ' + THEME.border }}>
              <label style={{ fontSize: '12px', color: '#7c3aed', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                🎙️ Generiši AI glasovnu naraciju (MP3) za sledeće jezike (opciono):
              </label>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                {AVAILABLE_LANGUAGES
                  .filter((l) => targetLanguages.includes(l))
                  .map((l) => (
                    <label key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: THEME.textPrimary }}>
                      <input
                        type="checkbox"
                        checked={voiceLanguages.includes(l)}
                        onChange={() => toggleVoiceLanguage(l)}
                        style={{ accentColor: '#7c3aed', width: '16px', height: '16px' }}
                      />
                      {l.toUpperCase()}
                    </label>
                  ))}
              </div>
              <p style={{ fontSize: '11px', color: THEME.textSecondary, margin: '8px 0 0 0' }}>
                {voiceLanguages.length === 0
                  ? 'Nijedan jezik nije izabran - glas se neće generisati (biće samo tekst).'
                  : `Glas će biti generisan za: ${voiceLanguages.map((l) => l.toUpperCase()).join(', ')}. Ovo može potrajati.`}
              </p>
            </div>
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid ' + THEME.border, display: 'flex', gap: '10px' }}>
            <button
              onClick={handleConfirmDraftAndProcess}
              style={{ ...btnStyle, flex: 1, backgroundColor: THEME.accent, color: '#fff', borderColor: THEME.accent, padding: '12px', fontSize: '14px', fontWeight: 'bold' }}
            >
              🚀 Potvrdi Draft & Pokreni Prevođenje
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
