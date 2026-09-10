import { timingSafeEqual } from 'crypto';

/**
 * Provera deljene tajne za dolazne webhook-ove (Google Forma preko Apps
 * Script-a).
 *
 * Ruta koju ovo štiti radi `upsert` po slug-u, što znači da neko ko pogodi
 * adresu ne može samo da doda turu nego i da prepiše postojeći oglas.
 * Zato se odbija i kad tajna nije podešena - tiho propuštanje bi ostavilo
 * rutu otvorenom svima.
 */
export function checkWebhookSecret(req: Request): { ok: true } | { ok: false; status: number; error: string } {
  const expected = process.env.FORM_WEBHOOK_SECRET || '';

  if (!expected) {
    console.error('[webhookAuth] FORM_WEBHOOK_SECRET nije podešen - zahtev je odbijen.');
    return { ok: false, status: 503, error: 'Webhook nije podešen na serveru.' };
  }

  const provided =
    req.headers.get('x-form-secret') ||
    (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');

  if (!provided) {
    return { ok: false, status: 401, error: 'Nedostaje x-form-secret zaglavlje.' };
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual puca na različitim dužinama, pa se one prvo porede -
  // sama dužina tajne nije podatak koji vredi kriti.
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 401, error: 'Neispravna tajna.' };
  }

  return { ok: true };
}
