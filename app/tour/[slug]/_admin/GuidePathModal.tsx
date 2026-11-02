'use client';

import { THEME, btnStyle } from '../theme';
import { getLocalizedText } from '../utils';
import { describeGuidePathError } from '../guidePath';
import { type TourAdmin } from './useTourAdmin';

/** Modal: Putanja automatskog vodiča (na nivou cele ture, ne sobe) */
export default function GuidePathModal({ a }: { a: TourAdmin }) {
  const { tour, t, showGuidePathModal, setShowGuidePathModal, guidePathInput, setGuidePathInput, savingGuidePath, guideLinkCopied, roomsByOrder, guideLink, copyGuideLink, guidePathSteps, guidePathError, handleSaveGuidePath } = a;
  return (
    <>
    {showGuidePathModal && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: THEME.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ backgroundColor: THEME.surface, border: '1px solid ' + THEME.border, borderRadius: '20px', width: '100%', maxWidth: '480px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: THEME.shadowLg }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid ' + THEME.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ color: '#059669', fontSize: '17px', margin: 0, fontWeight: 700 }}>🧭 Putanja vodiča</h2>
            <button onClick={() => setShowGuidePathModal(false)} style={{ ...btnStyle, backgroundColor: THEME.surfaceAlt, color: THEME.textPrimary, borderColor: THEME.border, padding: '6px 12px' }}>
              {t.cancel}
            </button>
          </div>

          <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: THEME.textSecondary, lineHeight: '1.5' }}>
              Redosled kojim automatski vodič šeta kroz sobe, upisan kao brojevi odvojeni zarezom.
              Ista soba sme da se ponovi (npr. hodnik kao prolaz između dve grane) - drugi put je
              vodič samo tiho prođe, bez ponavljanja priče. Ostavi prazno da tura nema dugme za
              automatski vodič.
            </p>

            <div style={{ backgroundColor: THEME.surfaceAlt, padding: '12px 14px', borderRadius: '10px', border: '1px solid ' + THEME.border, display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
              {roomsByOrder.map((r) => (
                <div key={r.id} style={{ fontSize: '12.5px', color: THEME.textPrimary, display: 'flex', gap: '8px' }}>
                  <span style={{ color: THEME.accent, fontWeight: 700, minWidth: '1.4em' }}>{r.order_index}</span>
                  <span>{getLocalizedText(r.title_i18n, 'sr') || '(bez naziva)'}</span>
                </div>
              ))}
            </div>

            <div>
              <label style={{ fontSize: '12px', color: THEME.textSecondary, display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                Putanja (npr. 1,2,3,2,4,2,5):
              </label>
              <input
                type="text"
                value={guidePathInput}
                onChange={(e) => setGuidePathInput(e.target.value)}
                placeholder="1,2,3,2,4,2,5"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: THEME.surfaceAlt, color: THEME.textPrimary, border: '1px solid ' + (guidePathError ? THEME.danger : THEME.borderStrong), fontSize: '14px', fontFamily: 'monospace', boxSizing: 'border-box' }}
              />
              {guidePathError ? (
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: THEME.danger }}>{describeGuidePathError(guidePathError)}</p>
              ) : guidePathSteps.length > 0 ? (
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: THEME.textSecondary }}>
                  {guidePathSteps.length} koraka, {new Set(guidePathSteps).size} različitih soba.
                </p>
              ) : null}
            </div>

            {tour?.guide_path && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: THEME.textSecondary, fontWeight: 600 }}>
                  Link koji otvara turu odmah sa vodičem:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={guideLink}
                    onFocus={(e) => e.currentTarget.select()}
                    style={{ flex: 1, minWidth: 0, padding: '9px 10px', borderRadius: '8px', background: THEME.surfaceAlt, color: THEME.textPrimary, border: '1px solid ' + THEME.borderStrong, fontSize: '12.5px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                  />
                  <button
                    onClick={copyGuideLink}
                    style={{ ...btnStyle, backgroundColor: THEME.surfaceAlt, color: THEME.textPrimary, borderColor: THEME.border, padding: '8px 12px', whiteSpace: 'nowrap' }}
                  >
                    {guideLinkCopied ? '✅ Kopiran' : '🔗 Kopiraj'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid ' + THEME.border }}>
            <button
              onClick={handleSaveGuidePath}
              disabled={savingGuidePath || (!!guidePathInput.trim() && !!guidePathError)}
              style={{
                ...btnStyle,
                width: '100%',
                backgroundColor: savingGuidePath || (guidePathInput.trim() && guidePathError) ? THEME.surfaceAlt : '#059669',
                color: savingGuidePath || (guidePathInput.trim() && guidePathError) ? THEME.textMuted : '#fff',
                borderColor: '#059669',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: savingGuidePath || (guidePathInput.trim() && guidePathError) ? 'not-allowed' : 'pointer'
              }}
            >
              {savingGuidePath ? 'Čuvanje...' : '🧭 Sačuvaj putanju'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
