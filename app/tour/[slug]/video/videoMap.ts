import type { Map as MlMap } from 'maplibre-gl';
import { loadMapLibre } from '../../../../components/maps/protomaps';
import { VIDEO_HEIGHT, VIDEO_WIDTH, type VideoMapScene } from './videoPlan';

/**
 * Mapa za početak videa (isti "dolazak sa mape" kao uvod u turi,
 * TourIntroOverlay): naša mapa (MapLibre + Protomaps) se crta van ekrana, a
 * za svaki kadar videa kamera se postavi tačno za to vreme i sačeka da se
 * pločice mape učitaju - zato je let gladak i kad je internet spor.
 *
 * Kutija je upola manja od videa sa pixelRatio 2: platno je 1080x1920, a
 * natpisi na mapi su dvostruko veći, čitljivi na telefonu.
 */

const SCALE = 2;
const FROM = { zoom: 12.2, pitch: 0, bearing: 0 };
const TO = { zoom: 16.4, pitch: 50, bearing: -18 };
/** Posle leta kamera se još jedva primetno okreće, da slika ne stoji. */
const DRIFT_DEG_PER_S = 1.5;

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

export class VideoMapFrames {
  private constructor(
    private map: MlMap,
    private box: HTMLDivElement,
    private scene: VideoMapScene
  ) {}

  static async create(scene: VideoMapScene): Promise<VideoMapFrames> {
    const { maplibregl, style } = await loadMapLibre();
    const box = document.createElement('div');
    // Van ekrana, ali ne display:none - WebGL mora stvarno da crta.
    Object.assign(box.style, {
      position: 'fixed',
      left: '-20000px',
      top: '0',
      width: `${VIDEO_WIDTH / SCALE}px`,
      height: `${VIDEO_HEIGHT / SCALE}px`,
      pointerEvents: 'none'
    });
    document.body.appendChild(box);
    const map = new maplibregl.Map({
      container: box,
      style,
      center: scene.center,
      ...FROM,
      pixelRatio: SCALE,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      // Platno se kopira u video posle crtanja - bez ovoga bi bilo prazno.
      canvasContextAttributes: { preserveDrawingBuffer: true }
    });
    const frames = new VideoMapFrames(map, box, scene);
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error('Mapa se nije učitala za 30 s - proverite internet i pokušajte ponovo.')), 30000);
        map.once('load', () => {
          window.clearTimeout(timer);
          resolve();
        });
        map.once('error', (e) => {
          window.clearTimeout(timer);
          reject(new Error(`Mapa nije učitana: ${e.error?.message ?? 'greška'}`));
        });
      });
      await frames.settle();
    } catch (err) {
      frames.dispose();
      throw err;
    }
    return frames;
  }

  get canvas(): HTMLCanvasElement {
    return this.map.getCanvas();
  }

  private camera(t: number) {
    const p = easeInOut(Math.min(1, Math.max(0, t / this.scene.flyEnd)));
    const drift = Math.max(0, t - this.scene.flyEnd) * DRIFT_DEG_PER_S;
    return {
      center: this.scene.center,
      zoom: FROM.zoom + (TO.zoom - FROM.zoom) * p,
      pitch: FROM.pitch + (TO.pitch - FROM.pitch) * p,
      bearing: FROM.bearing + (TO.bearing - FROM.bearing) * p - drift
    };
  }

  /** Čeka da mapa nacrta kadar sa svim pločicama (ili najviše 4 s). */
  private settle(): Promise<void> {
    return new Promise((resolve) => {
      const timer = window.setTimeout(resolve, 4000);
      this.map.once('idle', () => {
        window.clearTimeout(timer);
        resolve();
      });
      this.map.triggerRepaint();
    });
  }

  /** Postavlja kameru za trenutak t videa i čeka da se kadar nacrta. */
  async renderAt(t: number): Promise<void> {
    this.map.jumpTo(this.camera(t));
    await this.settle();
  }

  /** Gde je nekretnina na platnu videa (piksel), za oznaku. */
  pinPoint(): { x: number; y: number } {
    const p = this.map.project(this.scene.center);
    return { x: p.x * SCALE, y: p.y * SCALE };
  }

  dispose(): void {
    this.map.remove();
    this.box.remove();
  }
}
