/**
 * Bedž "Snimka iz ture": bela kartica u uglu slike sa logom agencije (ili
 * znakom Kvadrat360), kratkim opisom nekretnine, pozivom i linkom ture.
 * Bez QR koda (vlasnik, 17. 10. 2026): zauzimao je mnogo mesta, a sa
 * Instagrama ga niko ne skenira - link se prepiše ili klikne u opisu.
 * Isto crtanje služi i za pregled i za preuzetu sliku.
 */

export type BadgeCorner = 'tl' | 'tr' | 'bl' | 'br';

export type BadgeOptions = {
  /** Logo agencije (agency_branding) - bez njega ide znak i naziv Kvadrat360. */
  logo: HTMLImageElement | null;
  /** Gornji red kad nema loga (naziv agencije ili Kvadrat360). */
  brand: string;
  /** Npr. "Dvosoban, 54 m² · Širi centar". */
  line: string;
  /** Npr. "Prošetajte kroz stan u 360°". */
  cta: string;
  /** Link ture bez https://, npr. "kvadrat360.com/tour/stan-...". */
  link: string;
  corner: BadgeCorner;
  /** 0.7-1.4, klizač "Veličina bedža". */
  scale: number;
};

const BLUE = '#1E5AA8';
const INK = '#111113';
const SOFT = '#5B5D63';
const FONT = 'Inter, "Segoe UI", system-ui, sans-serif';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Prelama tekst na najviše `max` redova u zadatoj širini (poslednji dobija "…"). */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width <= width || !cur) cur = next;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  let last = kept[max - 1];
  while (last.length > 1 && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1);
  kept[max - 1] = `${last.trimEnd()}…`;
  return kept;
}

export function drawBadge(ctx: CanvasRenderingContext2D, W: number, H: number, o: BadgeOptions): void {
  // Jedinica: 1 px na slici od 1080 px po kraćoj strani, puta klizač.
  const base = Math.min(W, H) / 1080;
  const u = base * o.scale;
  const pad = 18 * u;
  const margin = 24 * base;
  const maxW = Math.min(420 * u, W - margin * 2 - pad * 2);

  ctx.save();
  // Link mora stati u jedan red: font se smanjuje dok ne stane (ne ispod 15u).
  let linkSize = 21 * u;
  ctx.font = `700 ${linkSize}px ${FONT}`;
  while (linkSize > 15 * u && ctx.measureText(o.link).width > maxW) {
    linkSize -= 0.5 * u;
    ctx.font = `700 ${linkSize}px ${FONT}`;
  }
  const linkW = Math.min(maxW, ctx.measureText(o.link).width);

  ctx.font = `700 ${25 * u}px ${FONT}`;
  const lineRows = o.line ? wrap(ctx, o.line, maxW, 2) : [];
  const lineW = Math.max(0, ...lineRows.map((r) => ctx.measureText(r).width));
  ctx.font = `500 ${18 * u}px ${FONT}`;
  const ctaRows = wrap(ctx, o.cta, maxW, 1);
  const ctaW = Math.max(0, ...ctaRows.map((r) => ctx.measureText(r).width));

  const brandH = o.logo ? 34 * u : 20 * u;
  let brandW = 0;
  if (o.logo) brandW = Math.min(maxW, (o.logo.naturalWidth / Math.max(1, o.logo.naturalHeight)) * brandH);
  else {
    ctx.font = `800 ${16 * u}px ${FONT}`;
    brandW = Math.min(maxW, 13 * u * 1.9 + ctx.measureText(o.brand.toUpperCase()).width);
  }

  const textW = Math.max(brandW, lineW, ctaW, linkW);
  const textH = brandH + 10 * u + lineRows.length * 30 * u + (lineRows.length ? 4 * u : 0) + ctaRows.length * 23 * u + 6 * u + linkSize * 1.2;
  const boxW = textW + pad * 2;
  const boxH = textH + pad * 2;
  const x = o.corner === 'tl' || o.corner === 'bl' ? margin : W - margin - boxW;
  const y = o.corner === 'tl' || o.corner === 'tr' ? margin : H - margin - boxH;

  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = 26 * u;
  ctx.shadowOffsetY = 8 * u;
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  roundRect(ctx, x, y, boxW, boxH, 20 * u);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  const tx = x + pad;
  let ty = y + pad;
  if (o.logo) {
    ctx.drawImage(o.logo, tx, ty, brandW, (brandW * o.logo.naturalHeight) / Math.max(1, o.logo.naturalWidth));
  } else {
    // Romb iz znaka Kvadrat360 + naziv.
    const s = 13 * u;
    ctx.save();
    ctx.translate(tx + s * 0.75, ty + brandH / 2);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 2.6 * u;
    roundRect(ctx, -s / 2, -s / 2, s, s, 3 * u);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = BLUE;
    ctx.font = `800 ${16 * u}px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(o.brand.toUpperCase(), tx + s * 1.9, ty + brandH / 2, maxW - s * 2);
  }
  ty += brandH + 10 * u;

  ctx.textBaseline = 'top';
  ctx.fillStyle = INK;
  ctx.font = `700 ${25 * u}px ${FONT}`;
  for (const row of lineRows) {
    ctx.fillText(row, tx, ty);
    ty += 30 * u;
  }
  if (lineRows.length) ty += 4 * u;
  ctx.fillStyle = SOFT;
  ctx.font = `500 ${18 * u}px ${FONT}`;
  for (const row of ctaRows) {
    ctx.fillText(row, tx, ty);
    ty += 23 * u;
  }
  ty += 6 * u;
  ctx.fillStyle = BLUE;
  ctx.font = `700 ${linkSize}px ${FONT}`;
  ctx.fillText(o.link, tx, ty, maxW);
  ctx.restore();
}

/** Slika iz URL-a, za crtanje na canvas (CORS, da canvas ostane "čist" za izvoz). */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Slika nije učitana: ${src}`));
    img.src = src;
  });
}
