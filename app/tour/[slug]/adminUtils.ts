import { Language, Waypoint } from './types';
import { adminAuthHeader } from '../../lib/authFetch';
import { buildI18nObject, getLocalizedText } from './utils';

/**
 * Pomoćne funkcije koje koristi SAMO admin (TourAdminTools). Odvojene su od
 * utils.tsx jer se utils učitava svakom posetiocu ture - a ove funkcije
 * pozivaju admin API rute i posetiocu nikad ne trebaju.
 */

// Zajednički korak prevoda: za dati srpski izvor (naslov, naracija, tačke)
// šalje po jedan translate_step poziv PARALELNO za svaki ciljani jezik
// (svaki poziv prevodi nezavisno iz 'sr' izvora, pa redosled ne utiče na
// rezultat) i vraća spojene i18n objekte. Koristi ga i draft-flow
// (handleConfirmDraftAndProcess) i "Dodaj jezik" flow
// (handleTranslateRoomLanguages) da se translate_step logika ne duplira.
export const translateRoomToLanguages = async (
  roomId: string | number,
  sourceTitle: string,
  sourceNarration: string,
  baseTitleI18n: Record<string, string>,
  baseEstablishTextI18n: Record<string, string>,
  baseWaypoints: Waypoint[],
  targetLangs: Language[]
): Promise<{
  titleI18n: Record<string, string>;
  establishTextI18n: Record<string, string>;
  waypoints: Waypoint[];
}> => {
  if (targetLangs.length === 0) {
    return { titleI18n: baseTitleI18n, establishTextI18n: baseEstablishTextI18n, waypoints: baseWaypoints };
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
          draft: { title: sourceTitle, narration: sourceNarration, waypoints: baseWaypoints }
        })
      });
      const result = await res.json();
      return { targetLang, result };
    })
  );

  const titleI18n: Record<string, string> = { ...baseTitleI18n };
  let establishTextI18n: Record<string, string> = { ...baseEstablishTextI18n };
  let waypoints = baseWaypoints;

  for (const { targetLang, result } of responses) {
    if (result.success && result.translated) {
      titleI18n[targetLang] = result.translated.title;
      establishTextI18n = { ...establishTextI18n, [targetLang]: result.translated.narration };

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
    }
  }

  return { titleI18n, establishTextI18n, waypoints };
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
