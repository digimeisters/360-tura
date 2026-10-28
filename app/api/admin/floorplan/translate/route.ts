import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/adminAuth';
import { generateJsonWithRetry, TEMP_EXTRACT } from '@/app/lib/gemini';
import { FOREIGN_LANGS, type ForeignLang } from '@/app/lib/floorplanLayout';

export const dynamic = 'force-dynamic';

/**
 * Prevod naziva prostorija šematskog tlocrta koje ne zna ni tura ni rečnik
 * (app/lib/roomNames.ts). Editor (/admin/plan/[slug]) zove ovo pri čuvanju;
 * ako ne uspe, plan se ipak čuva, a taj naziv ostaje na srpskom.
 *
 * Telo: { names: string[], langs: ('en'|'de'|'ru')[] }
 * Odgovor: { success, translations: { [srNaziv]: { en?, de?, ru? } } }
 */

const MAX_NAMES = 40;
const LANG_NAMES: Record<ForeignLang, string> = { en: 'English', de: 'German', ru: 'Russian' };

export async function POST(req: Request) {
  const ctx = await requireAdmin(req);
  if (!ctx.ok) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });

  const body = await req.json().catch(() => null);
  const names: string[] = Array.isArray(body?.names)
    ? [...new Set<string>(body.names.filter((n: unknown): n is string => typeof n === 'string' && n.trim().length > 0 && n.length <= 60).map((n: string) => n.trim()))].slice(0, MAX_NAMES)
    : [];
  const langs = FOREIGN_LANGS.filter((l) => Array.isArray(body?.langs) && body.langs.includes(l));
  if (!names.length || !langs.length) return NextResponse.json({ success: false, error: 'Nema šta da se prevede.' }, { status: 400 });

  const prompt = [
    'Translate these short room names from a Serbian apartment floor plan.',
    `Target languages: ${langs.map((l) => `${l} (${LANG_NAMES[l]})`).join(', ')}.`,
    'Use the usual real-estate floor plan term, short, capitalized like a label, no explanations.',
    'Keep any trailing number as is.',
    'Return only a JSON object: { "<Serbian name>": { "<lang>": "<translation>" } }.',
    '',
    ...names.map((n) => `- ${n}`)
  ].join('\n');

  try {
    const { data } = await generateJsonWithRetry<Record<string, Record<string, unknown>>>({
      contents: [{ text: prompt }],
      config: { responseMimeType: 'application/json', temperature: TEMP_EXTRACT },
      timeoutMs: 15_000,
      label: 'floorplan-translate'
    });
    // Samo traženi nazivi i jezici, kratki stringovi - ostalo iz odgovora se odbacuje.
    const translations: Record<string, Partial<Record<ForeignLang, string>>> = {};
    for (const name of names) {
      const row = data?.[name];
      if (!row || typeof row !== 'object') continue;
      const out: Partial<Record<ForeignLang, string>> = {};
      for (const lang of langs) {
        const v = row[lang];
        if (typeof v === 'string' && v.trim() && v.length <= 60) out[lang] = v.trim();
      }
      if (Object.keys(out).length) translations[name] = out;
    }
    return NextResponse.json({ success: true, translations });
  } catch (err) {
    console.error('[api/admin/floorplan/translate]', err);
    return NextResponse.json({ success: false, error: 'Prevod trenutno nije uspeo.' }, { status: 502 });
  }
}
