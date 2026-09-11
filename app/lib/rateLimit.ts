/**
 * Ograničenje broja poziva po IP adresi.
 *
 * Brojači žive u memoriji same instance. Na Vercelu to znači da pri većem
 * saobraćaju radi više instanci, pa je stvarna granica labavija od zadate -
 * ali i dalje zaustavlja ono zbog čega postoji: jedan skript koji u petlji
 * gađa javnu rutu. Za strogo ograničenje trebao bi Redis, što je za sadašnji
 * obim projekta suvišno.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Bez ovoga bi mapa rasla dok instanca živi. Čisti se pri pozivu, a ne
// tajmerom, da ništa ne drži proces budnim.
const CLEANUP_EVERY = 500;
let callsSinceCleanup = 0;

function cleanup(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * IP klijenta iza Vercel proxy-ja. `x-forwarded-for` je lista, prvi je
 * originalni klijent. Zaglavlje može da se lažira, ali ga Vercel prepisuje na
 * ivici, pa je za našu namenu pouzdano.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/**
 * Broji poziv i kaže da li je preko granice. `scope` razdvaja brojače
 * različitih ruta, da trošenje na jednoj ne zatvori drugu.
 */
export function rateLimit(
  req: Request,
  scope: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();

  if (++callsSinceCleanup >= CLEANUP_EVERY) {
    callsSinceCleanup = 0;
    cleanup(now);
  }

  const key = `${scope}:${clientIp(req)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  bucket.count++;
  return { ok: true };
}

/** Gotov 429 odgovor, sa `Retry-After` zaglavljem koje klijenti razumeju. */
export function tooManyRequests(retryAfterSec: number, message: string): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfterSec)
    }
  });
}
