import { supabase } from '../../lib/supabaseClient';
import { adminAuthHeader } from '../../lib/authFetch';
import { generateVoiceByLanguage, translateRoomToLanguages } from './adminUtils';
import { buildI18nObject, composeEstablishText, getLocalizedText, parseEstablish, parseWaypoints } from './utils';
import type { EstablishData, Language, Room, Waypoint } from './types';

/**
 * AI predlog sobe -> prevod -> glas -> upis u bazu. Zajedničko za
 * "🤖 AI Popuni Sobu" (jedna soba) i "🤖 AI sve sobe" (više soba redom), da
 * oba rade isto: novi srpski tekst briše stare prevode i stari glas, vrata
 * (navigacija) ostaju, a jezik čiji prevod ne uspe ostaje bez teksta.
 */

export type AiDraft = { title: string; narrationIntro: string; narrationDetail: string; waypoints: Waypoint[] };

export type AppliedDraft = {
  title_i18n: Record<string, string>;
  establish_i18n: EstablishData;
  waypoints_i18n: Waypoint[];
  /** Jezici čiji prevod nije uspeo. */
  failedLangs: Language[];
  /** Broj snimljenih segmenata glasa i opis grešaka (prazno = bez grešaka). */
  voiceCount: number;
  voiceErrors: string[];
};

/** AI predlog za sobu (generate_draft) - isti poziv kao "AI Popuni Sobu". */
export async function requestRoomDraft(room: Room, listingType: string | null | undefined): Promise<AiDraft> {
  const panoramaUrl = room.panorama_url_cf || room.panorama_url;
  if (!panoramaUrl) throw new Error('Soba nema panoramu.');
  const res = await fetch('/api/ai/auto-populate-room', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
    body: JSON.stringify({ roomId: room.id, panoramaUrl, listingType, action: 'generate_draft' })
  });
  const result = await res.json().catch(() => ({ success: false, error: `Greška servera (${res.status}).` }));
  if (!result.success || !result.draft) throw new Error(result.error || 'AI nije vratio predlog.');
  return result.draft as AiDraft;
}

export async function applyRoomDraft(opts: {
  room: Room;
  draft: AiDraft;
  /** Jezici za prevod osim srpskog. */
  otherLangs: Language[];
  voiceLangs: Language[];
  onStep?: (step: 'translate' | 'voice' | 'save') => void;
}): Promise<AppliedDraft> {
  const { room, draft, otherLangs, voiceLangs, onStep } = opts;

  // Novi srpski tekst: prevodi i snimljeni glas starog teksta više ne važe.
  const keepLangs = (o: Record<string, string>) =>
    Object.fromEntries(Object.entries(o).filter(([l]) => l === 'sr' || (otherLangs as string[]).includes(l)));
  const baseEstablish = parseEstablish(room.establish_i18n);
  let title: Record<string, string> = keepLangs(buildI18nObject(draft.title, room.title_i18n, 'sr'));
  const establish: EstablishData = {
    ...baseEstablish,
    intro_i18n: keepLangs(buildI18nObject(draft.narrationIntro, baseEstablish.intro_i18n, 'sr')),
    detail_i18n: keepLangs(buildI18nObject(draft.narrationDetail, baseEstablish.detail_i18n, 'sr')),
    audio_url_i18n: undefined,
    audio_url: undefined
  };

  // Vrata ka drugim sobama AI ne pravi - ostaju kakva jesu, posle novih info-tačaka.
  const keptDoors = parseWaypoints(room.waypoints_i18n).filter((wp) => wp.targetRoomId != null || (wp.type != null && wp.type !== 'info'));
  let waypoints: Waypoint[] = draft.waypoints.map((wp) => ({
    ...wp,
    title_i18n: buildI18nObject(getLocalizedText(wp.title_i18n, 'sr'), wp.title_i18n, 'sr'),
    text_i18n: buildI18nObject(getLocalizedText(wp.text_i18n, 'sr'), wp.text_i18n, 'sr')
  }));

  let failedLangs: Language[] = [];
  if (otherLangs.length > 0) {
    onStep?.('translate');
    const translated = await translateRoomToLanguages(
      room.id,
      draft.title,
      draft.narrationIntro,
      draft.narrationDetail,
      title,
      typeof establish.intro_i18n === 'object' ? (establish.intro_i18n as Record<string, string>) : {},
      typeof establish.detail_i18n === 'object' ? (establish.detail_i18n as Record<string, string>) : {},
      waypoints,
      otherLangs
    );
    failedLangs = translated.failed;
    // Neuspeo jezik nema tekst (prikaz pada na srpski) - ne stari opis sobe.
    const dropFailed = (o: Record<string, string>) =>
      Object.fromEntries(Object.entries(o).filter(([l]) => !(failedLangs as string[]).includes(l)));
    title = dropFailed(translated.titleI18n);
    establish.intro_i18n = dropFailed(translated.establishIntroI18n);
    establish.detail_i18n = dropFailed(translated.establishDetailI18n);
    waypoints = translated.waypoints;
  }

  let voiceCount = 0;
  const voiceErrors: string[] = [];
  if (voiceLangs.length > 0) {
    onStep?.('voice');
    try {
      const voice = await generateVoiceByLanguage(room.id, voiceLangs, {
        establishText: composeEstablishText(establish),
        waypoints: waypoints.map((wp, idx) => ({ index: idx, text: wp.text_i18n }))
      });
      if (voice.success) {
        establish.audio_url_i18n = { ...voice.audio.establish };
        waypoints = waypoints.map((wp, idx) => {
          const wpAudio = voice.audio.waypoints.find((a) => a.index === idx);
          if (!wpAudio) return wp;
          const existing = typeof wp.audio_url_i18n === 'object' ? wp.audio_url_i18n : {};
          return { ...wp, audio_url_i18n: { ...existing, ...wpAudio.audio_url_i18n } };
        });
        voiceCount =
          Object.keys(voice.audio.establish).length + voice.audio.waypoints.reduce((n, w) => n + Object.keys(w.audio_url_i18n).length, 0);
      }
      voiceErrors.push(
        ...Object.entries(voice.errors.establish).map(([l, e]) => `Uvod (${l.toUpperCase()}): ${e}`),
        ...Object.entries(voice.errors.waypoints).map(([k, e]) => `Tačka ${k}: ${e}`)
      );
      if (!voice.success && voice.error && !voiceErrors.length) voiceErrors.push(voice.error);
    } catch (err) {
      voiceErrors.push(err instanceof Error ? err.message : 'mrežna greška');
    }
  }

  onStep?.('save');
  waypoints = [...waypoints, ...keptDoors];
  const { error } = await supabase
    .from('rooms')
    .update({ title_i18n: title, establish_i18n: establish, waypoints_i18n: waypoints })
    .eq('id', String(room.id));
  if (error) throw error;

  return { title_i18n: title, establish_i18n: establish, waypoints_i18n: waypoints, failedLangs, voiceCount, voiceErrors };
}
