// Telegram notifikacija za nove upite. Namerno "best effort": ako token
// nije podešen ili Telegram ne odgovori, funkcija ćuti i vraća false -
// upit je već upisan u bazu, pa korisnik ne sme da vidi grešku zbog toga.

const TELEGRAM_API = 'https://api.telegram.org';

// Telegram HTML parse_mode ruši poruku ako sadržaj korisnika ima < > &.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function sendTelegramMessage(html: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return false;

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      }),
      // Bez ovoga bi spor Telegram držao korisnika da čeka potvrdu forme.
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) {
      console.error('[telegram] sendMessage failed:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[telegram] sendMessage error:', err);
    return false;
  }
}
