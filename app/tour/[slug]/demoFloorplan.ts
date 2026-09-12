import type { Room, Tour } from './types';

// SAMO ZA PREGLED na lokalnom serveru (?testskica=1): izmišljena skica stana
// i oznake soba, da se mali tlocrt vidi pre nego što ijedna tura ima pravu
// skicu. Učitava se dinamički i samo u development režimu - na pravom sajtu
// ne postoji. Briše se kad se tlocrt usvoji.

const W = 800;
const H = 560;

const ROOMS: { key: string; label: string; x: number; y: number; w: number; h: number; terrace?: boolean }[] = [
  { key: 'terasa', label: 'Terasa', x: 20, y: 20, w: 260, h: 180, terrace: true },
  { key: 'kuhinja', label: 'Kuhinja', x: 280, y: 20, w: 240, h: 180 },
  { key: 'soba 1', label: 'Soba 1', x: 520, y: 20, w: 260, h: 180 },
  { key: 'centar', label: 'Dnevna soba', x: 20, y: 200, w: 500, h: 180 },
  { key: 'soba 2', label: 'Soba 2', x: 520, y: 200, w: 260, h: 180 },
  { key: 'radni', label: 'Radni kutak', x: 20, y: 380, w: 260, h: 160 },
  { key: 'hodnik', label: 'Ulaz', x: 280, y: 380, w: 120, h: 160 },
  { key: 'kupatilo', label: 'Kupatilo', x: 400, y: 380, w: 120, h: 80 },
  { key: 'toalet', label: 'WC', x: 400, y: 460, w: 120, h: 80 },
  { key: 'soba 3', label: 'Soba 3', x: 520, y: 380, w: 260, h: 160 }
];

// Otvori u zidovima (vrata): [x1, y1, x2, y2] preko zida.
const DOORS = [
  [140, 195, 190, 205],
  [380, 195, 430, 205],
  [515, 90, 525, 140],
  [515, 260, 525, 310],
  [120, 375, 170, 385],
  [300, 375, 350, 385],
  [395, 410, 405, 440],
  [395, 490, 405, 520],
  [515, 430, 525, 480],
  [320, 535, 370, 545]
];

function svg(): string {
  const rooms = ROOMS.map((r) => {
    const fill = r.terrace ? 'url(#hatch)' : '#fbfbf8';
    return `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${fill}" stroke="#334155" stroke-width="6"/>` +
      `<text x="${r.x + r.w / 2}" y="${r.y + r.h / 2 + 30}" font-family="Arial, sans-serif" font-size="17" fill="#94a3b8" text-anchor="middle">${r.label}</text>`;
  }).join('');
  const doors = DOORS.map(([x1, y1, x2, y2]) => `<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" fill="#fbfbf8"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<defs><pattern id="hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="14" height="14" fill="#f1f5f9"/><line x1="0" y1="0" x2="0" y2="14" stroke="#cbd5e1" stroke-width="3"/></pattern></defs>` +
    `<rect width="${W}" height="${H}" fill="#ffffff"/>` +
    rooms +
    `<rect x="20" y="20" width="760" height="520" fill="none" stroke="#1e293b" stroke-width="12"/>` +
    doors +
    `</svg>`;
}

function normalize(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') {
    try {
      return normalize(JSON.parse(value));
    } catch {
      return value.toLowerCase();
    }
  }
  if (typeof value === 'object') return String((value as Record<string, string>).sr ?? Object.values(value)[0] ?? '').toLowerCase();
  return '';
}

export function withDemoFloorplan(tour: Tour, rooms: Room[]): { tour: Tour; rooms: Room[] } {
  const used = new Set<number>();
  const placed = rooms.map((room, i) => {
    const title = normalize(room.title_i18n);
    let spot = ROOMS.findIndex((r, idx) => !used.has(idx) && title.includes(r.key));
    if (spot === -1) spot = ROOMS.findIndex((_, idx) => !used.has(idx));
    if (spot === -1) spot = i % ROOMS.length;
    used.add(spot);
    const r = ROOMS[spot];
    return {
      ...room,
      floorplan_x: ((r.x + r.w / 2) / W) * 100,
      floorplan_y: ((r.y + r.h / 2 - 8) / H) * 100
    };
  });
  return {
    tour: { ...tour, floorplan_url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg())}` },
    rooms: placed
  };
}
