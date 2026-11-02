'use client';

import { supabase } from '../../../lib/supabaseClient';
import { THEME } from '../theme';
import { parseWaypoints } from '../utils';
import BulkRoomFill from '../BulkRoomFill';
import { toolbarButtonStyle } from './shared';
import { type TourAdmin } from './useTourAdmin';

/** Admin dugmad u gornjoj traci ture (crta se kroz portal u toolbarSlot). */
export default function AdminToolbar({ a }: { a: TourAdmin }) {
  const { tour, rooms, setRooms, aiLoading, showBulkFill, setShowBulkFill, translationProgress, voiceProgress, setShowVoiceModal, setShowAddLanguageModal, panoramaUploadProgress, panoramaFileInputRef, creatingRoom, deletingRoom, currentRoom, refreshIfShown, openGuidePathModal, handleAddRoom, handleDeleteRoom, openRenameModal, openNarrationModal, handleAutoPopulateRoom, handlePanoramaFileSelected, handleDeletePanorama } = a;
  return (
    <>
      <button
        onClick={handleAddRoom}
        disabled={creatingRoom}
        title="Dodaj novu (praznu) sobu u ovu turu"
        style={{ ...toolbarButtonStyle, background: THEME.success }}
      >
        {creatingRoom ? '➕ Kreiranje...' : '➕ Soba'}
      </button>

      <button
        onClick={openRenameModal}
        disabled={!currentRoom}
        title="Promeni naziv trenutne sobe, u bilo kom trenutku"
        style={{ ...toolbarButtonStyle, background: '#f59e0b', color: '#1e1b2e' }}
      >
        ✏️ Preimenuj
      </button>

      {currentRoom && (
        <button
          onClick={() => void handleDeleteRoom()}
          disabled={deletingRoom}
          title="Trajno obriši ovu sobu - panoramu, tačke i sve što na nju vodi iz drugih soba"
          style={{ ...toolbarButtonStyle, background: THEME.danger }}
        >
          {deletingRoom ? '🗑️ Brisanje...' : '🗑️ Soba'}
        </button>
      )}

      <button
        onClick={openNarrationModal}
        disabled={!currentRoom}
        title="Promeni tekst uvodne naracije ove sobe, u bilo kom trenutku"
        style={{ ...toolbarButtonStyle, background: '#0d9488' }}
      >
        📝 Naracija
      </button>

      <input
        ref={panoramaFileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePanoramaFileSelected}
        style={{ display: 'none' }}
      />
      <button
        onClick={() => panoramaFileInputRef.current?.click()}
        disabled={!!panoramaUploadProgress}
        title="Otpremi/zameni panoramu ove sobe (šalje se na Cloudflare)"
        style={{ ...toolbarButtonStyle, background: '#0891b2' }}
      >
        📤 Panorama
      </button>

      {currentRoom?.panorama_url_cf && (
        <button
          onClick={() => void handleDeletePanorama()}
          disabled={!!panoramaUploadProgress}
          title="Obriši panoramu ove sobe (pogrešno otpremljena slika i sl.)"
          style={{ ...toolbarButtonStyle, background: THEME.danger }}
        >
          🗑️ Panorama
        </button>
      )}

      <button
        onClick={handleAutoPopulateRoom}
        disabled={aiLoading}
        style={{ ...toolbarButtonStyle, background: '#7c3aed' }}
      >
        {aiLoading ? '🤖 Generisanje...' : '🤖 AI Popuni Sobu'}
      </button>

      <button onClick={() => setShowBulkFill(true)} disabled={aiLoading} style={{ ...toolbarButtonStyle, background: '#6d28d9' }} title="AI tekst za više soba odjednom, sa pregledom svake pre čuvanja">
        🤖 AI sve sobe
      </button>
      {showBulkFill && (
        <BulkRoomFill
          rooms={rooms}
          tour={tour}
          onRoomSaved={(roomId, patch) => {
            setRooms((prev) => prev.map((r) => (String(r.id) === String(roomId) ? { ...r, ...patch } : r)));
            refreshIfShown(roomId, parseWaypoints(patch.waypoints_i18n));
          }}
          onClose={() => setShowBulkFill(false)}
        />
      )}

      <button
        onClick={() => setShowVoiceModal(true)}
        disabled={!!voiceProgress}
        title="Generiši ili osveži AI glasovnu naraciju za postojeći tekst ove sobe"
        style={{ ...toolbarButtonStyle, background: '#c084fc', color: '#1e1b2e' }}
      >
        🎙️ Glas
      </button>

      <button
        onClick={() => setShowAddLanguageModal(true)}
        disabled={!!translationProgress}
        title="Dodaj (prevedi) ovu sobu na još neki jezik, u bilo kom trenutku"
        style={{ ...toolbarButtonStyle, background: '#0ea5e9' }}
      >
        🌐 Jezici
      </button>

      <button
        onClick={openGuidePathModal}
        title="Putanja automatskog vodiča kroz sve sobe"
        style={{ ...toolbarButtonStyle, background: '#059669' }}
      >
        🧭 Vodič
      </button>

      <button
        onClick={() => void supabase.auth.signOut()}
        title="Odjavi se iz admin režima"
        style={{
          ...toolbarButtonStyle,
          background: THEME.dangerSoft,
          border: '1px solid ' + THEME.border,
          color: THEME.danger
        }}
      >
        🔒 Odjava
      </button>
    </>
  );
}
