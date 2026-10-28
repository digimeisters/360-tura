import { FADE_S, VIDEO_HEIGHT, VIDEO_WIDTH, type VideoPlan, type VideoRoomShot } from './videoPlan';
import type { PanoRenderer } from './panoRenderer';

/** Mapa za početak videa (videoMap.ts) - platno za tekući kadar i tačka nekretnine. */
export type MapFrameSource = { canvas: HTMLCanvasElement; pinPoint: () => { x: number; y: number } };

/**
 * Crta JEDAN kadar videa u trenutku `t` (sekunde) na 2D platno 1080x1920:
 * panorame (WebGL, PanoRenderer) + kartice i titlovi preko njih. Izgled prati
 * skicu koju je vlasnik odobrio: tamnoplava kartica na početku i kraju,
 * crna oznaka sa nazivom sobe gore, titl na tamnoj traci dole.
 *
 * Od 28. 10. 2026: mali tlocrt gore desno sa tačkom „ovde ste", kamera kreće
 * i staje mekše, završna kartica bez QR koda, i naslovna slika (drawCover).
 */

const W = VIDEO_WIDTH;
const H = VIDEO_HEIGHT;
const PAD = 84;
const CARD_BG = 'rgba(14, 32, 64, 0.88)';
const ACCENT = '#9CC0EE';
/** Zum kamere u sobi: kreće malo šire pa se lagano primiče (uspravan kadar). */
const HFOV_FROM = 66;
const HFOV_TO = 58;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - (1 - x) * (1 - x);
/** Meko kretanje kamere: pola ravnomerno, pola sa usporenjem na krajevima (ne staje skroz, jer se sobe pretapaju). */
const softPan = (p: number) => 0.55 * p + 0.45 * p * p * (3 - 2 * p);
/** Mali tlocrt gore desno: najveća širina i visina (px na 1080x1920). Vodoravni tlocrti su česti, pa je širina veća. */
const PLAN_MAX_W = 340;
const PLAN_MAX_H = 300;

/** Providnost koja raste od `from` do `from + dur` (0 -> 1). */
const rise = (t: number, from: number, dur: number) => clamp01((t - from) / dur);

function cssFont(variable: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || fallback;
}

/** Deli tekst na redove do zadate širine (reč po reč). */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  // Samo običan razmak - neprelomivi ( , npr. "48 m²") drži reči zajedno.
  const words = text.split(/[ \t\n]+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export class VideoFrameRenderer {
  private display: string;
  private body: string;

  constructor(
    private plan: VideoPlan,
    private pano: PanoRenderer,
    /** Logo agencije (agency_branding); null = kartice nose samo naziv agencije. */
    private logo: HTMLImageElement | null = null,
    private mapFrames: MapFrameSource | null = null,
    /** Tlocrt ture (plan.floorplanUrl); null = bez prikaza u uglu. */
    private floorplan: HTMLImageElement | null = null
  ) {
    this.display = cssFont('--font-urbanist', 'system-ui, sans-serif');
    this.body = cssFont('--font-inter', 'system-ui, sans-serif');
  }

  /**
   * Logo agencije na beloj zaobljenoj pločici (logoi su pravljeni za svetlu
   * podlogu, na tamnoplavoj kartici bi se izgubili). Pločica prati oblik
   * loga: visina je stalna, širina koliko logo traži, do maxW.
   * x je leva ivica, ili sredina kad je center.
   */
  private drawLogoBadge(ctx: CanvasRenderingContext2D, x: number, y: number, height: number, maxW: number, center: boolean): void {
    const logo = this.logo;
    if (!logo) return;
    const pad = Math.round(height * 0.18);
    const ratio = (logo.naturalWidth || 300) / (logo.naturalHeight || 150);
    let logoH = height - pad * 2;
    let logoW = logoH * ratio;
    if (logoW > maxW - pad * 2) {
      logoW = maxW - pad * 2;
      logoH = logoW / ratio;
    }
    const badgeW = Math.max(height, logoW + pad * 2);
    const left = center ? x - badgeW / 2 : x;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(left, y, badgeW, height, Math.min(28, height / 3));
    ctx.fill();
    ctx.drawImage(logo, left + (badgeW - logoW) / 2, y + (height - logoH) / 2, logoW, logoH);
  }

  /** Pogled kamere u sobi u trenutku t: meko klizi i lagano se primiče. */
  private viewFor(shot: VideoRoomShot, t: number) {
    const p = clamp01((t - shot.start) / (shot.end - shot.start));
    return {
      yaw: shot.fromYaw + (shot.toYaw - shot.fromYaw) * softPan(p),
      pitch: 0,
      hfov: HFOV_FROM + (HFOV_TO - HFOV_FROM) * p,
      alpha: 1
    };
  }

  draw(ctx: CanvasRenderingContext2D, t: number): void {
    const { plan } = this;
    // Sobe koje se vide u ovom trenutku; kasnija se pretapa preko ranije.
    const visible = plan.rooms.filter((shot) => t >= shot.start && t <= shot.end);
    this.pano.render(
      visible.map((shot, i) => {
        const view = this.viewFor(shot, t);
        view.alpha = i === 0 ? 1 : easeOut(rise(t, shot.start, FADE_S));
        return { url: shot.panoramaUrl, view };
      })
    );
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(this.pano.canvas, 0, 0, W, H);

    // Nazivi i titlovi soba (ispod kartica), tlocrt sa tačkom sobe.
    for (const shot of visible) this.drawRoomText(ctx, shot, t);
    for (const shot of visible) this.drawPlan(ctx, shot, t);
    this.drawBrand(ctx, t);

    const introAlpha = 1 - rise(t, plan.intro.end - FADE_S, FADE_S);
    if (introAlpha > 0) {
      if (plan.map && this.mapFrames) this.drawMapIntro(ctx, t, introAlpha);
      else this.drawIntro(ctx, t, introAlpha);
    }
    const outroAlpha = rise(t, plan.outro.start, FADE_S);
    if (outroAlpha > 0) this.drawOutro(ctx, t, outroAlpha);
  }

  private drawBrand(ctx: CanvasRenderingContext2D, t: number): void {
    if (t >= this.plan.outro.start) return;
    ctx.save();
    ctx.font = `700 26px ${this.display}`;
    ctx.letterSpacing = '6px';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 8;
    ctx.fillText('KVADRAT360', W / 2, H - 90);
    ctx.restore();
  }

  private drawRoomText(ctx: CanvasRenderingContext2D, shot: VideoRoomShot, t: number): void {
    // Tekst sobe kreće kad se soba stvarno vidi (prva soba je ispod uvodne kartice).
    const shownFrom = Math.max(shot.start + FADE_S, shot === this.plan.rooms[0] ? this.plan.intro.end : 0);
    // Tekst ostaje i dok sledeća soba počinje da se pretapa, pa nestaje.
    const fadeOut = 1 - rise(t, shot.end - FADE_S * 0.6, 0.3);
    const chipAlpha = Math.min(rise(t, shownFrom - 0.2, 0.35), fadeOut);
    const subAlpha = Math.min(rise(t, shownFrom + 0.1, 0.35), fadeOut);

    if (chipAlpha > 0 && shot.title) {
      ctx.save();
      ctx.globalAlpha = chipAlpha;
      ctx.font = `700 32px ${this.body}`;
      ctx.letterSpacing = '3px';
      const label = shot.title.toUpperCase();
      const w = ctx.measureText(label).width + 56;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.roundRect(64, 120, w, 70, 35);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 92, 156);
      ctx.restore();
    }

    if (subAlpha > 0 && shot.subtitle) {
      ctx.save();
      ctx.globalAlpha = subAlpha;
      ctx.font = `600 46px ${this.body}`;
      // Širok titl - duža rečenica staje u tri reda umesto četiri.
      const lines = wrap(ctx, shot.subtitle, 960);
      const lineH = 66;
      const bottom = H - 220;
      lines.forEach((line, i) => {
        const y = bottom - (lines.length - 1 - i) * lineH;
        const w = ctx.measureText(line).width;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
        ctx.beginPath();
        ctx.roundRect(W / 2 - w / 2 - 20, y - 46, w + 40, 62, 14);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(line, W / 2, y);
      });
      ctx.restore();
    }
  }

  /** Koliko se vidi tekst/tlocrt sobe u trenutku t (isti ulaz i izlaz kao oznaka sobe). */
  private roomAlpha(shot: VideoRoomShot, t: number, delay = 0): number {
    const shownFrom = Math.max(shot.start + FADE_S, shot === this.plan.rooms[0] ? this.plan.intro.end : 0);
    const fadeOut = 1 - rise(t, shot.end - FADE_S * 0.6, 0.3);
    return Math.min(rise(t, shownFrom - 0.2 + delay, 0.35), fadeOut);
  }

  /** Mali tlocrt gore desno; tačka pokazuje sobu koja se gleda. */
  private drawPlan(ctx: CanvasRenderingContext2D, shot: VideoRoomShot, t: number): void {
    const img = this.floorplan;
    if (!img || shot.planX === null || shot.planY === null) return;
    const alpha = this.roomAlpha(shot, t, 0.15);
    if (alpha <= 0) return;
    const ratio = (img.naturalWidth || 1) / (img.naturalHeight || 1);
    const w = Math.min(PLAN_MAX_W, PLAN_MAX_H * ratio);
    const h = w / ratio;
    const pad = 14;
    const x = W - 64 - w - pad * 2;
    // Ispod reda sa oznakom sobe (gore levo), da se dug naziv ne preklopi sa tlocrtom.
    const y = 214;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.beginPath();
    ctx.roundRect(x, y, w + pad * 2, h + pad * 2, 24);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.drawImage(img, x + pad, y + pad, w, h);
    // Tačka "ovde ste" sa talasom koji se širi.
    const dx = x + pad + (w * shot.planX) / 100;
    const dy = y + pad + (h * shot.planY) / 100;
    const wave = ((t - shot.start) % 1.4) / 1.4;
    ctx.fillStyle = `rgba(30, 90, 168, ${0.35 * (1 - wave)})`;
    ctx.beginPath();
    ctx.arc(dx, dy, 12 + 22 * wave, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(dx, dy, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1E5AA8';
    ctx.beginPath();
    ctx.arc(dx, dy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Naslovna slika (Instagram cover, Facebook): prva soba u njenom kadru,
   * gore oznaka "360° tura", dole tamna kartica sa vrstom, naslovom i cenom.
   */
  drawCover(ctx: CanvasRenderingContext2D): void {
    const { intro } = this.plan;
    const shot = this.plan.rooms[this.plan.coverIndex] ?? this.plan.rooms[0];
    if (shot) {
      this.pano.render([{ url: shot.panoramaUrl, view: { yaw: shot.fromYaw, pitch: 0, hfov: 62, alpha: 1 } }]);
      ctx.drawImage(this.pano.canvas, 0, 0, W, H);
    } else {
      ctx.fillStyle = CARD_BG;
      ctx.fillRect(0, 0, W, H);
    }
    const shade = ctx.createLinearGradient(0, H * 0.45, 0, H);
    shade.addColorStop(0, 'rgba(14, 32, 64, 0)');
    shade.addColorStop(1, 'rgba(14, 32, 64, 0.92)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.font = `800 40px ${this.body}`;
    ctx.letterSpacing = '4px';
    const pill = '360° TURA';
    const pw = ctx.measureText(pill).width + 64;
    ctx.fillStyle = '#1E5AA8';
    ctx.beginPath();
    ctx.roundRect(64, 120, pw, 84, 42);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.fillText(pill, 96, 164);
    ctx.restore();

    const maxW = W - PAD * 2;
    ctx.save();
    ctx.font = `700 100px ${this.display}`;
    const lines = wrap(ctx, intro.title, maxW).slice(0, 4);
    let y = H - 330 - (lines.length - 1) * 112 - (intro.price ? 110 : 0);
    if (intro.eyebrow) {
      ctx.font = `700 40px ${this.body}`;
      ctx.letterSpacing = '4px';
      ctx.fillStyle = ACCENT;
      ctx.fillText(intro.eyebrow, PAD, y - 112, maxW);
      ctx.letterSpacing = '0px';
    }
    ctx.font = `700 100px ${this.display}`;
    ctx.fillStyle = '#FFFFFF';
    lines.forEach((line, i) => ctx.fillText(line, PAD, y + i * 112));
    y += (lines.length - 1) * 112;
    if (intro.price) {
      ctx.font = `800 96px ${this.display}`;
      ctx.fillText(intro.price, PAD, y + 120);
    }
    ctx.restore();
    if (this.logo) this.drawLogoBadge(ctx, PAD, H - 200, 110, 460, false);
    else this.drawBrand(ctx, 0);
  }

  private drawIntro(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
    const { intro } = this.plan;
    const maxW = W - PAD * 2;
    // Sadržaj blago "uđe" u prvih pola sekunde.
    const enter = easeOut(rise(t, 0.1, 0.6));

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = CARD_BG;
    ctx.fillRect(0, 0, W, H);

    // Prvo se izmeri visina celog bloka, da se centrira po visini.
    ctx.font = `700 106px ${this.display}`;
    const titleLines = wrap(ctx, intro.title, maxW);
    const blocks: { h: number; draw: (y: number) => void }[] = [];

    // Agencija sa logom: logo na pločici umesto znaka i naziva.
    if (this.logo) {
      blocks.push({ h: 130, draw: (y) => this.drawLogoBadge(ctx, PAD, y, 130, 520, false) });
    } else blocks.push({
      h: 50,
      draw: (y) => {
        ctx.strokeStyle = ACCENT;
        ctx.lineWidth = 5;
        ctx.save();
        ctx.translate(PAD + 18, y + 20);
        ctx.rotate(Math.PI / 4);
        ctx.strokeRect(-13, -13, 26, 26);
        ctx.restore();
        ctx.font = `600 42px ${this.body}`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.textBaseline = 'middle';
        ctx.fillText(intro.agency, PAD + 58, y + 22);
        ctx.textBaseline = 'alphabetic';
      }
    });
    blocks.push({ h: 56, draw: () => {} });
    if (intro.eyebrow) {
      blocks.push({
        h: 58,
        draw: (y) => {
          ctx.font = `700 39px ${this.body}`;
          ctx.letterSpacing = '4px';
          ctx.fillStyle = ACCENT;
          ctx.fillText(intro.eyebrow, PAD, y + 42);
          ctx.letterSpacing = '0px';
        }
      });
      blocks.push({ h: 18, draw: () => {} });
    }
    blocks.push({
      h: titleLines.length * 118,
      draw: (y) => {
        ctx.font = `700 106px ${this.display}`;
        ctx.fillStyle = '#FFFFFF';
        titleLines.forEach((line, i) => ctx.fillText(line, PAD, y + 92 + i * 118));
      }
    });
    if (intro.price) {
      blocks.push({ h: 24, draw: () => {} });
      blocks.push({
        h: 106,
        draw: (y) => {
          ctx.font = `800 92px ${this.display}`;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(intro.price, PAD, y + 88);
        }
      });
    }
    if (intro.tiles.length > 0) {
      blocks.push({ h: 52, draw: () => {} });
      blocks.push({
        h: 180,
        draw: (y) => {
          const gap = 24;
          const tileW = (maxW - gap * (intro.tiles.length - 1)) / intro.tiles.length;
          intro.tiles.forEach((tile, i) => {
            const x = PAD + i * (tileW + gap);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.roundRect(x, y, tileW, 180, 32);
            ctx.fill();
            ctx.textAlign = 'center';
            ctx.font = `700 58px ${this.display}`;
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(tile.value, x + tileW / 2, y + 86, tileW - 24);
            ctx.font = `500 34px ${this.body}`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillText(tile.label, x + tileW / 2, y + 138, tileW - 24);
            ctx.textAlign = 'left';
          });
        }
      });
    }
    if (intro.perks.length > 0) {
      blocks.push({ h: 48, draw: () => {} });
      blocks.push({
        h: intro.perks.length * 74,
        draw: (y) => {
          ctx.font = `500 46px ${this.body}`;
          intro.perks.forEach((perk, i) => {
            ctx.fillStyle = ACCENT;
            ctx.fillText('✓', PAD, y + 52 + i * 74);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
            ctx.fillText(perk, PAD + 64, y + 52 + i * 74, maxW - 64);
          });
        }
      });
    }
    blocks.push({ h: 56, draw: () => {} });
    blocks.push({
      h: 50,
      draw: (y) => {
        ctx.font = `600 42px ${this.body}`;
        ctx.fillStyle = ACCENT;
        ctx.fillText(intro.tagline, PAD, y + 42);
      }
    });

    const total = blocks.reduce((sum, b) => sum + b.h, 0);
    let y = (H - total) / 2 + (1 - enter) * 40;
    ctx.globalAlpha = alpha * enter;
    for (const block of blocks) {
      block.draw(y);
      y += block.h;
    }
    ctx.restore();
  }

  /**
   * Početak sa mape: mapa preko celog kadra, gore kartica (agencija, vrsta i
   * naselje, naslov, cena), oznaka nekretnine kad kamera stigne i pločice sa
   * podacima dole, dok traje glas uvoda.
   */
  private drawMapIntro(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
    const scene = this.plan.map;
    const frames = this.mapFrames;
    if (!scene || !frames) return;
    const { intro } = this.plan;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(frames.canvas, 0, 0, W, H);

    // Blago zatamnjenje gore i dole, da kartica i pločice budu čitljive.
    const shade = ctx.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, 'rgba(14, 32, 64, 0.45)');
    shade.addColorStop(0.28, 'rgba(14, 32, 64, 0)');
    shade.addColorStop(0.62, 'rgba(14, 32, 64, 0)');
    shade.addColorStop(1, 'rgba(14, 32, 64, 0.6)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);

    // Oznaka nekretnine pada kad kamera stigne.
    const drop = rise(t, scene.flyEnd - 0.1, 0.6);
    if (drop > 0) {
      const { x, y } = frames.pinPoint();
      const k = easeOut(drop);
      ctx.save();
      ctx.globalAlpha = alpha * Math.min(1, drop * 2);
      ctx.translate(x, y - (1 - k) * 90);
      ctx.scale(3.2, 3.2);
      ctx.translate(-15, -29);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = '#1E5AA8';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.6;
      ctx.fill(new Path2D('M15 29C15 29 4 19.2 4 12A11 11 0 0 1 26 12C26 19.2 15 29 15 29Z'));
      ctx.shadowColor = 'transparent';
      ctx.stroke(new Path2D('M15 29C15 29 4 19.2 4 12A11 11 0 0 1 26 12C26 19.2 15 29 15 29Z'));
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(15, 12, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Kartica gore.
    const enter = easeOut(rise(t, 0.15, 0.6));
    ctx.globalAlpha = alpha * enter;
    const cardX = 56;
    const cardW = W - cardX * 2;
    const inner = cardW - 88;
    ctx.font = `700 76px ${this.display}`;
    const titleLines = wrap(ctx, intro.title, inner).slice(0, 3);
    const brandH = this.logo ? 96 : 44;
    const eyebrowH = intro.eyebrow ? 56 : 0;
    const priceH = intro.price ? 92 : 0;
    const cardH = 44 + brandH + 26 + eyebrowH + titleLines.length * 86 + priceH + 40;
    const cardY = 96 + (1 - enter) * -30;
    ctx.fillStyle = 'rgba(14, 32, 64, 0.86)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 40);
    ctx.fill();
    let y = cardY + 44;
    const x = cardX + 44;
    if (this.logo) {
      this.drawLogoBadge(ctx, x, y, brandH, 440, false);
    } else {
      ctx.font = `600 38px ${this.body}`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.textBaseline = 'middle';
      ctx.fillText(intro.agency, x, y + brandH / 2, inner);
      ctx.textBaseline = 'alphabetic';
    }
    y += brandH + 26;
    if (intro.eyebrow) {
      ctx.font = `700 34px ${this.body}`;
      ctx.letterSpacing = '4px';
      ctx.fillStyle = ACCENT;
      ctx.fillText(intro.eyebrow, x, y + 36, inner);
      ctx.letterSpacing = '0px';
      y += eyebrowH;
    }
    ctx.font = `700 76px ${this.display}`;
    ctx.fillStyle = '#FFFFFF';
    titleLines.forEach((line, i) => ctx.fillText(line, x, y + 66 + i * 86));
    y += titleLines.length * 86;
    if (intro.price) {
      ctx.font = `800 70px ${this.display}`;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(intro.price, x, y + 76);
    }

    // Pločice dole, u redovima, centrirane; svaka "iskoči" u svom trenutku.
    ctx.font = `700 46px ${this.display}`;
    const chipH = 92;
    const gap = 18;
    const padX = 30;
    const maxRow = W - 120;
    const rows: { w: number; items: { text: string; w: number; at: number }[] }[] = [];
    for (const chip of scene.chips) {
      const text = `${chip.icon}  ${chip.text}`;
      const w = ctx.measureText(text).width + padX * 2;
      const row = rows[rows.length - 1];
      if (row && row.w + gap + w <= maxRow) {
        row.items.push({ text, w, at: chip.at });
        row.w += gap + w;
      } else rows.push({ w, items: [{ text, w, at: chip.at }] });
    }
    // Iznad donje trećine - na Reels/TikTok tu stoje opis i dugmad aplikacije.
    const bottom = H - 400;
    rows.forEach((row, r) => {
      const rowY = bottom - (rows.length - r) * (chipH + gap);
      let cx = (W - row.w) / 2;
      for (const item of row.items) {
        const pop = rise(t, item.at, 0.35);
        if (pop > 0) {
          const k = easeOut(pop);
          ctx.save();
          ctx.globalAlpha = alpha * pop;
          ctx.translate(cx + item.w / 2, rowY + chipH / 2 + (1 - k) * 18);
          ctx.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
          ctx.beginPath();
          ctx.roundRect(-item.w / 2, -chipH / 2, item.w, chipH, 26);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(item.text, 0, 2);
          ctx.restore();
        }
        cx += item.w + gap;
      }
    });

    // Izvor mape (licenca OpenStreetMap traži navođenje).
    ctx.globalAlpha = alpha * 0.8;
    ctx.font = `500 22px ${this.body}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.textAlign = 'right';
    ctx.fillText('© OpenStreetMap · Protomaps', W - 32, H - 34);
    ctx.restore();
  }

  private drawOutro(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
    const { outro } = this.plan;
    const enter = easeOut(rise(t, outro.start + 0.2, 0.6));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = CARD_BG;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = alpha * enter;
    ctx.textAlign = 'center';

    // Bez QR koda (vlasnik, 28. 10. 2026): naslov, link na beloj pločici,
    // gde je link (opis objave), agencija i kontakt.
    let y = 700 + (1 - enter) * 40;
    ctx.font = `700 96px ${this.display}`;
    ctx.fillStyle = '#FFFFFF';
    const titleLines = wrap(ctx, outro.title, W - PAD * 2);
    titleLines.forEach((line, i) => ctx.fillText(line, W / 2, y + i * 108));
    y += (titleLines.length - 1) * 108 + 90;

    ctx.font = `700 44px ${this.body}`;
    const linkW = Math.min(W - PAD * 2, ctx.measureText(outro.shortUrl).width + 80);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(W / 2 - linkW / 2, y, linkW, 104, 52);
    ctx.fill();
    ctx.fillStyle = '#0E2040';
    ctx.textBaseline = 'middle';
    ctx.fillText(outro.shortUrl, W / 2, y + 54, linkW - 60);
    ctx.textBaseline = 'alphabetic';
    y += 104 + 78;
    ctx.font = `500 42px ${this.body}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(outro.note, W / 2, y);

    y += 150;
    if (this.logo) {
      this.drawLogoBadge(ctx, W / 2, y - 60, 150, 640, true);
      y += 120;
    } else {
      ctx.font = `700 56px ${this.display}`;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(outro.agency, W / 2, y);
    }
    if (outro.contact) {
      y += 76;
      ctx.font = `600 46px ${this.body}`;
      ctx.fillStyle = ACCENT;
      ctx.fillText(outro.contact, W / 2, y);
    }
    ctx.restore();
  }
}
