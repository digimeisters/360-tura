'use client';

import { THEME, btnStyle } from '../theme';
import { type TourAdmin } from './useTourAdmin';

/** Modal: Izmena teksta uvodne naracije, u bilo kom trenutku */
export default function NarrationModal({ a }: { a: TourAdmin }) {
  const { t, showNarrationModal, setShowNarrationModal, narrationIntroInput, setNarrationIntroInput, narrationDetailInput, setNarrationDetailInput, savingNarration, handleSaveNarration } = a;
  return (
    <>
    {showNarrationModal && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: THEME.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ backgroundColor: THEME.surface, border: '1px solid ' + THEME.border, borderRadius: '20px', width: '100%', maxWidth: '480px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: THEME.shadowLg }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid ' + THEME.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ color: '#0d9488', fontSize: '17px', margin: 0, fontWeight: 700 }}>📝 Uvodna naracija</h2>
            <button onClick={() => setShowNarrationModal(false)} style={{ ...btnStyle, backgroundColor: THEME.surfaceAlt, color: THEME.textPrimary, borderColor: THEME.border, padding: '6px 12px' }}>
              {t.cancel}
            </button>
          </div>

          <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: THEME.textSecondary, display: 'block', marginBottom: '4px', fontWeight: 600 }}>Uvodna naracija - namena sobe (SR):</label>
              <textarea
                value={narrationIntroInput}
                onChange={(e) => setNarrationIntroInput(e.target.value)}
                rows={2}
                autoFocus
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: THEME.surfaceAlt, color: THEME.textPrimary, border: '1px solid ' + THEME.borderStrong, fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: THEME.textSecondary, display: 'block', marginBottom: '4px', fontWeight: 600 }}>Uvodna naracija - specifično za sobu (SR):</label>
              <textarea
                value={narrationDetailInput}
                onChange={(e) => setNarrationDetailInput(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: THEME.surfaceAlt, color: THEME.textPrimary, border: '1px solid ' + THEME.borderStrong, fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <p style={{ margin: 0, fontSize: '12px', color: THEME.textSecondary, lineHeight: '1.5' }}>
              Menja se samo srpski tekst. Ako je za ovu sobu već generisan glas, i dalje govori stari
              tekst dok ga ponovo ne pokreneš preko „🎙️ Glas“. Ostale jezike osveži preko „🌐 Jezici“.
            </p>
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid ' + THEME.border }}>
            <button
              onClick={handleSaveNarration}
              disabled={savingNarration}
              style={{
                ...btnStyle,
                width: '100%',
                backgroundColor: savingNarration ? THEME.surfaceAlt : '#0d9488',
                color: savingNarration ? THEME.textMuted : '#fff',
                borderColor: '#0d9488',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: savingNarration ? 'not-allowed' : 'pointer'
              }}
            >
              {savingNarration ? 'Čuvanje...' : '💾 Sačuvaj naraciju'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
