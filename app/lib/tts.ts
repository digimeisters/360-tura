import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * ElevenLabs glas: zajedničko za naraciju soba (/api/ai/auto-populate-room)
 * i uvod ture (/api/ai/tour-intro). Jedan glas za sva 4 jezika (vlasnik,
 * 28. 9. 2026); ELEVENLABS_VOICE_ID_<JEZIK>, ako se ikad doda, ima prednost.
 */

export type VoiceLang = 'sr' | 'en' | 'de' | 'ru';
export const VOICE_LANGS: VoiceLang[] = ['sr', 'en', 'de', 'ru'];

const ELEVENLABS_MODEL_ID = 'eleven_v4';
const ELEVENLABS_TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
export const NARRATIONS_BUCKET = 'narrations';
/** ElevenLabs ume povremeno da ne odgovori - drugi pokušaj pre nego što segment javi grešku. */
const TTS_MAX_ATTEMPTS = 2;

export function voiceIdFor(lang: VoiceLang): string | undefined {
  return process.env[`ELEVENLABS_VOICE_ID_${lang.toUpperCase()}`] || process.env.ELEVENLABS_VOICE_ID;
}

export async function synthesizeSpeech(text: string, voiceId: string, apiKey: string): Promise<Buffer> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= TTS_MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${ELEVENLABS_TTS_URL}/${voiceId}`, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({
          text,
          model_id: ELEVENLABS_MODEL_ID,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        })
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`ElevenLabs ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
      }
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      lastError = err;
      if (attempt < TTS_MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 700));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('TTS poziv nije uspeo.');
}

export async function uploadNarration(supabase: SupabaseClient, path: string, audio: Buffer): Promise<string> {
  const { error } = await supabase.storage.from(NARRATIONS_BUCKET).upload(path, audio, {
    contentType: 'audio/mpeg',
    upsert: true
  });
  if (error) throw new Error(error.message);
  // Ista putanja se presnimava (nova naracija sobe) - ?v= zaobilazi stari keš CDN-a.
  return `${supabase.storage.from(NARRATIONS_BUCKET).getPublicUrl(path).data.publicUrl}?v=${Date.now().toString(36)}`;
}
