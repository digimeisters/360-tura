/** Prostorija na živoj kartici ture (components/CardPanorama). */
export type CardStrip = { title: string; url: string };

const CARD_STRIPS = 3;

/** Naslovna soba prva (ista slika kao fotografija kartice), pa sledeće redom obilaska. */
export function pickCardStrips(
  rooms: { id: string; title: string; stripUrl: string | null }[],
  coverRoomId: string | null
): CardStrip[] {
  const start = Math.max(0, rooms.findIndex((r) => r.id === coverRoomId));
  return [...rooms.slice(start), ...rooms.slice(0, start)]
    .filter((r) => r.stripUrl)
    .slice(0, CARD_STRIPS)
    .map((r) => ({ title: r.title, url: r.stripUrl as string }));
}
