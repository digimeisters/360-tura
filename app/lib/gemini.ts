import { GoogleGenAI, type GenerateContentConfig, type ContentListUnion } from '@google/genai';

/**
 * Zajednički sloj za sve Gemini pozive u aplikaciji.
 *
 * Ranije je svaka ruta imala svoju verziju "pozovi pa probaj ponovo": jedna je
 * imala progresivno čekanje ali nije imala fallback model, druga je imala
 * "fallback" na isti model bez pauze. Ovde je jedno ponašanje za oba mesta.
 */

export const GEMINI_MODEL = 'gemini-3.1-flash-lite';

// Pravi fallback mora da bude JAČI model, ne isti. Ako lite dva puta ne uspe,
// najčešće je preopterećen ili mu je zadatak pretežak - ponavljanje istog
// poziva tu ne pomaže.
export const GEMINI_FALLBACK_MODEL = 'gemini-3.1-flash';

// Niska temperatura za izvlačenje i prevod podataka: isti ulaz treba da daje
// isti izlaz. Opisni tekst sobe sme da bude slobodniji, pa je to poseban izbor
// na mestu poziva.
export const TEMP_EXTRACT = 0.2;
export const TEMP_DESCRIPTIVE = 0.6;

let client: GoogleGenAI | null = null;

export function geminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY fali.');
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

function statusOf(err: unknown): number | undefined {
  const e = err as { status?: number; code?: number };
  return e?.status ?? e?.code;
}

/** Preopterećen model (503) ili probijen limit (429) - ima smisla sačekati. */
function isRetryable(err: unknown): boolean {
  const status = statusOf(err);
  if (status === 503 || status === 429 || status === 500) return true;
  return /\b(429|500|503)\b/.test(String(err));
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export type GeminiCallOptions = {
  contents: ContentListUnion;
  config: GenerateContentConfig;
  /** Koliko čekamo JEDAN pokušaj pre nego što ga odustanemo. */
  timeoutMs?: number;
  /** Broj pokušaja sa primarnim modelom pre prelaska na fallback. */
  attempts?: number;
  model?: string;
  fallbackModel?: string;
  /** Oznaka za log, da se u Vercel logovima vidi koji poziv je pao. */
  label?: string;
};

export type GeminiResult = {
  text: string;
  usedModel: string;
};

/**
 * Poziva model, ponavlja na privremene greške sa sve dužom pauzom, i tek ako
 * primarni model ne uspe prelazi na jači. Vraća SIROV tekst odgovora, već
 * proveren da nije prazan i da nije presečen na pola.
 */
export async function generateWithRetry(options: GeminiCallOptions): Promise<GeminiResult> {
  const {
    contents,
    config,
    timeoutMs = 25_000,
    attempts = 2,
    model = GEMINI_MODEL,
    fallbackModel = GEMINI_FALLBACK_MODEL,
    label = 'gemini'
  } = options;

  const ai = geminiClient();
  const models = fallbackModel && fallbackModel !== model ? [model, fallbackModel] : [model];

  let lastError: unknown = new Error('Gemini poziv nije ni pokušan.');

  for (const currentModel of models) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await ai.models.generateContent({
          model: currentModel,
          contents,
          config: { ...config, abortSignal: controller.signal }
        });

        return { text: readResponseText(response), usedModel: currentModel };
      } catch (err) {
        lastError = err;

        const isLastAttemptOnModel = attempt === attempts;
        const canRetryHere = isRetryable(err) && !isLastAttemptOnModel;

        console.warn(
          `[${label}] ${currentModel} pokušaj ${attempt}/${attempts} nije uspeo:`,
          (err as Error)?.message || err
        );

        if (canRetryHere) {
          await sleep(1500 * attempt);
          continue;
        }

        // Prelazi se na sledeći model; ako ga nema, petlja se završava i
        // poslednja greška ide pozivaocu.
        break;
      } finally {
        clearTimeout(timer);
      }
    }
  }

  throw lastError;
}

/**
 * Izvlači tekst iz odgovora i odmah prijavljuje dva stanja koja inače stignu
 * do korisnika kao nerazumljiva greška: prazan odgovor (model je odbio) i
 * odgovor presečen na limitu tokena (JSON.parse bi pukao sa "Unexpected end
 * of JSON input", što šalje u pogrešnom pravcu).
 */
function readResponseText(response: unknown): string {
  const res = response as {
    text?: string | (() => string);
    candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[];
  };

  const finishReason = res?.candidates?.[0]?.finishReason;
  if (finishReason === 'MAX_TOKENS') {
    throw new Error(
      'Odgovor modela je presečen jer je dostigao limit tokena. Smanji broj jezika ili dužinu teksta.'
    );
  }

  let text = '';
  if (typeof res?.text === 'function') text = res.text();
  else if (typeof res?.text === 'string') text = res.text;
  else if (res?.candidates?.[0]?.content?.parts?.[0]?.text) {
    text = res.candidates[0].content!.parts![0].text!;
  }

  if (!text.trim()) {
    throw new Error(
      finishReason && finishReason !== 'STOP'
        ? `Model nije vratio sadržaj (razlog: ${finishReason}).`
        : 'Model nije vratio tekstualni sadržaj.'
    );
  }

  return text;
}

/** Isto kao generateWithRetry, ali odmah parsira JSON odgovor. */
export async function generateJsonWithRetry<T>(options: GeminiCallOptions): Promise<{ data: T; usedModel: string }> {
  const { text, usedModel } = await generateWithRetry(options);

  try {
    return { data: JSON.parse(text) as T, usedModel };
  } catch {
    throw new Error('Model je vratio tekst koji nije validan JSON.');
  }
}
