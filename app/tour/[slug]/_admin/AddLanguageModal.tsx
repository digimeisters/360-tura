'use client';

import { THEME, btnStyle } from '../theme';
import { AVAILABLE_LANGUAGES, roomHasLanguageContent } from './shared';
import { type TourAdmin } from './useTourAdmin';

/** Modal: Dodavanje (prevođenje) sobe na dodatni jezik u bilo kom trenutku */
export default function AddLanguageModal({ a }: { a: TourAdmin }) {
  const { t, showAddLanguageModal, setShowAddLanguageModal, addLanguageTargets, setAddLanguageTargets, currentRoom, toggleAddLanguageTarget, handleTranslateRoomLanguages } = a;
  return (
    <>
    {showAddLanguageModal && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: THEME.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ backgroundColor: THEME.surface, border: '1px solid ' + THEME.border, borderRadius: '20px', width: '100%', maxWidth: '420px', overflow: 'hidden', boxShadow: THEME.shadowLg }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid ' + THEME.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ color: THEME.accent, fontSize: '17px', margin: 0, fontWeight: 700 }}>🌐 Dodaj Jezik</h2>
            <button onClick={() => { setShowAddLanguageModal(false); setAddLanguageTargets([]); }} style={{ ...btnStyle, backgroundColor: THEME.surfaceAlt, color: THEME.textPrimary, borderColor: THEME.border, padding: '6px 12px' }}>
              {t.cancel}
            </button>
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: THEME.textSecondary, lineHeight: '1.5' }}>
              Prevodi <b>trenutno sačuvan srpski sadržaj</b> ove sobe (naslov, uvodna naracija, tačke) na
              izabrane jezike i dodaje ih uz postojeće - ništa se ne briše. Ako jezik već ima prevod, biće
              zamenjen novim.
            </p>

            <div>
              <label style={{ fontSize: '12px', color: THEME.accent, display: 'block', marginBottom: '8px', fontWeight: 700 }}>
                Za koje jezike da prevedem ovu sobu:
              </label>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {AVAILABLE_LANGUAGES
                  .filter((l) => l !== 'sr')
                  .map((l) => (
                    <label key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: THEME.textPrimary }}>
                      <input
                        type="checkbox"
                        checked={addLanguageTargets.includes(l)}
                        onChange={() => toggleAddLanguageTarget(l)}
                        style={{ accentColor: THEME.accent, width: '16px', height: '16px' }}
                      />
                      {l.toUpperCase()} {roomHasLanguageContent(currentRoom, l) ? '✅' : '○'}
                    </label>
                  ))}
              </div>
              <p style={{ fontSize: '11px', color: THEME.textSecondary, margin: '10px 0 0 0' }}>
                ✅ = već postoji prevod za taj jezik u ovoj sobi (biće osvežen). ○ = jezik još ne postoji u
                ovoj sobi.
              </p>
            </div>
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid ' + THEME.border }}>
            <button
              onClick={handleTranslateRoomLanguages}
              disabled={addLanguageTargets.length === 0}
              style={{
                ...btnStyle,
                width: '100%',
                backgroundColor: addLanguageTargets.length === 0 ? THEME.surfaceAlt : THEME.accent,
                color: addLanguageTargets.length === 0 ? THEME.textMuted : '#fff',
                borderColor: THEME.accent,
                padding: '12px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: addLanguageTargets.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              🌐 Prevedi i Sačuvaj
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
