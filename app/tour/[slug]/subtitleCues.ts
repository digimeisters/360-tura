/**
 * Tekst naracije podeljen na titlove (rečenicu po rečenicu) i njihovo
 * trajanje srazmerno dužini. Koriste ga titlovi (NarrationSubtitles) i puls
 * vrata ka sledećoj sobi, koji kreće na poslednjoj rečenici (roomSequence.ts).
 * ElevenLabs ne daje vremena reči, pa se vreme procenjuje po broju znakova.
 */

/** Najduži titl (znakova) - dva kraća reda na telefonu, kao na filmu. */
const SUBTITLE_MAX_CHARS = 90;
/**
 * Glas pravi pauzu posle tačke i zareza; toliko "znakova" se dodaje težini
 * titla da rečenica ne prestigne glas.
 */
const SUBTITLE_SENTENCE_PAUSE = 10;
const SUBTITLE_COMMA_PAUSE = 3;

/** Deli dugačak deo na komade do SUBTITLE_MAX_CHARS, po zarezu ili po reči. */
function splitLong(part: string): string[] {
  if (part.length <= SUBTITLE_MAX_CHARS) return [part];
  const pieces = Math.ceil(part.length / SUBTITLE_MAX_CHARS);
  const target = part.length / pieces;
  // Najbolji rez: zarez/crta najbliži idealnom mestu, inače razmak.
  let cut = -1;
  let best = Infinity;
  const re = /[,;:–—]\s/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(part))) {
    const at = m.index + 1;
    const off = Math.abs(at - target);
    if (at >= 20 && part.length - at >= 20 && off < best && off < target * 0.45) {
      best = off;
      cut = at;
    }
  }
  if (cut < 0) {
    const space = part.lastIndexOf(' ', Math.round(target));
    cut = space > 0 ? space : Math.round(target);
  }
  return [...splitLong(part.slice(0, cut).trim()), ...splitLong(part.slice(cut).trim())];
}

/** Tekst naracije -> titlovi, rečenicu po rečenicu (dugačke rečenice u delovima). */
export function toSubtitleCues(text: string): { text: string; weight: number }[] {
  const sentences = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?…])\s+(?=\S)/)
    .filter(Boolean);
  const cues: { text: string; weight: number }[] = [];
  for (const sentence of sentences) {
    const parts = splitLong(sentence);
    parts.forEach((p, i) => {
      const last = i === parts.length - 1;
      cues.push({ text: p, weight: p.length + (last ? SUBTITLE_SENTENCE_PAUSE : SUBTITLE_COMMA_PAUSE) });
    });
  }
  return cues;
}

/**
 * Deo naracije (0-1) posle kog počinje poslednja rečenica. Kratak tekst od
 * jedne rečenice daje 0 - cela naracija je "poslednja rečenica".
 */
export function lastCueStartFraction(text: string): number {
  const cues = toSubtitleCues(text);
  if (cues.length < 2) return 0;
  const total = cues.reduce((sum, c) => sum + c.weight, 0);
  let lastSentenceStart = cues.length - 1;
  // Duga poslednja rečenica je podeljena na delove - puls kreće od njenog prvog dela.
  while (lastSentenceStart > 0 && !/[.!?…]$/.test(cues[lastSentenceStart - 1].text)) lastSentenceStart--;
  const before = cues.slice(0, lastSentenceStart).reduce((sum, c) => sum + c.weight, 0);
  return before / total;
}
