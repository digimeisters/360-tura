import QRCode from 'qrcode';
import { AudioBufferSource, BufferTarget, CanvasSource, Mp4OutputFormat, Output, QUALITY_HIGH, canEncodeAudio, canEncodeVideo } from 'mediabunny';
import { VIDEO_FPS, VIDEO_HEIGHT, VIDEO_WIDTH, type VideoPlan } from './videoPlan';
import { PanoRenderer } from './panoRenderer';
import { VideoFrameRenderer } from './videoFrame';
import { VideoMapFrames } from './videoMap';

/**
 * Pravi MP4 (H.264, 1080x1920, 30 fps) iz plana videa, potpuno u pregledaču:
 * WebCodecs kodira kadar po kadar, Mediabunny ih pakuje u MP4. Kadrovi se
 * crtaju za tačno vreme (ne snima se ekran), pa je kretanje glatko i kad je
 * računar spor - samo pravljenje traje duže.
 *
 * Zvuk (od 17. 10. 2026): glas uvoda ture na početku i, ako agent izabere,
 * muzika ispod celog videa (tiša dok glas priča). Miksuje se unapred
 * (OfflineAudioContext) i ide kao jedan AAC zapis.
 */

const SAMPLE_RATE = 48000;
/** Jačina muzike dok glas priča i posle njega; kraj videa se lagano utiša. */
const MUSIC_UNDER_VOICE = 0.14;
const MUSIC_ALONE = 0.42;
const MUSIC_FADE_OUT_S = 1.5;
const VOICE_DELAY_S = 0.4;

async function decode(data: ArrayBuffer): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, SAMPLE_RATE, SAMPLE_RATE);
  return ctx.decodeAudioData(data);
}

/** Glas + muzika u jedan zapis tačno dužine videa; null kad nema ni jednog. */
async function mixAudio(plan: VideoPlan, music: File | null): Promise<AudioBuffer | null> {
  if (!plan.voice && !music) return null;
  const length = Math.ceil(plan.duration * SAMPLE_RATE);
  const ctx = new OfflineAudioContext(2, length, SAMPLE_RATE);
  let voiceEnd = 0;
  if (plan.voice) {
    const res = await fetch(plan.voice.url);
    if (!res.ok) throw new Error('Glas uvoda nije mogao da se učita.');
    const buffer = await decode(await res.arrayBuffer());
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(VOICE_DELAY_S);
    voiceEnd = VOICE_DELAY_S + buffer.duration;
  }
  if (music) {
    let buffer: AudioBuffer;
    try {
      buffer = await decode(await music.arrayBuffer());
    } catch {
      throw new Error('Muzika nije mogla da se pročita - izaberite MP3 ili M4A fajl.');
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const gain = ctx.createGain();
    const end = plan.duration;
    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(voiceEnd ? MUSIC_UNDER_VOICE : MUSIC_ALONE, 0.6);
    if (voiceEnd) {
      gain.gain.setValueAtTime(MUSIC_UNDER_VOICE, voiceEnd);
      gain.gain.linearRampToValueAtTime(MUSIC_ALONE, voiceEnd + 1);
    }
    gain.gain.setValueAtTime(MUSIC_ALONE, Math.max(0.7, end - MUSIC_FADE_OUT_S));
    gain.gain.linearRampToValueAtTime(0, end);
    src.connect(gain).connect(ctx.destination);
    src.start(0);
  }
  return ctx.startRendering();
}

export type VideoProgress =
  | { stage: 'loading'; done: number; total: number }
  | { stage: 'encoding'; done: number; total: number }
  | { stage: 'finishing' };

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('logo'));
    img.src = url;
  });
}

export async function renderTourVideo(
  plan: VideoPlan,
  options: {
    onProgress: (progress: VideoProgress) => void;
    /** Platno na kome se usput vidi kako video nastaje (umanjeno) - traži se svaki put, jer se prozor u međuvremenu prerenderuje. */
    getPreview?: () => HTMLCanvasElement | null;
    signal?: AbortSignal;
    /** Muzika ispod videa (fajl sa agentovog računara); null = bez muzike. */
    music?: File | null;
  }
): Promise<Blob> {
  if (typeof VideoEncoder === 'undefined') {
    throw new Error('Ovaj pregledač ne ume da pravi video. Otvorite turu u Chrome-u na računaru.');
  }
  if (!(await canEncodeVideo('avc', { width: VIDEO_WIDTH, height: VIDEO_HEIGHT, quality: QUALITY_HIGH }))) {
    throw new Error('Pregledač ne podržava H.264 kodiranje u ovoj veličini. Probajte u Chrome-u na računaru.');
  }

  const pano = new PanoRenderer(VIDEO_WIDTH, VIDEO_HEIGHT);
  let mapFrames: VideoMapFrames | null = null;
  try {
    // 1) Panorame svih soba iz plana (svaka jednom).
    const urls = [...new Set(plan.rooms.map((shot) => shot.panoramaUrl))];
    let loaded = 0;
    options.onProgress({ stage: 'loading', done: 0, total: urls.length });
    for (const url of urls) {
      options.signal?.throwIfAborted();
      await pano.load(url);
      loaded += 1;
      options.onProgress({ stage: 'loading', done: loaded, total: urls.length });
    }

    // Fontovi sajta moraju biti spremni pre prvog kadra.
    await document.fonts.ready;

    // Logo agencije: CDN šalje CORS zaglavlja (isto kao za panorame), pa platno
    // ostaje čisto za kodiranje. Ako se ne učita, kartice idu samo sa nazivom.
    const logo = plan.agencyLogoUrl ? await loadImage(plan.agencyLogoUrl).catch(() => null) : null;

    // Mapa za početak (tura sa lokacijom) - učita se pre prvog kadra.
    if (plan.map) mapFrames = await VideoMapFrames.create(plan.map);

    const audio = await mixAudio(plan, options.music ?? null);
    const audioCodec = !audio ? null : (await canEncodeAudio('aac')) ? 'aac' : (await canEncodeAudio('opus')) ? 'opus' : null;
    if (audio && !audioCodec) throw new Error('Pregledač ne ume da upiše zvuk u video. Probajte u Chrome-u na računaru.');

    const qr = document.createElement('canvas');
    await QRCode.toCanvas(qr, plan.outro.url, { width: 400, margin: 1, color: { dark: '#0E2040', light: '#FFFFFF' } });

    // 2) Kadar po kadar u MP4.
    const canvas = document.createElement('canvas');
    canvas.width = VIDEO_WIDTH;
    canvas.height = VIDEO_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D platno nije dostupno.');
    const frames = new VideoFrameRenderer(plan, pano, qr, logo, mapFrames);

    const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
    const source = new CanvasSource(canvas, { codec: 'avc', quality: QUALITY_HIGH, keyFrameInterval: 1 });
    output.addVideoTrack(source, { frameRate: VIDEO_FPS });
    const audioSource = audio && audioCodec ? new AudioBufferSource({ codec: audioCodec, bitrate: QUALITY_HIGH }) : null;
    if (audioSource) output.addAudioTrack(audioSource);
    await output.start();
    if (audioSource && audio) await audioSource.add(audio);

    const total = Math.ceil(plan.duration * VIDEO_FPS);
    for (let i = 0; i < total; i++) {
      if (options.signal?.aborted) {
        await output.cancel();
        throw new DOMException('Prekinuto', 'AbortError');
      }
      const t = i / VIDEO_FPS;
      if (mapFrames && plan.map && t <= plan.map.end) await mapFrames.renderAt(t);
      frames.draw(ctx, t);
      await source.add(t, 1 / VIDEO_FPS);
      const preview = i % 3 === 0 ? options.getPreview?.() : null;
      if (preview) preview.getContext('2d')?.drawImage(canvas, 0, 0, preview.width, preview.height);
      if (i % 5 === 0) options.onProgress({ stage: 'encoding', done: i, total });
      // Povremeno pusti pregledač da osveži ekran (napredak, pregled).
      if (i % 10 === 0) await new Promise((r) => setTimeout(r, 0));
    }

    options.onProgress({ stage: 'finishing' });
    await output.finalize();
    const buffer = output.target.buffer;
    if (!buffer) throw new Error('Video je prazan.');
    return new Blob([buffer], { type: 'video/mp4' });
  } finally {
    pano.dispose();
    mapFrames?.dispose();
  }
}
