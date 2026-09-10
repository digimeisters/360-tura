import { createClient, SupabaseClient } from '@supabase/supabase-js';

type AdminContext =
  | { ok: true; supabase: SupabaseClient; userEmail: string | null }
  | { ok: false; status: number; error: string };

function allowedEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Provera da zahtev dolazi od prijavljenog administratora.
 *
 * Klijent šalje Supabase access token kao Bearer. Token se proverava anon
 * ključem (jedini način da se potvrdi sesija), a tek onda se vraća klijent
 * sa service role ključem za rad nad podacima.
 *
 * Važeća sesija sama po sebi NIJE dovoljna: dok je registracija na Supabase
 * projektu otvorena, bilo ko može da napravi nalog, pa se email dodatno
 * proverava kroz ADMIN_EMAILS. Namerno se odbija kad lista nije podešena -
 * tiho propuštanje bi značilo da je panel otvoren svakome ko se registruje.
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

  const allowed = allowedEmails();
  if (allowed.length === 0) {
    console.error('[adminAuth] ADMIN_EMAILS nije podešen - admin pristup je odbijen.');
    return {
      ok: false,
      status: 503,
      error: 'Admin pristup nije podešen na serveru (ADMIN_EMAILS).'
    };
  }

  const email = (data.user.email || '').toLowerCase();
  if (!allowed.includes(email)) {
    return { ok: false, status: 403, error: 'Nalog nema administratorska prava.' };
  }

  return {
    ok: true,
    supabase: createClient(supabaseUrl, serviceKey),
    userEmail: data.user.email ?? null
  };
}
