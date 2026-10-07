// Slanje emaila preko Resend-a (resend.com), npr. zahtev za razgledanje
// direktno agentu. Kao i Telegram: "best effort" - bez ključa ili kad Resend
// ne odgovori, vraća razlog i ne baca grešku, jer je upit već u bazi.
//
// Promenljive: RESEND_API_KEY (obavezno), EMAIL_FROM (nije obavezno;
// adresa mora biti na domenu potvrđenom u Resend-u).

const RESEND_API = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'Kvadrat360 <razgledanje@kvadrat360.com>';

export type EmailResult = { ok: true } | { ok: false; reason: 'not-configured' | 'failed' };

export async function sendEmail(message: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: 'not-configured' };

  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || DEFAULT_FROM,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text
      }),
      // Spor servis ne sme da drži posetioca da čeka potvrdu forme.
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) {
      console.error('[email] Resend failed:', res.status, await res.text());
      return { ok: false, reason: 'failed' };
    }
    return { ok: true };
  } catch (err) {
    console.error('[email] Resend error:', err);
    return { ok: false, reason: 'failed' };
  }
}

/** Dovoljno stroga provera za adresu iz admin forme (ne šalje se na "—" ili ime). */
export function looksLikeEmail(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
