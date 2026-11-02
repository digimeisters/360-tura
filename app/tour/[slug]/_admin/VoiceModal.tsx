'use client';

import { THEME, btnStyle } from '../theme';
import { AVAILABLE_LANGUAGES } from './shared';
import { type TourAdmin } from './useTourAdmin';

/** Modal: Samostalno generisanje/osvežavanje AI glasa za postojeći sadržaj */
export default function VoiceModal({ a }: { a: TourAdmin }) {
  const { t, voiceLanguages, showVoiceModal, setShowVoiceModal, toggleVoiceLanguage, handleGenerateVoiceForRoom } = a;
  return (
    <>
    {showVoiceModal && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: THEME.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ backgroundColor: THEME.surface, border: '1px solid ' + THEME.border, borderRadius: '20px', width: '100%', maxWidth: '420px', overflow: 'hidden', boxShadow: THEME.shadowLg }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid ' + THEME.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ color: '#7c3aed', fontSize: '17px', margin: 0, fontWeight: 700 }}>🎙️ AI Glasovna Naracija</h2>
            <button onClick={() => setShowVoiceModal(false)} style={{ ...btnStyle, backgroundColor: THEME.surfaceAlt, color: THEME.textPrimary, borderColor: THEME.border, padding: '6px 12px' }}>
              {t.cancel}
            </button>
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: THEME.textSecondary, lineHeight: '1.5' }}>
              Generiše (ili osvežava) AI glas na osnovu <b>trenutno sačuvanog</b> teksta u ovoj sobi
              (uvodna naracija + info-tačke), za jezike koje izabereš. Postojeći MP3 za taj jezik biće
              zamenjen novim.
            </p>

            <div>
              <label style={{ fontSize: '12px', color: '#7c3aed', display: 'block', marginBottom: '8px', fontWeight: 700 }}>
                Za koje jezike da generišem glas:
              </label>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {AVAILABLE_LANGUAGES.map((l) => (
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
            </div>
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid ' + THEME.border }}>
            <button
              onClick={handleGenerateVoiceForRoom}
              disabled={voiceLanguages.length === 0}
              style={{
                ...btnStyle,
                width: '100%',
                backgroundColor: voiceLanguages.length === 0 ? THEME.surfaceAlt : '#7c3aed',
                color: voiceLanguages.length === 0 ? THEME.textMuted : '#fff',
                borderColor: '#7c3aed',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: voiceLanguages.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              🎙️ Generiši Glas
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
