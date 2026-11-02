'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { adminAuthHeader } from '../../../lib/authFetch';
import { Language, Waypoint, EstablishData, Room } from '../types';
import { translations } from '../translations';
import { getLocalizedText, parseWaypoints, parseEstablish, composeEstablishText, buildI18nObject } from '../utils';
import { translateRoomToLanguages, hasExactLangText, generateVoiceByLanguage } from '../adminUtils';
import { applyRoomDraft } from '../roomDraftApply';
import { parseGuidePath, validateGuidePath } from '../guidePath';
import { type AiDraft, type ReviewField, type ReviewSuggestion, type DraftReview, type TourAdminToolsProps } from './shared';

/**
 * Stanje i radnje admin alata ture: AI nacrt i provera, prevod, glas,
 * panorama, sobe, putanja vodiča. Traka i modali (_admin/*) dobijaju sve
 * odavde kroz jedan objekat.
 */
export function useTourAdmin(props: TourAdminToolsProps) {
  const { slug, tour, setTour, rooms, setRooms, roomIdx, setRoomIdx, lang, langRef, refreshViewerHotspots, onRoomCreated } = props;
  const t = translations[lang];

  // Podrazumevano SAMO srpski - inicijalni AI draft se pravi na srpskom, a
  // ostali jezici se mogu dodati odmah u draft modalu ili kasnije preko
  // "🌐 Jezici".
  const [targetLanguages, setTargetLanguages] = useState<Language[]>(['sr']);
  // Prazno = "ne generiši AI glas" dok se jezici eksplicitno ne izaberu.
  const [voiceLanguages, setVoiceLanguages] = useState<Language[]>([]);

  const [aiLoading, setAiLoading] = useState(false);
  // "🤖 AI sve sobe" (BulkRoomFill) - više soba odjednom, sa pregledom.
  const [showBulkFill, setShowBulkFill] = useState(false);
  const [aiDraft, setAiDraft] = useState<AiDraft | null>(null);
  // Soba za koju je predlog napravljen - potvrda ga upisuje BAŠ u nju, i kad je
  // admin za 10-30 s čekanja prešao u drugu sobu.
  const [aiDraftRoomId, setAiDraftRoomId] = useState<string | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [review, setReview] = useState<DraftReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
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
  // Soba koja se upravo vidi - posle dugog posla (prevod, glas) tačke se
  // iscrtavaju samo ako je admin i dalje u sobi koja je menjana.
  const shownRoomIdRef = useRef<string | null>(null);
  useEffect(() => {
    shownRoomIdRef.current = currentRoom ? String(currentRoom.id) : null;
  }, [currentRoom]);
  const refreshIfShown = (roomId: string | number, waypoints: Waypoint[]) => {
    if (shownRoomIdRef.current === String(roomId)) refreshViewerHotspots(waypoints, langRef.current);
  };

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
    } catch (err) {
      alert('Greška pri čuvanju putanje: ' + (err instanceof Error ? err.message : 'Nepoznata greška'));
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
    } catch (err) {
      console.error('[Kreiranje sobe] Greška:', err);
      alert('Greška pri kreiranju sobe: ' + (err instanceof Error ? err.message : 'Nepoznata greška'));
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
    } catch (err) {
      console.error('[Brisanje sobe] Greška:', err);
      alert('Greška pri brisanju sobe: ' + (err instanceof Error ? err.message : 'Nepoznata greška'));
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

    const oldOrder = currentRoom.order_index ?? null;
    if (newOrder !== currentRoom.order_index) {
      const clash = rooms.find((r) => r.id !== currentRoom.id && r.order_index === newOrder);
      // Putanja vodiča pamti sobe po rednom broju - zauzet broj bi je učinio dvosmislenom.
      if (clash && tour?.guide_path) {
        alert(`Broj ${newOrder} već ima druga soba, a tura ima putanju vodiča. Izaberite slobodan broj.`);
        return;
      }
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
        .eq('id', String(currentRoom.id));

      if (dbErr) throw dbErr;

      setRooms((prev) =>
        prev.map((r, idx) => (idx === roomIdx ? { ...r, title_i18n: newTitleI18n, order_index: newOrder } : r))
      );

      // Novi redni broj i u putanji vodiča - inače vodič preskoči sobu, a video
      // (koji prati putanju) promeni redosled.
      if (oldOrder !== null && newOrder !== oldOrder && tour?.guide_path) {
        const steps = tour.guide_path.split(',').map((x) => x.trim());
        if (steps.includes(String(oldOrder))) {
          const remapped = steps.map((x) => (x === String(oldOrder) ? String(newOrder) : x)).join(',');
          const res = await fetch('/api/admin/tours', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
            body: JSON.stringify({ slug, guide_path: remapped })
          });
          const result = await res.json().catch(() => ({ success: false }));
          if (result.success) setTour((prev) => (prev ? { ...prev, guide_path: remapped } : prev));
          else alert('Naziv i broj su sačuvani, ali putanja vodiča nije ažurirana - otvorite "Putanja vodiča" i sačuvajte je ponovo.');
        }
      }
      setShowRenameModal(false);
    } catch (err) {
      alert('Greška pri čuvanju naziva: ' + (err instanceof Error ? err.message : 'Nepoznata greška'));
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
        .eq('id', String(currentRoom.id));

      if (dbErr) throw dbErr;

      setRooms((prev) =>
        prev.map((r, idx) => (idx === roomIdx ? { ...r, establish_i18n: updatedEstablish } : r))
      );
      setShowNarrationModal(false);
    } catch (err) {
      alert('Greška pri čuvanju naracije: ' + (err instanceof Error ? err.message : 'Nepoznata greška'));
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
        setAiDraftRoomId(String(currentRoom.id));
        setReview(null);
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

  // KORAK 1b: "Proveri i ispravi" - AI lektor pregleda draft pre prevoda i
  // glasa. Vraća predloge (prihvataju se jedan po jedan) i napomene za
  // tvrdnje koje ne vidi na slici. Sam ništa ne menja.
  const handleReviewDraft = async () => {
    const currentPanoramaUrl = currentRoom?.panorama_url_cf || currentRoom?.panorama_url;
    if (!currentRoom || !currentPanoramaUrl || !aiDraft) return;
    setReviewLoading(true);
    try {
      const res = await fetch('/api/ai/auto-populate-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
        body: JSON.stringify({
          roomId: currentRoom.id,
          panoramaUrl: currentPanoramaUrl,
          listingType: tour?.category,
          draft: aiDraft,
          action: 'review_draft'
        })
      });
      const result = await res.json();
      if (result.success) {
        setReview({ suggestions: result.suggestions ?? [], checks: result.checks ?? [] });
      } else {
        alert('Provera nije uspela: ' + (result.error || 'Nepoznata greška'));
      }
    } catch (err) {
      console.error('AI Review Error:', err);
      alert('Došlo je do greške prilikom provere teksta.');
    } finally {
      setReviewLoading(false);
    }
  };

  /** Upisuje prihvaćen predlog u draft i sklanja ga sa spiska. */
  const applySuggestion = (s: ReviewSuggestion) => {
    setAiDraft((prev) => {
      if (!prev) return prev;
      if (s.field === 'title') return { ...prev, title: s.suggested };
      if (s.field === 'intro') return { ...prev, narrationIntro: s.suggested };
      if (s.field === 'detail') return { ...prev, narrationDetail: s.suggested };
      const wps = [...prev.waypoints];
      const wp = wps[s.index];
      if (!wp) return prev;
      wps[s.index] =
        s.field === 'wpTitle'
          ? { ...wp, title_i18n: buildI18nObject(s.suggested, wp.title_i18n, 'sr') }
          : { ...wp, text_i18n: buildI18nObject(s.suggested, wp.text_i18n, 'sr') };
      return { ...prev, waypoints: wps };
    });
    dismissSuggestion(s);
  };

  const dismissSuggestion = (s: ReviewSuggestion) =>
    setReview((prev) => (prev ? { ...prev, suggestions: prev.suggestions.filter((x) => x !== s) } : prev));

  /** Napomene AI provere za jedno polje ("proveri na slici: ..."). */
  const reviewChecks = (field: ReviewField, index = -1): string[] =>
    (review?.checks ?? [])
      .filter((c) => c.field === field && c.index === index)
      .map((c) => `Proveri: ${c.message}`);

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
        // I kopija za telefon i sličica - pregled inače i dalje pokazuje staru sliku.
        prevRooms.map((r) =>
          r.id === currentRoom.id
            ? { ...r, panorama_url_cf: result.r2Url, panorama_url_mobile: result.mobileUrl ?? undefined, preview_url: result.previewUrl ?? r.preview_url }
            : r
        )
      );
    } catch (err) {
      console.error('[Upload panorame] Greška:', err);
      alert('Greška pri upload-u panorame: ' + (err instanceof Error ? err.message : 'Nepoznata greška'));
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
    } catch (err) {
      console.error('[Brisanje panorame] Greška:', err);
      alert('Greška pri brisanju panorame: ' + (err instanceof Error ? err.message : 'Nepoznata greška'));
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
      const result = await generateVoiceByLanguage(currentRoom.id, voiceLanguages, {
        establishText: composeEstablishText(establishData),
        waypoints: waypointsList.map((wp, idx) => ({ index: idx, text: wp.text_i18n }))
      });

      if (!result.success) {
        throw new Error(result.error || 'Nepoznata greška pri generisanju glasa.');
      }

      const establishCount = Object.keys(result.audio?.establish || {}).length;
      const waypointCount = (result.audio?.waypoints || []).reduce(
        (acc: number, w: { audio_url_i18n?: Record<string, string> }) => acc + Object.keys(w.audio_url_i18n || {}).length,
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
          const wpAudio = result.audio.waypoints.find((a: { index: number }) => a.index === idx);
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
        .eq('id', String(currentRoom.id));

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
    } catch (err) {
      console.error('[TTS] Greška pri generisanju glasa za sobu:', err);
      alert('Greška pri generisanju glasa: ' + (err instanceof Error ? err.message : 'Nepoznata greška'));
    } finally {
      setVoiceProgress(null);
    }
  };

  // KORAK 2 & 3: Potvrda SR drafta, prevođenje i upis u bazu
  const handleConfirmDraftAndProcess = async () => {
    const room = rooms.find((r) => String(r.id) === aiDraftRoomId) ?? null;
    if (!aiDraft || !room) return;

    if (targetLanguages.length === 0) {
      alert('Molimo izaberite bar jedan jezik za prevođenje i prikaz.');
      return;
    }

    setShowDraftModal(false);
    const otherLangs = targetLanguages.filter((l) => l !== 'sr');

    try {
      // Prevod, glas i upis - isto kao "AI sve sobe" (roomDraftApply.ts).
      const applied = await applyRoomDraft({
        room,
        draft: aiDraft,
        otherLangs,
        voiceLangs: voiceLanguages,
        onStep: (step) => {
          if (step === 'translate') setTranslationProgress(`Prevođenje na jezike: ${otherLangs.map((l) => l.toUpperCase()).join(', ')}...`);
          else if (step === 'voice') setVoiceProgress('Generisanje AI glasovne naracije...');
          else setTranslationProgress('Upisivanje u bazu podataka...');
        }
      });

      setRooms((prevRooms) =>
        prevRooms.map((r) =>
          String(r.id) === String(room.id)
            ? { ...r, title_i18n: applied.title_i18n, establish_i18n: applied.establish_i18n, waypoints_i18n: applied.waypoints_i18n }
            : r
        )
      );
      refreshIfShown(room.id, applied.waypoints_i18n);

      let voiceSummaryMessage = '';
      if (voiceLanguages.length > 0) {
        voiceSummaryMessage = applied.voiceCount
          ? `\n\n🎙️ Generisano ${applied.voiceCount} audio segmenata.` + (applied.voiceErrors.length ? ' Deo NIJE uspeo:\n' + applied.voiceErrors.join('\n') : '')
          : '\n\n⚠️ AI glas NIJE generisan' + (applied.voiceErrors.length ? ' - greške:\n' + applied.voiceErrors.join('\n') : '.');
      }
      alert(
        (applied.failedLangs.length
          ? `Soba je popunjena, ali prevod nije uspeo za: ${applied.failedLangs.map((l) => l.toUpperCase()).join(', ')} - pokrenite prevod ponovo.`
          : 'Soba je uspešno popunjena i prevedena!') + voiceSummaryMessage
      );
    } catch (err) {
      console.error('Translation & Saving Error:', err);
      alert('Greška tokom prevođenja i upisa: ' + (err instanceof Error ? err.message : 'Nepoznata greška'));
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

      // Novi prevod = stari snimljeni glas za te jezike govori stari tekst - briše se
      // (snima se iznova dugmetom za glas). Jezik čiji prevod nije uspeo ostaje kakav je.
      const redone = targets.filter((l) => !translated.failed.includes(l)) as string[];
      const dropAudio = (audio: unknown) => {
        if (!audio || typeof audio !== 'object') return audio as Record<string, string> | undefined;
        return Object.fromEntries(Object.entries(audio as Record<string, string>).filter(([l]) => !redone.includes(l)));
      };
      currentEstablishI18n.audio_url_i18n = dropAudio(currentEstablishI18n.audio_url_i18n);
      currentWaypoints = currentWaypoints.map((wp) => ({ ...wp, audio_url_i18n: dropAudio(wp.audio_url_i18n) }));

      setTranslationProgress('Upisivanje u bazu podataka...');

      const { error: dbErr } = await supabase
        .from('rooms')
        .update({
          title_i18n: currentTitleI18n,
          establish_i18n: currentEstablishI18n,
          waypoints_i18n: currentWaypoints
        })
        .eq('id', String(currentRoom.id));

      if (dbErr) throw dbErr;

      const editedRoomId = currentRoom.id;
      setRooms((prevRooms) =>
        prevRooms.map((r) =>
          String(r.id) === String(editedRoomId)
            ? { ...r, title_i18n: currentTitleI18n, establish_i18n: currentEstablishI18n, waypoints_i18n: currentWaypoints }
            : r
        )
      );

      refreshIfShown(editedRoomId, currentWaypoints);
      setAddLanguageTargets([]);

      alert(
        translated.failed.length
          ? `Prevod nije uspeo za: ${translated.failed.map((l) => l.toUpperCase()).join(', ')}. Prevedeno: ${redone.map((l) => l.toUpperCase()).join(', ') || 'ništa'}.`
          : `Soba je prevedena na: ${targets.map((l) => l.toUpperCase()).join(', ')}.`
      );
    } catch (err) {
      console.error('Greška pri dodavanju jezika:', err);
      alert('Greška pri prevođenju: ' + (err instanceof Error ? err.message : 'Nepoznata greška'));
    } finally {
      setTranslationProgress(null);
    }
  };

  return { ...props, t, targetLanguages, setTargetLanguages, voiceLanguages, setVoiceLanguages, aiLoading, setAiLoading, showBulkFill, setShowBulkFill, aiDraft, setAiDraft, aiDraftRoomId, setAiDraftRoomId, showDraftModal, setShowDraftModal, review, setReview, reviewLoading, setReviewLoading, translationProgress, setTranslationProgress, voiceProgress, setVoiceProgress, showVoiceModal, setShowVoiceModal, showAddLanguageModal, setShowAddLanguageModal, addLanguageTargets, setAddLanguageTargets, panoramaUploadProgress, setPanoramaUploadProgress, panoramaFileInputRef, creatingRoom, setCreatingRoom, deletingRoom, setDeletingRoom, showGuidePathModal, setShowGuidePathModal, guidePathInput, setGuidePathInput, savingGuidePath, setSavingGuidePath, guideLinkCopied, setGuideLinkCopied, showRenameModal, setShowRenameModal, renameInput, setRenameInput, orderInput, setOrderInput, savingRename, setSavingRename, showNarrationModal, setShowNarrationModal, narrationIntroInput, setNarrationIntroInput, narrationDetailInput, setNarrationDetailInput, savingNarration, setSavingNarration, currentRoom, shownRoomIdRef, refreshIfShown, roomsByOrder, openGuidePathModal, guideLink, copyGuideLink, guidePathSteps, guidePathError, handleSaveGuidePath, toggleTargetLanguage, toggleVoiceLanguage, toggleAddLanguageTarget, handleAddRoom, handleDeleteRoom, openRenameModal, handleSaveRename, openNarrationModal, handleSaveNarration, handleAutoPopulateRoom, handleReviewDraft, applySuggestion, dismissSuggestion, reviewChecks, handlePanoramaFileSelected, handleDeletePanorama, handleGenerateVoiceForRoom, handleConfirmDraftAndProcess, handleTranslateRoomLanguages };
}

export type TourAdmin = ReturnType<typeof useTourAdmin>;
