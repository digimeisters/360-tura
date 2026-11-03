'use client';

import { supabase } from '../../../lib/supabaseClient';
import { THEME } from '../theme';
import { getLocalizedText, parseWaypoints } from '../utils';
import BulkRoomFill from '../BulkRoomFill';
import { toolbarButtonStyle } from './shared';
import ToolbarMenu from './ToolbarMenu';
import { type TourAdmin } from './useTourAdmin';

/** Admin dugmad u gornjoj traci ture (crta se kroz portal u toolbarSlot). */
export default function AdminToolbar({ a }: { a: TourAdmin }) {
  const { tour, rooms, setRooms, aiLoading, showBulkFill, setShowBulkFill, translationProgress, voiceProgress, setShowVoiceModal, setShowAddLanguageModal, panoramaUploadProgress, panoramaFileInputRef, creatingRoom, deletingRoom, currentRoom, refreshIfShown, openGuidePathModal, handleAddRoom, handleDeleteRoom, openRenameModal, openNarrationModal, handleAutoPopulateRoom, handlePanoramaFileSelected, handleDeletePanorama } = a;
  // Naslov menija: na koju sobu se radnje odnose.
  const roomName = currentRoom ? `Soba: ${getLocalizedText(currentRoom.title_i18n, 'sr') || 'bez naziva'}` : null;
  return (
    <>
      {/* Sobe, panorama i AI kao tri menija - traka staje u jedan red. */}
      <ToolbarMenu
        label={creatingRoom ? '➕ Kreiranje…' : deletingRoom ? '🗑️ Brisanje…' : '🚪 Sobe'}
        color={THEME.success}
        heading={roomName}
        items={[
          { label: '➕ Dodaj sobu', title: 'Dodaj novu (praznu) sobu u ovu turu', onClick: handleAddRoom, disabled: creatingRoom },
          { label: '✏️ Preimenuj', title: 'Promeni naziv trenutne sobe, u bilo kom trenutku', onClick: openRenameModal, disabled: !currentRoom },
          ...(currentRoom
            ? [{ label: '🗑️ Obriši sobu', title: 'Trajno obriši ovu sobu - panoramu, tačke i sve što na nju vodi iz drugih soba', onClick: () => void handleDeleteRoom(), disabled: deletingRoom, danger: true }]
            : [])
        ]}
      />

      <input
        ref={panoramaFileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePanoramaFileSelected}
        style={{ display: 'none' }}
      />
      <ToolbarMenu
        label="🖼️ Panorama"
        color="#0891b2"
        heading={roomName}
        items={[
          {
            label: currentRoom?.panorama_url_cf ? '📤 Zameni panoramu' : '📤 Dodaj panoramu',
            title: 'Otpremi/zameni panoramu ove sobe (šalje se na Cloudflare)',
            onClick: () => panoramaFileInputRef.current?.click(),
            disabled: !!panoramaUploadProgress
          },
          ...(currentRoom?.panorama_url_cf
            ? [{ label: '🗑️ Obriši panoramu', title: 'Obriši panoramu ove sobe (pogrešno otpremljena slika i sl.)', onClick: () => void handleDeletePanorama(), disabled: !!panoramaUploadProgress, danger: true }]
            : [])
        ]}
      />

      <ToolbarMenu
        label={aiLoading ? '🤖 Generisanje…' : '🤖 AI'}
        color="#7c3aed"
        heading={roomName}
        items={[
          { label: 'Popuni ovu sobu', title: 'AI predlog naziva, naracije i tačaka za sobu koju gledaš', onClick: handleAutoPopulateRoom, disabled: aiLoading },
          { label: 'Popuni sve sobe', title: 'AI tekst za više soba odjednom, sa pregledom svake pre čuvanja', onClick: () => setShowBulkFill(true), disabled: aiLoading }
        ]}
      />

      <button
        onClick={openNarrationModal}
        disabled={!currentRoom}
        title="Promeni tekst uvodne naracije ove sobe, u bilo kom trenutku"
        style={{ ...toolbarButtonStyle, background: '#0d9488' }}
      >
        📝 Naracija
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
