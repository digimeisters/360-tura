import { FADE_S, VIDEO_HEIGHT, VIDEO_WIDTH, type VideoPlan, type VideoRoomShot } from './videoPlan';
import type { PanoRenderer } from './panoRenderer';

/**
 * Crta JEDAN kadar videa u trenutku `t` (sekunde) na 2D platno 1080x1920:
 * panorame (WebGL, PanoRenderer) + kartice i titlovi preko njih. Izgled prati
 * skicu koju je vlasnik odobrio: tamnoplava kartica na početku i kraju,
 * crna oznaka sa nazivom sobe gore, titl na tamnoj traci dole.
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
    private qr: HTMLCanvasElement | null,
    /** Logo agencije (agency_branding); null = kartice nose samo naziv agencije. */
    private logo: HTMLImageElement | null = null
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

  /** Pogled kamere u sobi u trenutku t: ravnomerno klizi i lagano se primiče. */
  private viewFor(shot: VideoRoomShot, t: number) {
    const p = clamp01((t - shot.start) / (shot.end - shot.start));
    return {
      yaw: shot.fromYaw + (shot.toYaw - shot.fromYaw) * p,
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

    // Nazivi i titlovi soba (ispod kartica).
    for (const shot of visible) this.drawRoomText(ctx, shot, t);
    this.drawBrand(ctx, t);

    const introAlpha = 1 - rise(t, plan.intro.end - FADE_S, FADE_S);
    if (introAlpha > 0) this.drawIntro(ctx, t, introAlpha);
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

  private drawOutro(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
    const { outro } = this.plan;
    const enter = easeOut(rise(t, outro.start + 0.2, 0.6));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = CARD_BG;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = alpha * enter;
    ctx.textAlign = 'center';

    let y = 430 + (1 - enter) * 40;
    ctx.font = `700 88px ${this.display}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(outro.title, W / 2, y);
    y += 78;
    ctx.font = `500 42px ${this.body}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(outro.note, W / 2, y);

    y += 80;
    const box = 540;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(W / 2 - box / 2, y, box, box, 40);
    ctx.fill();
    if (this.qr) ctx.drawImage(this.qr, W / 2 - 235, y + 35, 470, 470);
    y += box + 100;

    if (this.logo) {
      // Logo agencije umesto naziva (pločica 150 px, ispod QR koda).
      this.drawLogoBadge(ctx, W / 2, y - 60, 150, 640, true);
      y += 90;
    } else {
      ctx.font = `700 56px ${this.display}`;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(outro.agency, W / 2, y);
    }
    if (outro.contact) {
      y += 72;
      ctx.font = `600 46px ${this.body}`;
      ctx.fillStyle = ACCENT;
      ctx.fillText(outro.contact, W / 2, y);
    }
    y += 76;
    ctx.font = `500 36px ${this.body}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(outro.shortUrl, W / 2, y, W - PAD * 2);
    ctx.restore();
  }
}
