/**
 * Izbor naslovne sobe ture - za share karticu i za primere tura na sajtu.
 *
 * Dnevna soba prodaje oglas bolje od hodnika ili kupatila, pa se ona bira
 * umesto prve sobe po redosledu. Nazivi u bazi su neujednačeni ("Dnevna soba
 * 1/2", "Dnevna-radni", pa i cela rečenica "Ulazimo u prijatnu dnevnu
 * sobu..."), zato se traži koren reči, na svakom jeziku.
 */

const LIVING_ROOM_HINTS = ['dnevn', 'boravak', 'living', 'wohnzimmer', 'гостин'];

export type CoverCandidate = {
  preview_url: string | null;
  title: string | null;
  title_i18n: unknown;
};

export function pickCoverRoom<T extends CoverCandidate>(rooms: T[]): T | null {
  const withPreview = rooms.filter((r) => r.preview_url);
  if (!withPreview.length) return null;

  const living = withPreview.find((room) => {
    // Pretražuje se ceo i18n blob, pa naziv na bilo kom jeziku pogađa.
    const haystack = `${room.title ?? ''} ${JSON.stringify(room.title_i18n ?? '')}`.toLowerCase();
    return LIVING_ROOM_HINTS.some((hint) => haystack.includes(hint));
  });

  return living ?? withPreview[0];
}
