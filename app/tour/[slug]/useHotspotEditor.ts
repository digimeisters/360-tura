import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { Language, Room, Waypoint } from './types';
import {
  buildI18nObject,
  getLocalizedText,
  mergeAudioI18n,
  parseEstablish,
  parseWaypoints
} from './utils';

/**
 * Admin uređivanje tačaka u panorami (dodavanje, pomeranje, brisanje,
 * uvodni pogled sobe) i oznaka sobe na tlocrtu. Posetilac ovo nikad ne
 * pokreće - klik na tačku ide ovde samo kad je admin prijavljen.
 *
 * `refreshHotspotsRef` pokazuje na refreshViewerHotspots iz page.tsx: ta
 * funkcija gradi tačke preko buildHotspotConfig, koji opet zove
 * handleStartEditWaypoint odavde - ref prekida taj krug zavisnosti.
 */

export type HotspotType = 'navigation' | 'info' | 'establish';
export type RefreshHotspots = (waypoints: Waypoint[], lang: Language) => void;

export function useHotspotEditor({
  rooms,
  setRooms,
  roomIdx,
  viewerRef,
  langRef,
  refreshHotspotsRef
}: {
  rooms: Room[];
  setRooms: Dispatch<SetStateAction<Room[]>>;
  roomIdx: number;
  // Pannellum viewer nema tipove.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  viewerRef: MutableRefObject<any>;
  langRef: MutableRefObject<Language>;
  refreshHotspotsRef: MutableRefObject<RefreshHotspots | null>;
}) {
  const [pendingCoords, setPendingCoords] = useState<{ yaw: number; pitch: number } | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  // Ref za klik u panorami (v.on('mouseup')), koji se veže jednom po sceni.
  const editingIndexRef = useRef<number | null>(null);
  const [hotspotType, setHotspotType] = useState<HotspotType>('navigation');
  const [targetRoomId, setTargetRoomId] = useState<string | number>('');

  const [hotspotText, setHotspotText] = useState<string>('');
  const [hotspotTitle, setHotspotTitle] = useState<string>('');
  const [hotspotAudioUrl, setHotspotAudioUrl] = useState<string>('');

  const refresh = (waypoints: Waypoint[]) => refreshHotspotsRef.current?.(waypoints, langRef.current);

  const handleStartEditWaypoint = useCallback((index: number) => {
    const currentRoom = rooms[roomIdx];
    if (!currentRoom) return;
    const waypointsList = parseWaypoints(currentRoom.waypoints_i18n);
    const targetWp = waypointsList[index];
    if (!targetWp) return;

    setEditingIndex(index);
    editingIndexRef.current = index;
    setPendingCoords({ pitch: targetWp.pitch || 0, yaw: targetWp.yaw || 0 });

    if (viewerRef.current) {
      viewerRef.current.lookAt(targetWp.pitch || 0, targetWp.yaw || 0, 70, 1000);
    }

    const isNav = targetWp.type === 'navigation' || Boolean(targetWp.targetRoomId);
    setHotspotType(isNav ? 'navigation' : 'info');

    setHotspotText(getLocalizedText(targetWp.text_i18n, langRef.current));
    setHotspotTitle(getLocalizedText(targetWp.title_i18n, langRef.current));
    setHotspotAudioUrl(getLocalizedText(targetWp.audio_url_i18n ?? targetWp.audio_url, langRef.current));
    setTargetRoomId(targetWp.targetRoomId || '');
  }, [rooms, roomIdx, viewerRef, langRef]);

  /**
   * Admin klik u panoramu (v.on('mouseup') u page.tsx). Stabilna funkcija -
   * čita samo ref i settere, pa je scena ne mora ponovo vezivati.
   */
  const handleViewerClick = useCallback((pitch: number, yaw: number) => {
    if (editingIndexRef.current !== null) {
      // Već postoji tačka u režimu izmene -> ovaj klik je SAMO pomeranje
      // na novu poziciju. Ne diramo editingIndex ni već unet naslov/tekst/audio,
      // da se ne izgube podaci koje je korisnik već uneo.
      setPendingCoords({ yaw, pitch });
    } else {
      // Nije aktivno editovanje - ovo je klik za kreiranje potpuno nove tačke
      setPendingCoords({ yaw, pitch });
      setHotspotText('');
      setHotspotTitle('');
      setHotspotAudioUrl('');
      setTargetRoomId('');
    }
  }, []);

  // ŽIVI PREVIEW POMERANJA: čim se pendingCoords promeni dok se edituje POSTOJEĆA
  // tačka (editingIndex !== null), odmah vizuelno pomeri marker na novu poziciju
  // na vieweru, bez čekanja da se klikne "Sačuvaj". Ovo NE upisuje ništa u bazu -
  // samo daje trenutni vizuelni fidbek dok pozicioniraš tačku.
  useEffect(() => {
    if (!pendingCoords || editingIndex === null) return;
    const currentRoom = rooms[roomIdx];
    if (!currentRoom) return;

    const waypointsList = parseWaypoints(currentRoom.waypoints_i18n);
    if (!waypointsList[editingIndex]) return;

    const previewList = waypointsList.map((wp, idx) =>
      idx === editingIndex ? { ...wp, yaw: pendingCoords.yaw, pitch: pendingCoords.pitch } : wp
    );

    refreshHotspotsRef.current?.(previewList, langRef.current);
  }, [pendingCoords, editingIndex, rooms, roomIdx, refreshHotspotsRef, langRef]);

  const handleCancelEdit = () => {
    setPendingCoords(null);
    setEditingIndex(null);
    editingIndexRef.current = null;
    setHotspotText('');
    setHotspotTitle('');
    setHotspotAudioUrl('');
    setTargetRoomId('');
  };

  const handleSaveHotspot = async () => {
    const currentRoom = rooms[roomIdx];
    if (!currentRoom || !pendingCoords) return;

    const updatedWaypoints = parseWaypoints(currentRoom.waypoints_i18n);
    let updatedEstablish = parseEstablish(currentRoom.establish_i18n);

    if (hotspotType === 'establish') {
      updatedEstablish = {
        ...updatedEstablish,
        fromYaw: pendingCoords.yaw,
        pitch: pendingCoords.pitch,
        audio_url_i18n: mergeAudioI18n(
          hotspotAudioUrl,
          updatedEstablish.audio_url_i18n ?? updatedEstablish.audio_url,
          langRef.current
        ),
        text_i18n: buildI18nObject(hotspotText, updatedEstablish.text_i18n, langRef.current)
      };
    } else {
      const existingWp = editingIndex !== null ? updatedWaypoints[editingIndex] : undefined;

      // VAŽNO: ...existingWp da se ne izgube prevedeni jezici!
      const newWaypoint: Waypoint = {
        ...existingWp,
        yaw: pendingCoords.yaw,
        pitch: pendingCoords.pitch,
        type: hotspotType,
        targetRoomId: hotspotType === 'navigation' ? targetRoomId : undefined,
        audio_url_i18n: mergeAudioI18n(
          hotspotAudioUrl,
          existingWp?.audio_url_i18n ?? existingWp?.audio_url,
          langRef.current
        ),
        title_i18n: buildI18nObject(hotspotTitle, existingWp?.title_i18n, langRef.current),
        text_i18n: buildI18nObject(hotspotText, existingWp?.text_i18n, langRef.current)
      };

      if (editingIndex !== null) {
        updatedWaypoints[editingIndex] = newWaypoint;
      } else {
        updatedWaypoints.push(newWaypoint);
      }
    }

    try {
      const { error: dbErr } = await supabase
        .from('rooms')
        .update({
          waypoints_i18n: updatedWaypoints,
          establish_i18n: updatedEstablish
        } as never)
        .eq('id', String(currentRoom.id));

      if (dbErr) throw dbErr;

      setRooms(rooms.map((r, i) => (i === roomIdx ? { ...r, waypoints_i18n: updatedWaypoints, establish_i18n: updatedEstablish } : r)));

      handleCancelEdit();

      // Ključno: odmah osvežavamo prikaz tačaka u Pannellum-u koristeći SVEŽ niz
      // (updatedWaypoints), a ne rooms state koji React još nije stigao da ažurira.
      refresh(updatedWaypoints);
    } catch (err) {
      alert('Greška pri čuvanju tačke: ' + (err as Error).message);
    }
  };

  const handleDeleteHotspot = async () => {
    if (editingIndex === null) return;
    const currentRoom = rooms[roomIdx];
    if (!currentRoom) return;

    const updatedWaypoints = parseWaypoints(currentRoom.waypoints_i18n);
    updatedWaypoints.splice(editingIndex, 1);

    try {
      const { error: dbErr } = await supabase
        .from('rooms')
        .update({ waypoints_i18n: updatedWaypoints } as never)
        .eq('id', String(currentRoom.id));

      if (dbErr) throw dbErr;

      setRooms((prev) => prev.map((r, i) => (i === roomIdx ? { ...r, waypoints_i18n: updatedWaypoints } : r)));

      handleCancelEdit();
      refresh(updatedWaypoints);
    } catch (err) {
      alert('Greška pri brisanju tačke: ' + (err as Error).message);
    }
  };

  // Admin klikne na tlocrt (Skica modal) da postavi/pomeri oznaku TRENUTNE
  // sobe (rooms[roomIdx]) na tu poziciju - procenat širine/visine slike, ne
  // pikseli, da oznaka ostane tačna bez obzira na veličinu ekrana.
  const handleSetFloorplanMarker = async (e: React.MouseEvent<HTMLImageElement>) => {
    const currentRoom = rooms[roomIdx];
    if (!currentRoom) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    const { error: updateErr } = await supabase
      .from('rooms')
      .update({ floorplan_x: xPct, floorplan_y: yPct })
      .eq('id', String(currentRoom.id));

    if (updateErr) {
      alert('Greška pri čuvanju pozicije na tlocrtu: ' + updateErr.message);
      return;
    }

    setRooms((prev) => prev.map((r, idx) => (idx === roomIdx ? { ...r, floorplan_x: xPct, floorplan_y: yPct } : r)));
  };

  return {
    pendingCoords,
    editingIndex,
    handleStartEditWaypoint,
    handleViewerClick,
    handleSetFloorplanMarker,
    /** Props za <HotspotForm> (TourAdminPanels.tsx). */
    formProps: {
      coords: pendingCoords,
      editing: editingIndex !== null,
      type: hotspotType,
      onType: setHotspotType,
      targetRoomId,
      onTargetRoom: setTargetRoomId,
      title: hotspotTitle,
      onTitle: setHotspotTitle,
      text: hotspotText,
      onText: setHotspotText,
      audioUrl: hotspotAudioUrl,
      onAudioUrl: setHotspotAudioUrl,
      onSave: handleSaveHotspot,
      onDelete: handleDeleteHotspot,
      onCancel: handleCancelEdit
    }
  };
}
