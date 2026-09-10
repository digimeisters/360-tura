import { createClient, SupabaseClient } from '@supabase/supabase-js';

type AdminContext =
  | { ok: true; supabase: SupabaseClient; userEmail: string | null }
  | { ok: false; status: number; error: string };

/**
 * Provera da zahtev dolazi od prijavljenog administratora.
 *
 * Klijent šalje Supabase access token kao Bearer. Token se proverava anon
 * ključem (jedini način da se potvrdi sesija), a tek onda se vraća klijent
 * sa service role ključem za rad nad podacima.
 */
export async function requireAdmin(req: Request): Promise<AdminContext> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return { ok: false, status: 500, error: 'Nedostaje konfiguracija.' };
  }

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return { ok: false, status: 401, error: 'Niste prijavljeni.' };
  }

  const auth = createClient(supabaseUrl, anonKey);
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, status: 401, error: 'Sesija nije važeća.' };
  }

  return {
    ok: true,
    supabase: createClient(supabaseUrl, serviceKey),
    userEmail: data.user.email ?? null
  };
}
