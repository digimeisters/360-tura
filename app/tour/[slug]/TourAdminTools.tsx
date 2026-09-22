'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabaseClient';
import { adminAuthHeader } from '../../lib/authFetch';
import { Language, Waypoint, EstablishData, Room, Tour } from './types';
import { translations } from './translations';
import { THEME, btnStyle } from './theme';
import { getLocalizedText, parseWaypoints, parseEstablish, composeEstablishText, buildI18nObject } from './utils';
import { translateRoomToLanguages, hasExactLangText } from './adminUtils';
import { describeGuidePathError, parseGuidePath, validateGuidePath } from './guidePath';

/**
 * Admin alati ture: dodavanje sobe, otpremanje panorame, AI popuna, glas i
 * jezici, sa svojim modalima.
 *
 * Stoji u posebnom fajlu jer page.tsx ovo učitava preko next/dynamic tek kad
 * postoji admin sesija. Posetilac ture ga nikad ne skida - a to je oko
 * polovine koda koji je ranije stizao svakome ko otvori link.
 *
 * Uređivanje hotspotova namerno NIJE ovde: klik na tačku u panorami ga
 * pokreće direktno iz viewer-a, pa mora da živi uz viewer u page.tsx.
 */

const AVAILABLE_LANGUAGES: Language[] = ['sr', 'en', 'de', 'ru'];

type AiDraft = { title: string; narrationIntro: string; narrationDetail: string; waypoints: Waypoint[] };

export type TourAdminToolsProps = {
  /** 'full' = dugmad u traci i modali; 'empty' = samo dugme za prvu sobu. */
  variant: 'full' | 'empty';
  slug: string;
  tour: Tour | null;
  setTour: React.Dispatch<React.SetStateAction<Tour | null>>;
  rooms: Room[];
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  roomIdx: number;
  setRoomIdx: (index: number) => void;
  lang: Language;
  langRef: React.MutableRefObject<Language>;
  refreshViewerHotspots: (waypoints: Waypoint[], l: Language) => void;
  /** Soba je napravljena - tura mora da se pokrene i greška da nestane. */
  onRoomCreated: () => void;
  /**
   * Mesto u gornjoj traci ture gde idu admin dugmad. Dugmad se crtaju kroz
   * portal, jer traka pripada page.tsx, a stanje koje dugmad pokreću (draft,
   * napredak prevoda...) mora da bude na istom mestu kao i modali.
   */
  toolbarSlot: HTMLElement | null;
};

const toolbarButtonStyle: React.CSSProperties = {
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  padding: '4px 8px',
  fontSize: '11px',
  fontWeight: 'bold',
  cursor: 'pointer',
  marginRight: '6px'
};

// Da li soba već ima sadržaj za dati jezik - modal za dodavanje jezika po
// tome pokazuje šta je već prevedeno, a šta nedostaje.
function roomHasLanguageContent(room: Room | undefined, l: Language): boolean {
  if (!room) return false;

  const checkI18n = (data: unknown): boolean => {
    if (!data) return false;
    if (typeof data === 'object') return Boolean((data as Record<string, string>)[l]);
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return Boolean(parsed && parsed[l]);
      } catch {
        return false;
      }
    }
    return false;
  };

  if (checkI18n(room.title_i18n)) return true;

  const establishData = parseEstablish(room.establish_i18n);
  if (checkI18n(establishData.intro_i18n) || checkI18n(establishData.detail_i18n) || checkI18n(establishData.text_i18n)) {
    return true;
  }

  const waypoints = parseWaypoints(room.waypoints_i18n);
  for (const wp of waypoints) {
    if (checkI18n(wp.text_i18n) || checkI18n(wp.title_i18n)) return true;
  }

  return false;
}

export default function TourAdminTools({
  variant,
  slug,
  tour,
  setTour,
  rooms,
  setRooms,
  roomIdx,
  setRoomIdx,
  lang,
  langRef,
  refreshViewerHotspots,
  onRoomCreated,
  toolbarSlot
}: TourAdminToolsProps) {
  const t = translations[lang];

  // Podrazumevano SAMO srpski - inicijalni AI draft se pravi na srpskom, a
  // ostali jezici se mogu dodati odmah u draft modalu ili kasnije preko
  // "🌐 Jezici".
  const [targetLanguages, setTargetLanguages] = useState<Language[]>(['sr']);
  // Prazno = "ne generiši AI glas" dok se jezici eksplicitno ne izaberu.
  const [voiceLanguages, setVoiceLanguages] = useState<Language[]>([]);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiDraft, setAiDraft] = useState<AiDraft | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [translationProgress, setTranslationProgress] = useState<string | null>(null);
  const [voiceProgress, setVoiceProgress] = useState<string | null>(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  const [showAddLanguageModal, setShowAddLanguageModal] = useState(false);
  const [addLanguageTargets, setAddLanguageTargets] = useState<Language[]>([]);

  const [panoramaUploadProgress, setPanoramaUploadProgress] = useState<string | null>(null);
  const panoramaFileInputRef = useRef<HTMLInputElement>(null);

  const [creatingRoom, setCreatingRoom] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState(false);

  const [showGuidePathModal, setShowGuidePathModal] = useState(false);
  const [guidePathInput, setGuidePathInput] = useState('');
  const [savingGuidePath, setSavingGuidePath] = useState(false);
  const [guideLinkCopied, setGuideLinkCopied] = useState(false);

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [orderInput, setOrderInput] = useState('');
  const [savingRename, setSavingRename] = useState(false);

  const [showNarrationModal, setShowNarrationModal] = useState(false);
  const [narrationIntroInput, setNarrationIntroInput] = useState('');
  const [narrationDetailInput, setNarrationDetailInput] = useState('');
  const [savingNarration, setSavingNarration] = useState(false);

  const currentRoom = rooms[roomIdx];

  const roomsByOrder = [...rooms].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  const openGuidePathModal = () => {
    setGuidePathInput(tour?.guide_path || '');
    setShowGuidePathModal(true);
  };

  // Link koji turu otvara odmah sa automatskim vodičem - za slanje kupcu.
  const guideLink = typeof window !== 'undefined' ? `${window.location.origin}/tour/${slug}?vodic=1` : '';

  const copyGuideLink = async () => {
    try {
      await navigator.clipboard.writeText(guideLink);
      setGuideLinkCopied(true);
      setTimeout(() => setGuideLinkCopied(false), 2000);
    } catch {
      window.prompt('Kopiraj link:', guideLink);
    }
  };

  const guidePathSteps = parseGuidePath(guidePathInput);
  const guidePathError = guidePathInput.trim() ? validateGuidePath(guidePathSteps, rooms) : null;

  // Čuva putanju vodiča na turi (ne na sobi) - ide preko API rute jer
  // prijavljeni admin sme da čita `tours`, ali ne i da piše u nju direktno
  // (za razliku od `rooms`, koja ima svoju write policy - migracija 006).
  const handleSaveGuidePath = async () => {
    if (guidePathInput.trim() && guidePathError) return;

    setSavingGuidePath(true);
    try {
      const res = await fetch('/api/admin/tours', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
        body: JSON.stringify({ slug, guide_path: guidePathInput.trim() })
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Nepoznata greška.');

      const saved = guidePathInput.trim() || null;
      setTour((prev) => (prev ? { ...prev, guide_path: saved } : prev));
      setShowGuidePathModal(false);
    } catch (err: any) {
      alert('Greška pri čuvanju putanje: ' + (err.message || 'Nepoznata greška'));
    } finally {
      setSavingGuidePath(false);
    }
  };

  const toggleTargetLanguage = (l: Language) => {
    setTargetLanguages((prev) => {
      const next = prev.includes(l) ? prev.filter((langItem) => langItem !== l) : [...prev, l];
      // Jezik koji se ne prevodi ne može da dobije ni glas.
      if (!next.includes(l)) {
        setVoiceLanguages((prevVoice) => prevVoice.filter((v) => v !== l));
      }
      return next;
    });
  };

  const toggleVoiceLanguage = (l: Language) => {
    setVoiceLanguages((prev) =>
      prev.includes(l) ? prev.filter((langItem) => langItem !== l) : [...prev, l]
    );
  };

  const toggleAddLanguageTarget = (l: Language) => {
    setAddLanguageTargets((prev) =>
      prev.includes(l) ? prev.filter((langItem) => langItem !== l) : [...prev, l]
    );
  };

  // Kreira novu (praznu) sobu za trenutnu turu - obavezan PRVI korak pre
  // nego što admin može da otpremi panoramu, pokrene AI popunu ili doda
  // jezike, jer sve to radi NAD postojećom sobom (rooms[roomIdx]).
  const handleAddRoom = async () => {
    if (!slug) return;

    setCreatingRoom(true);
    try {
      const nextOrderIndex = rooms.length > 0 ? Math.max(...rooms.map((r) => r.order_index ?? 0)) + 1 : 1;

      const { data, error: insertErr } = await supabase
        .from('rooms')
        .insert({ tour_slug: slug, title: `Soba ${nextOrderIndex}`, order_index: nextOrderIndex })
        .select()
        .single();

      if (insertErr || !data) {
        throw new Error(insertErr?.message || 'Nepoznata greška pri kreiranju sobe.');
      }

      const newRoom = data as unknown as Room;
      setRooms((prev) => [...prev, newRoom]);
      setRoomIdx(rooms.length);
      onRoomCreated();
    } catch (err: any) {
      console.error('[Kreiranje sobe] Greška:', err);
      alert('Greška pri kreiranju sobe: ' + (err.message || 'Nepoznata greška'));
    } finally {
      setCreatingRoom(false);
    }
  };

  // Trajno brisanje cele sobe (ne samo panorame) - pogrešno napravljena
  // soba, duplikat i sl. Server (DELETE /api/admin/rooms) čisti R2 fajlove,
  // navigacione tačke u DRUGIM sobama koje vode baš u ovu, i redni broj
  // sobe iz putanje vodiča. Isto filtriranje se radi i ovde nad lokalnim
  // stanjem - server već zna da je uradio to isto, pa nema potrebe da se
  // čeka nov odgovor sa sadržajem.
  const handleDeleteRoom = async () => {
    if (!currentRoom) return;
    const roomTitle = getLocalizedText(currentRoom.title_i18n, 'sr') || '(soba bez naziva)';
    if (
      !confirm(
        `Trajno obrisati sobu "${roomTitle}"? Uklanjaju se i navigacione tačke drugih soba koje vode u nju, i njen redni broj iz putanje vodiča, ako postoji. Ne može se vratiti.`
      )
    ) {
      return;
    }

    setDeletingRoom(true);
    try {
      const res = await fetch('/api/admin/rooms', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
        body: JSON.stringify({ roomId: String(currentRoom.id) })
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Brisanje sobe nije uspelo.');
      }

      const deletedId = String(currentRoom.id);
      const deletedOrderIndex = currentRoom.order_index ?? null;

      const remainingRooms = rooms
        .filter((r) => String(r.id) !== deletedId)
        .map((r) => {
          const waypoints = parseWaypoints(r.waypoints_i18n);
          const filtered = waypoints.filter((wp) => String(wp.targetRoomId ?? '') !== deletedId);
          return filtered.length === waypoints.length ? r : { ...r, waypoints_i18n: filtered };
        });

      setRooms(remainingRooms);
      setRoomIdx(Math.min(roomIdx, Math.max(0, remainingRooms.length - 1)));

      if (deletedOrderIndex !== null && tour?.guide_path) {
        const steps = tour.guide_path
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isInteger(n) && n > 0);
        const filteredSteps = steps.filter((n) => n !== deletedOrderIndex);
        if (filteredSteps.length !== steps.length) {
          setTour((prev) => (prev ? { ...prev, guide_path: filteredSteps.length > 0 ? filteredSteps.join(',') : null } : prev));
        }
      }
    } catch (err: any) {
      console.error('[Brisanje sobe] Greška:', err);
      alert('Greška pri brisanju sobe: ' + (err.message || 'Nepoznata greška'));
    } finally {
      setDeletingRoom(false);
    }
  };

  const openRenameModal = () => {
    if (!currentRoom) return;
    setRenameInput(getLocalizedText(currentRoom.title_i18n, 'sr'));
    setOrderInput(String(currentRoom.order_index ?? ''));
    setShowRenameModal(true);
  };

  // Menja naziv (SAMO srpski - ostali jezici ne prate automatski, njih
  // osvežava "🌐 Jezici" posle ovoga) i/ili redni broj sobe, u bilo kom
  // trenutku. Redni broj određuje redosled soba svuda (traka soba, plan,
  // vodič) - upisuje se u bazu odmah, ali PROSTOR U OVOJ SESIJI se ne
  // presortira uživo (da roomIdx ne "iskoči" ispod trenutno otvorene
  // panorame); novi redosled se vidi od sledećeg učitavanja ture.
  const handleSaveRename = async () => {
    if (!currentRoom) return;
    const newTitle = renameInput.trim();
    if (!newTitle) return;

    const trimmedOrder = orderInput.trim();
    const newOrder = trimmedOrder ? Number(trimmedOrder) : currentRoom.order_index ?? 1;
    if (!Number.isInteger(newOrder) || newOrder < 1) {
      alert('Redni broj mora biti ceo broj, 1 ili veći.');
      return;
    }

    if (newOrder !== currentRoom.order_index) {
      const clash = rooms.find((r) => r.id !== currentRoom.id && r.order_index === newOrder);
      if (clash) {
        const clashTitle = getLocalizedText(clash.title_i18n, 'sr') || '(bez naziva)';
        const ok = confirm(`Sobu "${clashTitle}" već ima redni broj ${newOrder}. Ipak sačuvati? Redosled će zavisiti od baze.`);
        if (!ok) return;
      }
    }

    setSavingRename(true);
    try {
      const newTitleI18n = buildI18nObject(newTitle, currentRoom.title_i18n, 'sr');
      const { error: dbErr } = await supabase
        .from('rooms')
        .update({ title: newTitle, title_i18n: newTitleI18n, order_index: newOrder })
        .eq('id', currentRoom.id as any);

      if (dbErr) throw dbErr;

      setRooms((prev) =>
        prev.map((r, idx) => (idx === roomIdx ? { ...r, title_i18n: newTitleI18n, order_index: newOrder } : r))
      );
      setShowRenameModal(false);
    } catch (err: any) {
      alert('Greška pri čuvanju naziva: ' + (err.message || 'Nepoznata greška'));
    } finally {
      setSavingRename(false);
    }
  };

  const openNarrationModal = () => {
    if (!currentRoom) return;
    const establishData = parseEstablish(currentRoom.establish_i18n);
    setNarrationIntroInput(getLocalizedText(establishData.intro_i18n, 'sr'));
    setNarrationDetailInput(getLocalizedText(establishData.detail_i18n, 'sr'));
    setShowNarrationModal(true);
  };

  // Menja SAMO srpski tekst uvodne naracije (namena sobe + specifično za
  // sobu), u bilo kom trenutku - ne zavisi od AI popune i ne dira
  // waypoint-e ni naziv. NE dira postojeći audio: ako je glas već
  // generisan za ovu sobu, i dalje govori STARI tekst dok se ponovo ne
  // pokrene "🎙️ Glas" - to je namerno rečeno u samom modalu.
  const handleSaveNarration = async () => {
    if (!currentRoom) return;

    setSavingNarration(true);
    try {
      const establishData = parseEstablish(currentRoom.establish_i18n);
      const updatedEstablish: EstablishData = {
        ...establishData,
        intro_i18n: buildI18nObject(narrationIntroInput.trim(), establishData.intro_i18n, 'sr'),
        detail_i18n: buildI18nObject(narrationDetailInput.trim(), establishData.detail_i18n, 'sr')
      };

      const { error: dbErr } = await supabase
        .from('rooms')
        .update({ establish_i18n: updatedEstablish })
        .eq('id', currentRoom.id as any);

      if (dbErr) throw dbErr;

      setRooms((prev) =>
        prev.map((r, idx) => (idx === roomIdx ? { ...r, establish_i18n: updatedEstablish } : r))
      );
      setShowNarrationModal(false);
    } catch (err: any) {
      alert('Greška pri čuvanju naracije: ' + (err.message || 'Nepoznata greška'));
    } finally {
      setSavingNarration(false);
    }
  };

  // KORAK 1: Generisanje SR drafta
  const handleAutoPopulateRoom = async () => {
    const currentPanoramaUrl = currentRoom?.panorama_url_cf || currentRoom?.panorama_url;
    if (!currentRoom || !currentPanoramaUrl) {
      alert('Nema dostupne panorame za ovu sobu.');
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/auto-populate-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
        body: JSON.stringify({
          roomId: currentRoom.id,
          panoramaUrl: currentPanoramaUrl,
          // Bez ovoga server ne zna da li stan ide u prodaju, izdavanje ili
          // na dan, pa je tekst pisan za podstanara i kad je stan na prodaju.
          listingType: tour?.category,
          action: 'generate_draft'
        })
      });

      const result = await res.json();
      if (result.success && result.draft) {
        setAiDraft(result.draft);
        setShowDraftModal(true);
      } else {
        alert('Greška pri obradi: ' + (result.error || 'Nepoznata greška'));
      }
    } catch (err) {
      console.error('AI Draft Error:', err);
      alert('Došlo je do greške prilikom generisanja SR drafta.');
    } finally {
      setAiLoading(false);
    }
  };

  // Upload panorame sa računara za trenutnu sobu, u DVA koraka jer Vercel
  // funkcije imaju tvrd limit od 4.5MB po telu zahteva, a panorame su skoro
  // uvek veće:
  //   1) /api/upload-panorama vrati potpisan R2 URL, pa fajl ide direktno
  //      iz pregledača na Cloudflare (mimo naše funkcije, bez limita);
  //   2) /api/upload-panorama/finish preuzme taj fajl NAZAD na serveru,
  //      pretvori ga u WebP, napravi sličicu i upiše konačan CDN link u
  //      rooms.panorama_url_cf.
  const handlePanoramaFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!currentRoom) return;

    if (!file.type.startsWith('image/')) {
      alert('Molimo izaberite fajl slike (JPG, PNG ili WEBP).');
      return;
    }

    if (currentRoom.panorama_url_cf && !confirm('Ova soba već ima panoramu. Zameniti je novom slikom?')) {
      return;
    }

    try {
      setPanoramaUploadProgress('Priprema upload-a...');
      const presignRes = await fetch('/api/upload-panorama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
        body: JSON.stringify({ roomId: String(currentRoom.id), fileType: file.type, fileSize: file.size })
      });
      const presign = await presignRes.json();
      if (!presignRes.ok || !presign.success) {
        throw new Error(presign.error || 'Priprema upload-a nije uspela.');
      }

      setPanoramaUploadProgress('Otpremanje panorame na Cloudflare...');
      const putRes = await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });
      if (!putRes.ok) {
        throw new Error(`Slanje fajla na Cloudflare nije uspelo (${putRes.status}).`);
      }

      setPanoramaUploadProgress('Obrada panorame (WebP, sličica)...');
      const finishRes = await fetch('/api/upload-panorama/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
        body: JSON.stringify({ roomId: String(currentRoom.id), key: presign.key })
      });
      const result = await finishRes.json();
      if (!finishRes.ok || !result.success) {
        throw new Error(result.error || 'Obrada panorame nije uspela.');
      }

      setRooms((prevRooms) =>
        prevRooms.map((r, idx) => (idx === roomIdx ? { ...r, panorama_url_cf: result.r2Url } : r))
      );
    } catch (err: any) {
      console.error('[Upload panorame] Greška:', err);
      alert('Greška pri upload-u panorame: ' + (err.message || 'Nepoznata greška'));
    } finally {
      setPanoramaUploadProgress(null);
    }
  };

  // Uklanja panoramu sobe (pogrešno otpremljena slika, ili admin više ne
  // želi baš tu) - soba se vraća na "bez panorame", spremna za novi upload.
  // Ne dira naziv, naraciju ni tačke - samo sliku.
  const handleDeletePanorama = async () => {
    if (!currentRoom || !currentRoom.panorama_url_cf) return;
    if (!confirm('Obrisati panoramu ove sobe? Soba ostaje bez slike dok se ne otpremi nova.')) return;

    setPanoramaUploadProgress('Brisanje panorame...');
    try {
      const res = await fetch('/api/upload-panorama', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
        body: JSON.stringify({ roomId: String(currentRoom.id) })
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Brisanje panorame nije uspelo.');
      }

      setRooms((prevRooms) =>
        prevRooms.map((r, idx) =>
          idx === roomIdx ? { ...r, panorama_url_cf: undefined, panorama_url: undefined, preview_url: undefined } : r
        )
      );
    } catch (err: any) {
      console.error('[Brisanje panorame] Greška:', err);
      alert('Greška pri brisanju panorame: ' + (err.message || 'Nepoznata greška'));
    } finally {
      setPanoramaUploadProgress(null);
    }
  };

  // Naknadno generisanje AI glasa za VEĆ POSTOJEĆI sadržaj sobe (bez celog
  // AI draft/prevod toka). Koristi trenutno sačuvan tekst kakav god da je -
  // ručno unet ili prethodno AI generisan/preveden.
  const handleGenerateVoiceForRoom = async () => {
    if (!currentRoom) return;

    if (voiceLanguages.length === 0) {
      alert('Izaberite bar jedan jezik za generisanje glasa.');
      return;
    }

    const establishData = parseEstablish(currentRoom.establish_i18n);
    const waypointsList = parseWaypoints(currentRoom.waypoints_i18n);

    // Provera PRE poziva ka TTS-u: da li BAR JEDAN izabrani jezik ima stvaran
    // tekst za izgovaranje (bez SR fallback-a - prazan 'en' ostaje prazan).
    const hasAnyText = voiceLanguages.some(
      (l) =>
        hasExactLangText(establishData.intro_i18n, l) ||
        hasExactLangText(establishData.detail_i18n, l) ||
        hasExactLangText(establishData.text_i18n, l) ||
        waypointsList.some((wp) => hasExactLangText(wp.text_i18n, l))
    );

    if (!hasAnyText) {
      alert(
        'Nijedan izabrani jezik (' +
          voiceLanguages.map((l) => l.toUpperCase()).join(', ') +
          ') nema uneti/preveden tekst - ni uvodnu naraciju ni info-tačke. ' +
          'Prvo unesi tekst ili prevedi sobu na taj jezik, pa tek onda generiši glas.'
      );
      return;
    }

    setShowVoiceModal(false);
    setVoiceProgress('Generisanje AI glasovne naracije...');

    try {
      const res = await fetch('/api/ai/auto-populate-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
        body: JSON.stringify({
          roomId: currentRoom.id,
          action: 'generate_voice',
          voiceLanguages,
          content: {
            establishText: composeEstablishText(establishData),
            waypoints: waypointsList.map((wp, idx) => ({ index: idx, text: wp.text_i18n }))
          }
        })
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Nepoznata greška pri generisanju glasa.');
      }

      const establishCount = Object.keys(result.audio?.establish || {}).length;
      const waypointCount = (result.audio?.waypoints || []).reduce(
        (acc: number, w: any) => acc + Object.keys(w.audio_url_i18n || {}).length,
        0
      );
      const totalGenerated = establishCount + waypointCount;

      const errorLines = [
        ...Object.entries(result.errors?.establish || {}).map(([l, e]) => `Uvod (${String(l).toUpperCase()}): ${e}`),
        ...Object.entries(result.errors?.waypoints || {}).map(([k, e]) => `Tačka ${k}: ${e}`)
      ];
      const skippedCount =
        (result.skipped?.establish?.length || 0) + (result.skipped?.waypoints?.length || 0);

      if (totalGenerated === 0) {
        // Ništa nije generisano - NE piši u bazu, jasno obavesti šta se desilo
        alert(
          'Glas NIJE generisan ni za jedan segment.\n' +
            (errorLines.length > 0
              ? 'Greške:\n' + errorLines.join('\n')
              : 'Razlog: tekst za izabrane jezike je prazan (' + skippedCount + ' segmenata preskočeno).')
        );
        return;
      }

      const existingEstablishAudio =
        typeof establishData.audio_url_i18n === 'object' ? establishData.audio_url_i18n : {};
      const updatedEstablish: EstablishData = {
        ...establishData,
        audio_url_i18n: { ...existingEstablishAudio, ...result.audio?.establish }
      };

      let updatedWaypoints = waypointsList;
      if (Array.isArray(result.audio?.waypoints)) {
        updatedWaypoints = waypointsList.map((wp, idx) => {
          const wpAudio = result.audio.waypoints.find((a: any) => a.index === idx);
          if (!wpAudio) return wp;
          const existingWpAudio = typeof wp.audio_url_i18n === 'object' ? wp.audio_url_i18n : {};
          return { ...wp, audio_url_i18n: { ...existingWpAudio, ...wpAudio.audio_url_i18n } };
        });
      }

      const { error: dbErr } = await supabase
        .from('rooms')
        .update({
          establish_i18n: updatedEstablish,
          waypoints_i18n: updatedWaypoints
        })
        .eq('id', currentRoom.id as any);

      if (dbErr) throw dbErr;

      setRooms((prev) =>
        prev.map((r, idx) =>
          idx === roomIdx ? { ...r, establish_i18n: updatedEstablish, waypoints_i18n: updatedWaypoints } : r
        )
      );

      refreshViewerHotspots(updatedWaypoints, langRef.current);

      alert(
        `Generisano ${totalGenerated} audio segmenata i sačuvano.` +
          (errorLines.length > 0 ? '\n\nDeo segmenata NIJE uspeo:\n' + errorLines.join('\n') : '')
      );
    } catch (err: any) {
      console.error('[TTS] Greška pri generisanju glasa za sobu:', err);
      alert('Greška pri generisanju glasa: ' + (err.message || 'Nepoznata greška'));
    } finally {
      setVoiceProgress(null);
    }
  };

  // KORAK 2 & 3: Potvrda SR drafta, prevođenje i upis u bazu
  const handleConfirmDraftAndProcess = async () => {
    if (!aiDraft || !currentRoom) return;

    if (targetLanguages.length === 0) {
      alert('Molimo izaberite bar jedan jezik za prevođenje i prikaz.');
      return;
    }

    setShowDraftModal(false);

    const otherLangs = targetLanguages.filter((l) => l !== 'sr');

    const baseEstablish = parseEstablish(currentRoom.establish_i18n);
    let currentTitleI18n: Record<string, string> = buildI18nObject(aiDraft.title, currentRoom.title_i18n, 'sr');
    const currentEstablishI18n: EstablishData = {
      ...baseEstablish,
      intro_i18n: buildI18nObject(aiDraft.narrationIntro, baseEstablish.intro_i18n, 'sr'),
      detail_i18n: buildI18nObject(aiDraft.narrationDetail, baseEstablish.detail_i18n, 'sr')
    };

    let currentWaypoints: Waypoint[] = aiDraft.waypoints.map((wp) => ({
      ...wp,
      title_i18n: buildI18nObject(getLocalizedText(wp.title_i18n, 'sr'), wp.title_i18n, 'sr'),
      text_i18n: buildI18nObject(getLocalizedText(wp.text_i18n, 'sr'), wp.text_i18n, 'sr')
    }));

    try {
      if (otherLangs.length > 0) {
        setTranslationProgress(`Prevođenje na jezike: ${otherLangs.map((l) => l.toUpperCase()).join(', ')}...`);

        const translated = await translateRoomToLanguages(
          currentRoom.id,
          aiDraft.title,
          aiDraft.narrationIntro,
          aiDraft.narrationDetail,
          currentTitleI18n,
          typeof currentEstablishI18n.intro_i18n === 'object' ? (currentEstablishI18n.intro_i18n as Record<string, string>) : {},
          typeof currentEstablishI18n.detail_i18n === 'object' ? (currentEstablishI18n.detail_i18n as Record<string, string>) : {},
          currentWaypoints,
          otherLangs
        );

        currentTitleI18n = translated.titleI18n;
        currentEstablishI18n.intro_i18n = translated.establishIntroI18n;
        currentEstablishI18n.detail_i18n = translated.establishDetailI18n;
        currentWaypoints = translated.waypoints;
      }

      // Glasovna naracija (opciono - samo ako je izabran bar jedan jezik u
      // draft modalu). Ide POSLE prevoda, jer joj trebaju finalni tekstovi.
      let voiceSummaryMessage = '';

      if (voiceLanguages.length > 0) {
        setVoiceProgress('Generisanje AI glasovne naracije...');

        try {
          const voiceRes = await fetch('/api/ai/auto-populate-room', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
            body: JSON.stringify({
              roomId: currentRoom.id,
              action: 'generate_voice',
              voiceLanguages,
              content: {
                establishText: composeEstablishText(currentEstablishI18n),
                waypoints: currentWaypoints.map((wp, idx) => ({ index: idx, text: wp.text_i18n }))
              }
            })
          });

          const voiceResult = await voiceRes.json();

          if (voiceResult.success && voiceResult.audio) {
            const existingEstablishAudio =
              typeof currentEstablishI18n.audio_url_i18n === 'object' ? currentEstablishI18n.audio_url_i18n : {};
            currentEstablishI18n.audio_url_i18n = {
              ...existingEstablishAudio,
              ...voiceResult.audio.establish
            };

            if (Array.isArray(voiceResult.audio.waypoints)) {
              currentWaypoints = currentWaypoints.map((wp, idx) => {
                const wpAudio = voiceResult.audio.waypoints.find((a: any) => a.index === idx);
                if (!wpAudio) return wp;
                const existingWpAudio = typeof wp.audio_url_i18n === 'object' ? wp.audio_url_i18n : {};
                return {
                  ...wp,
                  audio_url_i18n: { ...existingWpAudio, ...wpAudio.audio_url_i18n }
                };
              });
            }

            const establishCount = Object.keys(voiceResult.audio.establish || {}).length;
            const waypointCount = (voiceResult.audio.waypoints || []).reduce(
              (acc: number, w: any) => acc + Object.keys(w.audio_url_i18n || {}).length,
              0
            );
            const totalGenerated = establishCount + waypointCount;

            const errorLines = [
              ...Object.entries(voiceResult.errors?.establish || {}).map(
                ([l, e]) => `Uvod (${String(l).toUpperCase()}): ${e}`
              ),
              ...Object.entries(voiceResult.errors?.waypoints || {}).map(([k, e]) => `Tačka ${k}: ${e}`)
            ];

            if (totalGenerated === 0) {
              voiceSummaryMessage =
                '\n\n⚠️ AI glas NIJE generisan ni za jedan segment' +
                (errorLines.length > 0 ? ' - greške:\n' + errorLines.join('\n') : ' (tekst je prazan?).');
            } else {
              voiceSummaryMessage =
                `\n\n🎙️ Generisano ${totalGenerated} audio segmenata.` +
                (errorLines.length > 0 ? ' Deo NIJE uspeo:\n' + errorLines.join('\n') : '');
            }

            if (errorLines.length > 0) {
              console.warn('[TTS] Delimične greške pri generisanju glasa:', voiceResult.errors);
            }
          } else {
            console.error('[TTS] Generisanje glasa nije uspelo:', voiceResult.error);
            voiceSummaryMessage =
              '\n\n⚠️ Generisanje AI glasa nije uspelo (' + (voiceResult.error || 'nepoznata greška') + ').';
          }
        } catch (voiceErr: any) {
          console.error('[TTS] Greška pri pozivu generate_voice:', voiceErr);
          voiceSummaryMessage = '\n\n⚠️ Generisanje AI glasa nije uspelo (mrežna greška).';
        }
      }

      setTranslationProgress('Upisivanje u bazu podataka...');

      const { error: dbErr } = await supabase
        .from('rooms')
        .update({
          title_i18n: currentTitleI18n,
          establish_i18n: currentEstablishI18n,
          waypoints_i18n: currentWaypoints
        })
        .eq('id', currentRoom.id as any);

      if (dbErr) {
        throw dbErr;
      }

      setRooms((prevRooms: any[]) =>
        prevRooms.map((r, idx) =>
          idx === roomIdx
            ? {
                ...r,
                title_i18n: currentTitleI18n,
                establish_i18n: currentEstablishI18n,
                waypoints_i18n: currentWaypoints
              }
            : r
        )
      );

      refreshViewerHotspots(currentWaypoints, langRef.current);

      alert('Soba je uspešno popunjena i prevedena!' + voiceSummaryMessage);
    } catch (err: any) {
      console.error('Translation & Saving Error:', err);
      alert('Greška tokom prevođenja i upisa: ' + (err.message || 'Nepoznata greška'));
    } finally {
      setTranslationProgress(null);
      setVoiceProgress(null);
    }
  };

  // Prevodi VEĆ SAČUVAN srpski sadržaj trenutne sobe na dodatne jezike, u
  // bilo kom trenutku - ne samo odmah posle AI generisanja.
  const handleTranslateRoomLanguages = async () => {
    if (!currentRoom) return;

    const targets = [...addLanguageTargets];
    if (targets.length === 0) {
      alert('Izaberite bar jedan jezik za prevod.');
      return;
    }

    const sourceTitle = getLocalizedText(currentRoom.title_i18n, 'sr');
    const establishData = parseEstablish(currentRoom.establish_i18n);
    // Stara soba (pre podele polja) ima samo text_i18n - njen sadržaj se
    // tretira kao "specifično", da prevod ipak krene sa nečim smislenim dok
    // admin ne pokrene AI draft ponovo i popuni i namenu.
    const legacyNarration = getLocalizedText(establishData.text_i18n, 'sr');
    const sourceNarrationIntro = getLocalizedText(establishData.intro_i18n, 'sr');
    const sourceNarrationDetail = getLocalizedText(establishData.detail_i18n, 'sr') || legacyNarration;
    const waypointsList = parseWaypoints(currentRoom.waypoints_i18n);

    if (!sourceTitle && !sourceNarrationIntro && !sourceNarrationDetail && waypointsList.length === 0) {
      alert('Ova soba još nema sadržaj na srpskom. Prvo pokreni "🤖 AI Popuni Sobu" da napraviš SR draft.');
      return;
    }

    setShowAddLanguageModal(false);

    let currentTitleI18n: Record<string, string> = buildI18nObject(sourceTitle, currentRoom.title_i18n, 'sr');
    const currentEstablishI18n: EstablishData = {
      ...establishData,
      intro_i18n: buildI18nObject(sourceNarrationIntro, establishData.intro_i18n, 'sr'),
      detail_i18n: buildI18nObject(sourceNarrationDetail, establishData.detail_i18n, 'sr')
    };
    let currentWaypoints: Waypoint[] = waypointsList.map((wp) => ({
      ...wp,
      title_i18n: buildI18nObject(getLocalizedText(wp.title_i18n, 'sr'), wp.title_i18n, 'sr'),
      text_i18n: buildI18nObject(getLocalizedText(wp.text_i18n, 'sr'), wp.text_i18n, 'sr')
    }));

    try {
      setTranslationProgress(`Prevođenje na jezike: ${targets.map((l) => l.toUpperCase()).join(', ')}...`);

      const translated = await translateRoomToLanguages(
        currentRoom.id,
        sourceTitle,
        sourceNarrationIntro,
        sourceNarrationDetail,
        currentTitleI18n,
        typeof currentEstablishI18n.intro_i18n === 'object' ? (currentEstablishI18n.intro_i18n as Record<string, string>) : {},
        typeof currentEstablishI18n.detail_i18n === 'object' ? (currentEstablishI18n.detail_i18n as Record<string, string>) : {},
        currentWaypoints,
        targets
      );

      currentTitleI18n = translated.titleI18n;
      currentEstablishI18n.intro_i18n = translated.establishIntroI18n;
      currentEstablishI18n.detail_i18n = translated.establishDetailI18n;
      currentWaypoints = translated.waypoints;

      setTranslationProgress('Upisivanje u bazu podataka...');

      const { error: dbErr } = await supabase
        .from('rooms')
        .update({
          title_i18n: currentTitleI18n,
          establish_i18n: currentEstablishI18n,
          waypoints_i18n: currentWaypoints
        })
        .eq('id', currentRoom.id as any);

      if (dbErr) throw dbErr;

      setRooms((prevRooms: any[]) =>
        prevRooms.map((r, idx) =>
          idx === roomIdx
            ? { ...r, title_i18n: currentTitleI18n, establish_i18n: currentEstablishI18n, waypoints_i18n: currentWaypoints }
            : r
        )
      );

      refreshViewerHotspots(currentWaypoints, langRef.current);
      setAddLanguageTargets([]);

      alert(`Soba je prevedena na: ${targets.map((l) => l.toUpperCase()).join(', ')}.`);
    } catch (err: any) {
      console.error('Greška pri dodavanju jezika:', err);
      alert('Greška pri prevođenju: ' + (err.message || 'Nepoznata greška'));
    } finally {
      setTranslationProgress(null);
    }
  };

  // Tura bez ijedne sobe: jedino što admin može da uradi je da napravi prvu.
  if (variant === 'empty') {
    return (
      <button
        onClick={handleAddRoom}
        disabled={creatingRoom}
        style={{ padding: '12px 28px', fontSize: '15px', fontWeight: 'bold', backgroundColor: THEME.accent, color: '#fff', border: 'none', borderRadius: '30px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(30, 90, 168, 0.35)' }}
      >
        {creatingRoom ? 'Kreiranje...' : '➕ Kreiraj prvu sobu'}
      </button>
    );
  }

  const toolbar = (
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

  return (
    <>
      {toolbarSlot && createPortal(toolbar, toolbarSlot)}

      {/* MODAL: PREGLED I IZMENA SRPSKOG DRAFTA + ODABIR JEZIKA */}
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
              <div>
                <label style={{ fontSize: '12px', color: THEME.textSecondary, display: 'block', marginBottom: '4px', fontWeight: 600 }}>Naziv sobe (SR):</label>
                <input
                  type="text"
                  value={aiDraft.title}
                  onChange={(e) => setAiDraft({ ...aiDraft, title: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: THEME.surfaceAlt, color: THEME.textPrimary, border: '1px solid ' + THEME.borderStrong, fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: THEME.textSecondary, display: 'block', marginBottom: '4px', fontWeight: 600 }}>Uvodna naracija - namena sobe (SR):</label>
                <textarea
                  value={aiDraft.narrationIntro}
                  onChange={(e) => setAiDraft({ ...aiDraft, narrationIntro: e.target.value })}
                  rows={2}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: THEME.surfaceAlt, color: THEME.textPrimary, border: '1px solid ' + THEME.borderStrong, fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: THEME.textSecondary, display: 'block', marginBottom: '4px', fontWeight: 600 }}>Uvodna naracija - specifično za sobu (SR):</label>
                <textarea
                  value={aiDraft.narrationDetail}
                  onChange={(e) => setAiDraft({ ...aiDraft, narrationDetail: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: THEME.surfaceAlt, color: THEME.textPrimary, border: '1px solid ' + THEME.borderStrong, fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
                />
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
                    </div>
                  ))}
                </div>
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

      {/* MODAL: SAMOSTALNO GENERISANJE/OSVEŽAVANJE AI GLASA ZA POSTOJEĆI SADRŽAJ */}
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

      {/* MODAL: PREIMENOVANJE TRENUTNE SOBE, U BILO KOM TRENUTKU */}
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

      {/* MODAL: IZMENA TEKSTA UVODNE NARACIJE, U BILO KOM TRENUTKU */}
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

      {/* MODAL: DODAVANJE (PREVOĐENJE) SOBE NA DODATNI JEZIK U BILO KOM TRENUTKU */}
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

      {/* MODAL: PUTANJA AUTOMATSKOG VODIČA (na nivou cele ture, ne sobe) */}
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

      {/* MODAL: NAPREDAK PREVOĐENJA / GENERISANJA GLASA / UPLOAD-A PANORAME */}
      {(translationProgress || voiceProgress || panoramaUploadProgress) && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 110, backgroundColor: THEME.overlay, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          {/* Sopstveni keyframes: onaj u page.tsx postoji samo dok se soba učitava. */}
          <style>{`
            @keyframes adminPulseDot {
              0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
              40% { transform: scale(1.0); opacity: 1; }
            }
          `}</style>
          <div style={{ backgroundColor: THEME.surface, border: '1px solid ' + THEME.border, borderRadius: '20px', padding: '28px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', boxShadow: THEME.shadowLg, maxWidth: '360px', textAlign: 'center' }}>
            <div style={{ width: '16px', height: '16px', backgroundColor: THEME.accent, borderRadius: '50%', animation: 'adminPulseDot 1.4s infinite ease-in-out both' }} />
            <div style={{ color: THEME.textPrimary, fontSize: '18px', fontWeight: 'bold' }}>{voiceProgress || panoramaUploadProgress || translationProgress}</div>
            <p style={{ color: THEME.textSecondary, fontSize: '13px' }}>
              {voiceProgress
                ? 'Molimo vas sačekajte, generisanje AI glasa je u toku...'
                : panoramaUploadProgress
                ? 'Molimo vas sačekajte, upload na Cloudflare je u toku...'
                : 'Molimo vas sačekajte, prevođenje i upis u bazu su u toku...'}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
