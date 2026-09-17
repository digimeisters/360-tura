import { Language, Waypoint, EstablishData, Tour } from './types';
import { THEME } from './theme';
import { FACT_LABELS, HEATING_LABELS } from './translations';

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

const toI18nRecord = (value: unknown): Record<string, string> => {
  if (!value) return {};
  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return {};
    }
  }
  return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
};

/**
 * Spaja dvodelnu uvodnu naraciju (namena + specifično) u JEDAN i18n objekat
 * koji playNarration ume da čita - i dalje po jeziku, da promena jezika usred
 * naracije radi kao i pre. Sobe napravljene pre podele imaju samo text_i18n,
 * pa se on vraća nepromenjen; prazno (nijedno polje) vraća '' da pozivalac
 * može da padne nazad na svoj podrazumevani tekst dobrodošlice.
 */
export const composeEstablishText = (establishData: EstablishData): Record<string, string> | string => {
  const intro = toI18nRecord(establishData.intro_i18n);
  const detail = toI18nRecord(establishData.detail_i18n);
  if (Object.keys(intro).length === 0 && Object.keys(detail).length === 0) {
    return establishData.text_i18n || '';
  }
  const combined: Record<string, string> = {};
  for (const lang of ['sr', 'en', 'de', 'ru']) {
    combined[lang] = [intro[lang], detail[lang]].filter((part) => part && part.trim()).join(' ');
  }
  return combined;
};

export type FactRow = { label: string; value: string };

// Postgres `numeric` (area_sqm) stiže kao tekst kroz PostgREST.
function asNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Tabela osnovnih podataka u Info modalu (migracije 012/013/014) - naselje,
 * kvadratura, sprat, lift, podrum, grejanje. Nijedan red ovde ne prolazi
 * kroz AI: vrednost je ili slobodan tekst koji je agent otkucao (naselje,
 * sprat), ili broj (kvadratura), ili prevod jedne zatvorene vrednosti
 * (lift/podrum da-ne, grejanje sa liste) - prevodi ga FACT_LABELS/
 * HEATING_LABELS, statički rečnik u aplikaciji.
 *
 * Prazno polje se prosto ne pojavljuje kao red - bolje nego prazan ili
 * izmišljen podatak.
 */
export function buildFactList(tour: Tour | null | undefined, lang: Language): FactRow[] {
  if (!tour) return [];
  const t = FACT_LABELS[lang] ?? FACT_LABELS.sr;
  const yesNo = (v: string | null | undefined) => (v === 'Da' ? t.yes : v === 'Ne' ? t.no : v || '');
  const area = asNumber(tour.area_sqm);

  const rows: FactRow[] = [
    { label: t.neighbourhood, value: tour.district?.trim() || '' },
    { label: t.area, value: area !== null ? `${area} m²` : '' },
    { label: t.floor, value: tour.floor?.trim() || '' },
    { label: t.elevator, value: yesNo(tour.has_elevator) },
    { label: t.basement, value: yesNo(tour.has_basement) },
    {
      label: t.heating,
      value: tour.heating ? (HEATING_LABELS[tour.heating]?.[lang] ?? tour.heating) : ''
    }
  ];

  return rows.filter((row) => row.value !== '');
}

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
