/**
 * Gemini ume da vrati "preopterećen" (503) ili "limit" (429) satima. "AI sve
 * sobe" tada pravi pauzu pre sledeće sobe, umesto da odmah obori i nju.
 */

export const OVERLOAD_PAUSE_MS = 8000;

export function isOverloadError(message: string): boolean {
  return /\b(503|429)\b|high demand|overloaded|preoptere/i.test(message);
}
