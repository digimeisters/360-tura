import { Language, Waypoint, EstablishData } from './types';
import { THEME } from './theme';
import { adminAuthHeader } from '../../lib/authFetch';

export const normalizeYaw = (yaw: number): number => {
  let res = (yaw + 180) % 360;
  if (res < 0) res += 360;
  return res - 180;
};

export const getShortestTargetYaw = (currentYaw: number, targetYaw: number): number => {
  const normCurrent = normalizeYaw(currentYaw);
  const normTarget = normalizeYaw(targetYaw);
  let diff = normTarget - normCurrent;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return currentYaw + diff;
};

export const getLocalizedText = (textData: unknown, lang: string = 'sr'): string => {
  if (!textData) return '';
  let parsed = textData;
  if (typeof textData === 'string') {
    try {
      parsed = JSON.parse(textData);
    } catch {
      return textData;
    }
  }
  if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, string>;
    return record[lang] || record['sr'] || Object.values(record)[0] || '';
  }
  return String(parsed);
};

export const parseWaypoints = (waypointsData: unknown): Waypoint[] => {
  if (!waypointsData) return [];
  if (Array.isArray(waypointsData)) return waypointsData as Waypoint[];
  if (typeof waypointsData === 'string') {
    try {
      const parsed = JSON.parse(waypointsData);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
};

export const parseEstablish = (establishData: unknown): EstablishData => {
  if (!establishData) return {};
  if (typeof establishData === 'object') return establishData as EstablishData;
  if (typeof establishData === 'string') {
    try {
      const parsed = JSON.parse(establishData);
      if (parsed && typeof parsed === 'object') return parsed as EstablishData;
    } catch {}
  }
  return {};
};

export const buildI18nObject = (
  textValue: string,
  existingData?: unknown,
  currentLang: Language = 'sr'
): Record<string, string> => {
  let result: Record<string, string> = { sr: '', en: '', de: '', ru: '' };
  if (existingData) {
    if (typeof existingData === 'string') {
      try {
        const parsed = JSON.parse(existingData);
        if (parsed && typeof parsed === 'object') {
          result = { ...result, ...(parsed as Record<string, string>) };
        }
      } catch {
        result.sr = existingData;
      }
    } else if (typeof existingData === 'object') {
      result = { ...result, ...(existingData as Record<string, string>) };
    }
  }
  result[currentLang] = textValue;
  return result;
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

// Slično kao buildI18nObject, ali specijalno za audio linkove: ako je
// newValue prazan (korisnik nije uneo/promenio ništa u tom polju), NE
// briše postojeće audio linkove za druge jezike - samo ih prosledi dalje
// nepromenjene. buildI18nObject bi u tom slučaju upisao prazan string i
// obrisao već postojeći audio_url za trenutni jezik.
export const mergeAudioI18n = (
  newValue: string,
  existingData?: unknown,
  currentLang: Language = 'sr'
): Record<string, string> => {
  if (!newValue) {
    if (existingData && typeof existingData === 'object') {
      return existingData as Record<string, string>;
    }
    if (typeof existingData === 'string' && existingData) {
      try {
        const parsed = JSON.parse(existingData);
        if (parsed && typeof parsed === 'object') return parsed as Record<string, string>;
      } catch {
        return { sr: existingData, en: '', de: '', ru: '' };
      }
    }
    return { sr: '', en: '', de: '', ru: '' };
  }
  return buildI18nObject(newValue, existingData, currentLang);
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

export function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: THEME.textPrimary, background: THEME.bg, height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', gap: '20px' }}>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ width: '12px', height: '12px', backgroundColor: THEME.accent, borderRadius: '50%', animation: 'pulseDot 1.4s infinite ease-in-out both', animationDelay: '-0.32s' }} />
        <div style={{ width: '12px', height: '12px', backgroundColor: THEME.accent, borderRadius: '50%', animation: 'pulseDot 1.4s infinite ease-in-out both', animationDelay: '-0.16s' }} />
        <div style={{ width: '12px', height: '12px', backgroundColor: THEME.accent, borderRadius: '50%', animation: 'pulseDot 1.4s infinite ease-in-out both' }} />
      </div>
      <style>{`
        @keyframes pulseDot {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40% { transform: scale(1.0); opacity: 1; }
        }
        .pnlm-load-box {
          display: none !important;
        }
      `}</style>
      <div style={{ color: THEME.accent, fontSize: '16px', letterSpacing: '1px', fontWeight: 500 }}>{children}</div>
    </div>
  );
}
