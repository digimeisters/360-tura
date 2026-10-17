import { NextResponse } from 'next/server';
import { Type, type Schema } from '@google/genai';
import { draftIntro, factsFor, INTRO_LANGS, MAX_CHARS, PURPOSES, type Purpose } from '@/app/lib/tourIntro';
import { requireAdmin } from '@/app/lib/adminAuth';
import { generateJsonWithRetry, GEMINI_FALLBACK_MODEL, GEMINI_MODEL, TEMP_EXTRACT } from '@/app/lib/gemini';
import { synthesizeSpeech, uploadNarration, voiceIdFor, type VoiceLang } from '@/app/lib/tts';
import { getLocalizedText } from '@/app/tour/[slug]/utils';
import { isLanguageAvailable } from '@/app/tour/[slug]/tourLanguages';
import type { Room, Tour } from '@/app/tour/[slug]/types';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Uvod ture (vlasnik, 17. 10. 2026): kratak glas na početku automatskog
 * vodiča, dok posetilac "dolazi sa mape" (TourIntroOverlay). Ne prikazuje se
 * kao tekst. Naracije soba se ovde ne diraju.
 *
 *  - load:  podaci ture koje AI vidi + postojeći uvod (admin TourIntroModal)
 *  - draft: AI predlog na srpskom iz OSNOVNIH podataka, po nameni
 *  - voice: (ispravljen) srpski tekst -> prevod na jezike ture -> glas -> upis
 *  - clear: briše uvod (tura se vraća na start bez njega)
 */

type Admin = Extract<Awaited<ReturnType<typeof requireAdmin>>, { ok: true }>;
async function loadTour(supabase: Admin, slug: string) {
  const [tourRes, roomsRes] = await Promise.all([
    supabase.supabase.from('tours').select('*').eq('slug', slug).single(),
    supabase.supabase.from('rooms').select('*').eq('tour_slug', slug)
  ]);
  if (tourRes.error || !tourRes.data) throw new Error('Tura nije pronađena.');
  return { tour: tourRes.data as unknown as Tour & Record<string, unknown>, rooms: (roomsRes.data ?? []) as unknown as Room[] };
}

/** Jezici koje tura nudi posetiocu - samo za njih se uvod prevodi i snima. */
function tourLanguages(tour: Tour, rooms: Room[]): VoiceLang[] {
  return INTRO_LANGS.filter((l) => isLanguageAvailable(l, tour, rooms));
}

function translationSchema(langs: VoiceLang[]): Schema {
  return {
    type: Type.OBJECT,
    properties: Object.fromEntries(langs.map((l) => [l, { type: Type.STRING }])),
    required: langs
  };
}

const LANG_NAMES: Record<VoiceLang, string> = { sr: 'srpski', en: 'English', de: 'Deutsch', ru: 'русский' };

async function handleLoad(admin: Admin, slug: string) {
  const { tour, rooms } = await loadTour(admin, slug);
  const purpose: Purpose = PURPOSES.includes(tour.category as Purpose) ? (tour.category as Purpose) : 'sale';
  return NextResponse.json({
    success: true,
    title: getLocalizedText(tour.title_i18n, 'sr'),
    purpose,
    facts: factsFor(tour),
    hasLocation: typeof tour.lat === 'number' && typeof tour.lng === 'number',
    languages: tourLanguages(tour, rooms),
    intro: (tour.intro_i18n as Record<string, string> | null) ?? null,
    audio: (tour.intro_audio_i18n as Record<string, string> | null) ?? null
  });
}

async function handleDraft(admin: Admin, slug: string, body: Record<string, unknown>) {
  const { tour } = await loadTour(admin, slug);
  const purpose: Purpose = PURPOSES.includes(body.purpose as Purpose) ? (body.purpose as Purpose) : 'sale';
  const previous = typeof body.previous === 'string' ? body.previous.slice(0, MAX_CHARS) : '';
  return NextResponse.json({ success: true, text: await draftIntro(tour, purpose, previous) });
}

async function handleVoice(admin: Admin, slug: string, body: Record<string, unknown>) {
  const sr = typeof body.text === 'string' ? body.text.replace(/\s+/g, ' ').trim() : '';
  if (!sr) return NextResponse.json({ success: false, error: 'Uvod je prazan.' }, { status: 400 });
  if (sr.length > MAX_CHARS) {
    return NextResponse.json({ success: false, error: `Uvod je predug (${sr.length} znakova, najviše ${MAX_CHARS}).` }, { status: 400 });
  }
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'Glas trenutno nije dostupan - ELEVENLABS_API_KEY nije podešen na serveru.' }, { status: 501 });
  }

  const { tour, rooms } = await loadTour(admin, slug);
  const langs = tourLanguages(tour, rooms);
  const foreign = langs.filter((l) => l !== 'sr');

  const texts: Partial<Record<VoiceLang, string>> = { sr };
  if (foreign.length) {
    const { data } = await generateJsonWithRetry<Partial<Record<VoiceLang, string>>>({
      contents: [
        {
          text: `Prevedi uvodnu naraciju nekretnine sa srpskog na: ${foreign.map((l) => `${l} (${LANG_NAMES[l]})`).join(', ')}.
Tekst se izgovara (glas), pa prevod mora zvučati prirodno na tom jeziku. Zadrži sve činjenice i brojeve, ništa ne dodaj. Naziv naselja i grada ostavi kako jeste (latinica; za ruski transliteruj ćirilicom). Kvadrate napiši rečima jedinice tog jezika (npr. "54 square metres", "54 Quadratmeter", "54 квадратных метра").

Tekst: "${sr}"

Vrati JSON sa ključevima ${foreign.join(', ')}.`
        }
      ],
      config: { responseMimeType: 'application/json', responseSchema: translationSchema(foreign), temperature: TEMP_EXTRACT },
      model: GEMINI_FALLBACK_MODEL,
      fallbackModel: GEMINI_MODEL,
      attempts: 1,
      label: 'tour-intro translate'
    });
    for (const l of foreign) {
      const t = String(data?.[l] ?? '').replace(/\s+/g, ' ').trim();
      if (t) texts[l] = t;
    }
  }

  // Novo ime pri svakom snimanju - CDN dugo kešira isti URL, pa bi ispravljen
  // uvod i dalje zvučao kao stari.
  const stamp = Date.now().toString(36);
  const audio: Partial<Record<VoiceLang, string>> = {};
  const errors: Partial<Record<VoiceLang, string>> = {};
  await Promise.all(
    (Object.keys(texts) as VoiceLang[]).map(async (l) => {
      const voiceId = voiceIdFor(l);
      if (!voiceId) {
        errors[l] = 'ELEVENLABS_VOICE_ID nije podešen.';
        return;
      }
      try {
        const buf = await synthesizeSpeech(texts[l]!, voiceId, apiKey);
        audio[l] = await uploadNarration(admin.supabase, `${slug}/intro-${l}-${stamp}.mp3`, buf);
      } catch (err) {
        errors[l] = err instanceof Error ? err.message : 'Nepoznata greška.';
      }
    })
  );

  if (!audio.sr) {
    return NextResponse.json({ success: false, error: `Glas nije snimljen: ${errors.sr ?? 'nepoznata greška'}`, errors }, { status: 502 });
  }

  const { error } = await admin.supabase.from('tours').update({ intro_i18n: texts, intro_audio_i18n: audio }).eq('slug', slug);
  if (error) throw new Error(error.message);
  return NextResponse.json({ success: true, intro: texts, audio, errors });
}

async function handleClear(admin: Admin, slug: string) {
  const { error } = await admin.supabase.from('tours').update({ intro_i18n: null, intro_audio_i18n: null }).eq('slug', slug);
  if (error) throw new Error(error.message);
  return NextResponse.json({ success: true });
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(req);
    if (!admin.ok) return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });

    const body = (await req.json()) as Record<string, unknown>;
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    if (!slug) return NextResponse.json({ success: false, error: 'Nedostaje tura.' }, { status: 400 });

    switch (body.action) {
      case 'load':
        return await handleLoad(admin, slug);
      case 'draft':
        return await handleDraft(admin, slug, body);
      case 'voice':
        return await handleVoice(admin, slug, body);
      case 'clear':
        return await handleClear(admin, slug);
      default:
        return NextResponse.json({ success: false, error: 'Nepoznata radnja.' }, { status: 400 });
    }
  } catch (error) {
    console.error('[tour-intro]', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Greška.' }, { status: 500 });
  }
}
