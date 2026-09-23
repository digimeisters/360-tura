import { Type, type Schema } from '@google/genai';
import { generateJsonWithRetry, TEMP_EXTRACT } from './gemini';

/**
 * Prevod kratkih tekstova oglasa (odgovori na česta pitanja) sa srpskog na
 * jedan jezik, u jednom pozivu modela. Samo za server (API rute).
 *
 * Namerno "doslovan" prevod (TEMP_EXTRACT): brojevi, iznosi i datumi su
 * činjenice iz oglasa i ne smeju da se promene ni zaokruže.
 */

export type TargetLang = 'en' | 'de' | 'ru';

const LANG_NAMES: Record<TargetLang, string> = {
  en: 'English',
  de: 'German',
  ru: 'Russian'
};

const AI_TIMEOUT_MS = 20_000;

export async function translateTexts(texts: string[], targetLang: TargetLang): Promise<string[]> {
  if (!texts.length) return [];

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      translations: {
        type: Type.ARRAY,
        description: `Mora imati TAČNO ${texts.length} elemenata, istim redosledom kao ulaz.`,
        items: { type: Type.STRING }
      }
    },
    required: ['translations']
  };

  const prompt = [
    `Translate the following real-estate listing answers from Serbian (Latin script) into ${LANG_NAMES[targetLang]}.`,
    'Rules:',
    '- Keep every number, price, date and time exactly as written; translate currency words into the target language ("eura" → "euros" in English, "Euro" in German, "евро" in Russian; "dinara" → "dinars").',
    '- Do not add, remove or soften any information. Keep each answer short, like the original.',
    '- Return JSON {"translations": [...]} with exactly one translation per input, in the same order.',
    '',
    'Answers (JSON array):',
    JSON.stringify(texts)
  ].join('\n');

  const { data } = await generateJsonWithRetry<{ translations?: unknown }>({
    contents: [{ text: prompt }],
    config: { responseMimeType: 'application/json', responseSchema: schema, temperature: TEMP_EXTRACT },
    timeoutMs: AI_TIMEOUT_MS,
    label: `Prevod odgovora na ${LANG_NAMES[targetLang]}`
  });

  const out = Array.isArray(data.translations) ? data.translations : [];
  if (out.length !== texts.length || out.some((t) => typeof t !== 'string' || !t.trim())) {
    throw new Error('Prevod nema isti broj odgovora kao ulaz.');
  }
  return (out as string[]).map((t) => t.trim());
}
