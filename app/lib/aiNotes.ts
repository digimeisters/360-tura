/**
 * Napomene za AI popunu soba (tabela tour_ai_notes): ono što vlasnik zna, a
 * na panorami se ne vidi - "renovirano 2023", "klima ostaje", "pogled na
 * park". Nisu javne; čita ih samo AI ruta i admin. Bez uvoza - koriste ga i
 * pregledač i node testovi.
 */

export const MAX_TOUR_NOTES_CHARS = 2000;
export const MAX_ROOM_NOTE_CHARS = 500;

export type AiNotes = {
  /** Napomene za celu turu, jedna po redu. */
  notes: string;
  /** Napomena po sobi: { "<room_id>": "tekst" }. */
  roomNotes: Record<string, string>;
};

const ROOM_ID = /^[0-9a-f-]{36}$/i;

/** Sređuje napomene pre čuvanja i posle čitanja: trim, dužina, samo prave sobe. */
export function normalizeAiNotes(input: unknown): AiNotes {
  const src = input && typeof input === 'object' ? (input as { notes?: unknown; roomNotes?: unknown }) : {};
  const notes = typeof src.notes === 'string' ? src.notes.trim().slice(0, MAX_TOUR_NOTES_CHARS) : '';

  const roomNotes: Record<string, string> = {};
  const raw = src.roomNotes;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
      if (!ROOM_ID.test(id) || typeof value !== 'string') continue;
      const text = value.trim().slice(0, MAX_ROOM_NOTE_CHARS);
      if (text) roomNotes[id] = text;
    }
  }
  return { notes, roomNotes };
}
