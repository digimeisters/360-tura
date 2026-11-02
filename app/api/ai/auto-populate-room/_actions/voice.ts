import { NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { synthesizeSpeech, uploadNarration, voiceIdFor, VOICE_LANGS, type VoiceLang } from '@/app/lib/tts';
import { extractText } from './shared';

/**
 * ============================================================
 * GLASOVNA NARACIJA (ElevenLabs)
 * ============================================================
 * Vraćeno 1. 10. 2026 - ruta je od commita 9678ce2 vraćala 501 (frontend u
 * TourAdminTools.tsx je ceo ovaj ugovor, generate_voice/audio/errors/skipped,
 * sve vreme čekao neokrnjen). Jedan glas za sva 4 jezika (vlasnikova odluka,
 * 28. 9. 2026); ako se nekad doda glas po jeziku, ELEVENLABS_VOICE_ID_<JEZIK>
 * ima prednost nad opštim ELEVENLABS_VOICE_ID.
 */

/**
 * Bezbednosna kočnica za slučajno zalepljen ogroman tekst - admin forma inače
 * ograničava uvod/detalj/tačku na 140/220/180 znakova (roomDraftRules.ts), pa
 * i spojen establish tekst retko pređe par stotina znakova.
 */
const TTS_MAX_CHARS = 700;

/**
 * Da li i18n polje ima SVOJ tekst za `lang` - za razliku od `extractText`,
 * ovde se NE pada nazad na sr. Prazan prevod mora ostati nem, ne sme da
 * izgovori srpski tekst pod stranim jezikom.
 */
function hasOwnLangText(value: unknown, lang: string): boolean {
  if (!value) return false;
  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return lang === 'sr' && value.trim().length > 0;
    }
  }
  if (parsed && typeof parsed === 'object') {
    const v = (parsed as Record<string, string>)[lang];
    return typeof v === 'string' && v.trim().length > 0;
  }
  return false;
}

type GenerateVoiceBody = {
  roomId?: string | number;
  voiceLanguages?: unknown;
  content?: { establishText?: unknown; waypoints?: { index: number; text: unknown }[] };
};

export async function handleGenerateVoice(body: GenerateVoiceBody, supabase: SupabaseClient) {
  const roomId = body.roomId;
  const voiceLanguages: VoiceLang[] = Array.isArray(body.voiceLanguages)
    ? body.voiceLanguages.filter((l: unknown): l is VoiceLang => VOICE_LANGS.includes(l as VoiceLang))
    : [];

  if (!roomId || voiceLanguages.length === 0) {
    return NextResponse.json({ success: false, error: 'Nedostaje soba ili jezik za glas.' }, { status: 400 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'Glasovna naracija trenutno nije dostupna - ELEVENLABS_API_KEY nije podešen na serveru.' },
      { status: 501 }
    );
  }

  // Isti oblik putanje kao dosadašnji snimci (napravljeni ručnim skriptama
  // pre nego što je ova ruta vraćena) - {slug}/{roomId}/... u kanti "narrations".
  const { data: roomRow } = await supabase.from('rooms').select('tour_slug').eq('id', roomId).single();
  const folder = roomRow?.tour_slug ? `${roomRow.tour_slug}/${roomId}` : String(roomId);

  const content = body.content || {};
  const establishText = content.establishText;
  const waypoints: { index: number; text: unknown }[] = Array.isArray(content.waypoints) ? content.waypoints : [];

  const audio: { establish: Record<string, string>; waypoints: { index: number; audio_url_i18n: Record<string, string> }[] } = {
    establish: {},
    waypoints: []
  };
  const errors: { establish: Record<string, string>; waypoints: Record<string, string> } = { establish: {}, waypoints: {} };
  const skipped: { establish: string[]; waypoints: string[] } = { establish: [], waypoints: [] };

  // Jedan posao = (establish ili tačka, jezik) - svi se sakupe unapred, pa se
  // izvrše sa ograničenim brojem istovremenih poziva (ne udariti ElevenLabs limit).
  const jobs: (() => Promise<void>)[] = [];

  for (const lang of voiceLanguages) {
    if (!hasOwnLangText(establishText, lang)) {
      skipped.establish.push(lang);
      continue;
    }
    const text = extractText(establishText, lang).trim();
    if (text.length > TTS_MAX_CHARS) {
      errors.establish[lang] = `Tekst je predug za glas (${text.length} znakova, najviše ${TTS_MAX_CHARS}).`;
      continue;
    }
    const voiceId = voiceIdFor(lang);
    if (!voiceId) {
      errors.establish[lang] = `ELEVENLABS_VOICE_ID nije podešen za ${lang.toUpperCase()}.`;
      continue;
    }
    jobs.push(async () => {
      try {
        const buf = await synthesizeSpeech(text, voiceId, apiKey);
        audio.establish[lang] = await uploadNarration(supabase, `${folder}/establish-${lang}.mp3`, buf);
      } catch (err) {
        errors.establish[lang] = err instanceof Error ? err.message : 'Nepoznata greška.';
      }
    });
  }

  for (const wp of waypoints) {
    const wpAudio: Record<string, string> = {};
    audio.waypoints.push({ index: wp.index, audio_url_i18n: wpAudio });
    for (const lang of voiceLanguages) {
      const key = `${wp.index}-${lang}`;
      if (!hasOwnLangText(wp.text, lang)) {
        skipped.waypoints.push(key);
        continue;
      }
      const text = extractText(wp.text, lang).trim();
      if (text.length > TTS_MAX_CHARS) {
        errors.waypoints[key] = `Tekst je predug za glas (${text.length} znakova, najviše ${TTS_MAX_CHARS}).`;
        continue;
      }
      const voiceId = voiceIdFor(lang);
      if (!voiceId) {
        errors.waypoints[key] = `ELEVENLABS_VOICE_ID nije podešen za ${lang.toUpperCase()}.`;
        continue;
      }
      jobs.push(async () => {
        try {
          const buf = await synthesizeSpeech(text, voiceId, apiKey);
          wpAudio[lang] = await uploadNarration(supabase, `${folder}/waypoint-${wp.index}-${lang}.mp3`, buf);
        } catch (err) {
          errors.waypoints[key] = err instanceof Error ? err.message : 'Nepoznata greška.';
        }
      });
    }
  }

  const CONCURRENCY = 3;
  let cursor = 0;
  const worker = async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      await job();
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));

  return NextResponse.json({ success: true, audio, errors, skipped });
}
