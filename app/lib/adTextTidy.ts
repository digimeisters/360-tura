import type { AdPlatform } from './adTextShared';

const HASHTAG_LINE = /^(#[\p{L}\p{N}_]+\s*)+$/u;

/**
 * Format posle AI-ja (model ga ne poštuje uvek): oglasni sajtovi bez heštegova;
 * na mrežama tekst nikad u jednom bloku - rečenice u redove, URL u svom redu,
 * heštegovi u poslednjem redu.
 */
export function tidyBody(raw: string, platform: AdPlatform): string {
  let text = raw.replace(/\r\n/g, '\n').trim();
  const tags = [...new Set(text.match(/#[\p{L}\p{N}_]+/gu) ?? [])];
  text = text.replace(/(^|\s)#[\p{L}\p{N}_]+/gu, '$1').replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' ');
  text = text
    .split('\n')
    .filter((line) => !HASHTAG_LINE.test(line.trim()) || !line.trim())
    .join('\n')
    .trim();

  if (platform === 'instagram' || platform === 'facebook') {
    if (!text.includes('\n')) {
      // Ceo tekst u jednom bloku: rečenica po red (URL ostaje sam u svom redu).
      text = text
        .replace(/\s*(https?:\/\/\S+)\s*/g, '\n$1\n')
        .replace(/([.!?…])\s+(?=[A-ZŠĐČĆŽ0-9])/g, '$1\n')
        .replace(/\n{2,}/g, '\n')
        .trim();
    }
    const keep = platform === 'instagram' ? tags.slice(0, 5) : tags.slice(0, 2);
    if (keep.length) text = `${text}\n\n${keep.join(' ')}`;
  }
  return text.replace(/\n{3,}/g, '\n\n').trim();
}
