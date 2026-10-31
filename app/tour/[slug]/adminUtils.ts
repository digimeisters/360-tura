import { Language, Waypoint } from './types';
import { adminAuthHeader } from '../../lib/authFetch';
import { buildI18nObject, getLocalizedText } from './utils';

/**
 * Pomoćne funkcije koje koristi SAMO admin (TourAdminTools). Odvojene su od
 * utils.tsx jer se utils učitava svakom posetiocu ture - a ove funkcije
 * pozivaju admin API rute i posetiocu nikad ne trebaju.
 */

/** Odgovor generate_voice (isti oblik i kad je spojen iz više poziva). */
export type VoiceResult = {
  success: boolean;
  error?: string;
  audio: { establish: Record<string, string>; waypoints: { index: number; audio_url_i18n: Record<string, string> }[] };
  errors: { establish: Record<string, string>; waypoints: Record<string, string> };
  skipped: { establish: string[]; waypoints: string[] };
};

/**
 * Glas sobe, JEDAN poziv po jeziku (redom), pa spojeno. Svi jezici u jednom
 * pozivu (npr. 6 tačaka + uvod x 4 jezika = 28 snimaka) su prelazili 60 s
 * rute: Vercel vrati 504, ElevenLabs je već naplaćen, a u bazi ništa. Ovako
 * pad jednog jezika ne obara ostale.
 */
export const generateVoiceByLanguage = async (
  roomId: string | number,
  langs: Language[],
  content: { establishText: unknown; waypoints: { index: number; text: unknown }[] }
): Promise<VoiceResult> => {
  const merged: VoiceResult = {
    success: false,
    audio: { establish: {}, waypoints: [] },
    errors: { establish: {}, waypoints: {} },
    skipped: { establish: [], waypoints: [] }
  };
  const messages: string[] = [];
  for (const lang of langs) {
    const res = await fetch('/api/ai/auto-populate-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
      body: JSON.stringify({ roomId, action: 'generate_voice', voiceLanguages: [lang], content })
    });
    const result = (await res.json().catch(() => null)) as Partial<VoiceResult> | null;
    if (!result || !result.success) {
      const msg = result?.error || `server nije odgovorio (${res.status})`;
      merged.errors.establish[lang] = msg;
      messages.push(`${lang.toUpperCase()}: ${msg}`);
      continue;
    }
    merged.success = true;
    Object.assign(merged.audio.establish, result.audio?.establish ?? {});
    for (const wp of result.audio?.waypoints ?? []) {
      const slot = merged.audio.waypoints.find((w) => w.index === wp.index);
      if (slot) Object.assign(slot.audio_url_i18n, wp.audio_url_i18n);
      else merged.audio.waypoints.push({ index: wp.index, audio_url_i18n: { ...wp.audio_url_i18n } });
    }
    Object.assign(merged.errors.establish, result.errors?.establish ?? {});
    Object.assign(merged.errors.waypoints, result.errors?.waypoints ?? {});
    merged.skipped.establish.push(...(result.skipped?.establish ?? []));
    merged.skipped.waypoints.push(...(result.skipped?.waypoints ?? []));
  }
  if (!merged.success) merged.error = messages.join('; ') || 'Glas nije generisan.';
  return merged;
};

// Zajednički korak prevoda: za dati srpski izvor (naslov, naracija, tačke)
// šalje po jedan translate_step poziv PARALELNO za svaki ciljani jezik
// (svaki poziv prevodi nezavisno iz 'sr' izvora, pa redosled ne utiče na
// rezultat) i vraća spojene i18n objekte. Koristi ga i draft-flow
// (handleConfirmDraftAndProcess) i "Dodaj jezik" flow
// (handleTranslateRoomLanguages) da se translate_step logika ne duplira.
export const translateRoomToLanguages = async (
  roomId: string | number,
  sourceTitle: string,
  sourceNarrationIntro: string,
  sourceNarrationDetail: string,
  baseTitleI18n: Record<string, string>,
  baseEstablishIntroI18n: Record<string, string>,
  baseEstablishDetailI18n: Record<string, string>,
  baseWaypoints: Waypoint[],
  targetLangs: Language[]
): Promise<{
  titleI18n: Record<string, string>;
  establishIntroI18n: Record<string, string>;
  establishDetailI18n: Record<string, string>;
  waypoints: Waypoint[];
  /** Jezici čiji prevod nije uspeo - za njih nema teksta (ne ostaje stari). */
  failed: Language[];
}> => {
  if (targetLangs.length === 0) {
    return {
      titleI18n: baseTitleI18n,
      establishIntroI18n: baseEstablishIntroI18n,
      establishDetailI18n: baseEstablishDetailI18n,
      waypoints: baseWaypoints,
      failed: []
    };
  }

  const responses = await Promise.all(
    targetLangs.map(async (targetLang) => {
      const res = await fetch('/api/ai/auto-populate-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
        body: JSON.stringify({
          roomId,
          action: 'translate_step',
          targetLang,
          draft: {
            title: sourceTitle,
            narrationIntro: sourceNarrationIntro,
            narrationDetail: sourceNarrationDetail,
            waypoints: baseWaypoints
          }
        })
      });
      // Vercel 504 vraća HTML - jedan pao jezik ne sme da obori ceo upis.
      const result = await res.json().catch(() => ({ success: false, error: `Greška servera (${res.status}).` }));
      return { targetLang, result };
    })
  );

  const titleI18n: Record<string, string> = { ...baseTitleI18n };
  let establishIntroI18n: Record<string, string> = { ...baseEstablishIntroI18n };
  let establishDetailI18n: Record<string, string> = { ...baseEstablishDetailI18n };
  let waypoints = baseWaypoints;
  const failed: Language[] = [];

  for (const { targetLang, result } of responses) {
    if (result.success && result.translated) {
      titleI18n[targetLang] = result.translated.title;
      establishIntroI18n = { ...establishIntroI18n, [targetLang]: result.translated.narrationIntro };
      establishDetailI18n = { ...establishDetailI18n, [targetLang]: result.translated.narrationDetail };

      if (Array.isArray(result.translated.waypoints)) {
        waypoints = waypoints.map((wp, idx) => ({
          ...wp,
          text_i18n: buildI18nObject(
            getLocalizedText(result.translated.waypoints[idx]?.text_i18n, targetLang),
            wp.text_i18n,
            targetLang
          ),
          title_i18n: buildI18nObject(
            getLocalizedText(result.translated.waypoints[idx]?.title_i18n, targetLang),
            wp.title_i18n,
            targetLang
          )
        }));
      }
    } else {
      console.warn(`[Prevod] Neuspešan prevod za ${targetLang}:`, result.error);
      failed.push(targetLang);
    }
  }

  return { titleI18n, establishIntroI18n, establishDetailI18n, waypoints, failed };
};

// Za razliku od getLocalizedText (koja pada nazad na 'sr' ako traženi jezik
// fali - dobro za PRIKAZ), ova funkcija proverava da li TAČNO taj jezik ima
// nepraznu vrednost. Koristi se pre slanja teksta na TTS, jer backend ne radi
// fallback - ako je 'en' ključ prazan/nedostaje, ništa se neće izgovoriti za
// engleski čak i ako 'sr' tekst postoji.
export const hasExactLangText = (i18nData: unknown, lang: Language): boolean => {
  if (!i18nData) return false;
  let parsed: unknown = i18nData;
  if (typeof i18nData === 'string') {
    try {
      parsed = JSON.parse(i18nData);
    } catch {
      return lang === 'sr' && i18nData.trim().length > 0;
    }
  }
  if (parsed && typeof parsed === 'object') {
    const value = (parsed as Record<string, string>)[lang];
    return typeof value === 'string' && value.trim().length > 0;
  }
  return false;
};
