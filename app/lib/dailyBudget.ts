import { createClient } from '@supabase/supabase-js';
import { sendTelegramMessage, escapeHtml } from './telegram';

/**
 * Dnevna granica za javne rute koje koštaju (pregled 23. 10. 2026). Za
 * razliku od rateLimit (po IP adresi, u memoriji jedne instance), ovo broji
 * sve pozive sa celog sajta u bazi (migracija 039) - skript koji menja IP
 * adrese ne može da potroši više od dnevne granice.
 *
 * Kad se granica pređe prvi put tog dana, vlasnik dobija poruku na Telegram.
 * Ako baza ne odgovori, poziv prolazi: pravi posetilac ne sme da ostane bez
 * odgovora zbog brojača.
 */
export const DAILY_LIMITS = {
  /** Pitanja AI pomoćniku u turi (Gemini). */
  tourAssistant: 300,
  /** Mejlovi agentu iz ture: zahtev za razgledanje i ostavljen kontakt (Resend). */
  agentEmail: 50
} as const;

export async function overDailyBudget(route: keyof typeof DAILY_LIMITS): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;
  const limit = DAILY_LIMITS[route];
  try {
    const { data, error } = await createClient(url, key).rpc('bump_api_usage', { p_route: route });
    if (error || typeof data !== 'number') {
      if (error) console.error('[dailyBudget]', route, error.message);
      return false;
    }
    if (data === limit + 1) {
      await sendTelegramMessage(
        `⚠️ <b>Dnevna granica dostignuta</b>: ${escapeHtml(route)} (${limit} danas). Do ponoći se ne poziva - proverite da li je zloupotreba.`
      );
    }
    return data > limit;
  } catch (e) {
    console.error('[dailyBudget]', route, e instanceof Error ? e.message : e);
    return false;
  }
}
