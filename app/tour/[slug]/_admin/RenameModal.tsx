'use client';

import { THEME, btnStyle } from '../theme';
import { type TourAdmin } from './useTourAdmin';

/** Modal: Preimenovanje trenutne sobe, u bilo kom trenutku */
export default function RenameModal({ a }: { a: TourAdmin }) {
  const { t, showRenameModal, setShowRenameModal, renameInput, setRenameInput, orderInput, setOrderInput, savingRename, handleSaveRename } = a;
  return (
    <>
    {showRenameModal && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: THEME.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ backgroundColor: THEME.surface, border: '1px solid ' + THEME.border, borderRadius: '20px', width: '100%', maxWidth: '420px', overflow: 'hidden', boxShadow: THEME.shadowLg }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid ' + THEME.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ color: '#f59e0b', fontSize: '17px', margin: 0, fontWeight: 700 }}>✏️ Preimenuj sobu</h2>
            <button onClick={() => setShowRenameModal(false)} style={{ ...btnStyle, backgroundColor: THEME.surfaceAlt, color: THEME.textPrimary, borderColor: THEME.border, padding: '6px 12px' }}>
              {t.cancel}
            </button>
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '12px', color: THEME.textSecondary, fontWeight: 600 }}>Naziv sobe (SR):</label>
            <input
              type="text"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameInput.trim()) handleSaveRename();
              }}
              autoFocus
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: THEME.surfaceAlt, color: THEME.textPrimary, border: '1px solid ' + THEME.borderStrong, fontSize: '14px', boxSizing: 'border-box' }}
            />

            <label style={{ fontSize: '12px', color: THEME.textSecondary, fontWeight: 600, marginTop: '4px' }}>Redni broj (redosled soba):</label>
            <input
              type="number"
              min={1}
              step={1}
              value={orderInput}
              onChange={(e) => setOrderInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameInput.trim()) handleSaveRename();
              }}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: THEME.surfaceAlt, color: THEME.textPrimary, border: '1px solid ' + THEME.borderStrong, fontSize: '14px', boxSizing: 'border-box' }}
            />
            <p style={{ margin: 0, fontSize: '12px', color: THEME.textSecondary, lineHeight: '1.5' }}>
              Naziv menja samo srpski (ostale jezike posle osveži preko „🌐 Jezici“). Redni broj određuje
              redosled soba u turi - novi redosled se vidi od sledećeg učitavanja ture.
            </p>
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid ' + THEME.border }}>
            <button
              onClick={handleSaveRename}
              disabled={!renameInput.trim() || savingRename}
              style={{
                ...btnStyle,
                width: '100%',
                backgroundColor: !renameInput.trim() || savingRename ? THEME.surfaceAlt : '#f59e0b',
                color: !renameInput.trim() || savingRename ? THEME.textMuted : '#1e1b2e',
                borderColor: '#f59e0b',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: !renameInput.trim() || savingRename ? 'not-allowed' : 'pointer'
              }}
            >
              {savingRename ? 'Čuvanje...' : '💾 Sačuvaj naziv'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
