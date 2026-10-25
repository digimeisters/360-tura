import { parseVideo } from '../../app/lib/videoEmbed';

/**
 * Video stana ili projekta (migracija 040). YouTube/Vimeo kao iframe, .mp4 kao
 * <video>; bez samopokretanja, a .mp4 se ne učitava dok se ne pusti. Link koji
 * nije jedan od ta tri oblika se ne prikazuje.
 */
export default function VideoFrame({ url, title, className = 'k-video' }: { url: string | null; title: string; className?: string }) {
  const v = parseVideo(url);
  if (!v) return null;
  return (
    <div className={className}>
      {v.kind === 'file' ? (
        <video src={v.src} controls preload="none" playsInline title={title} />
      ) : (
        <iframe
          src={v.src}
          title={title}
          loading="lazy"
          allow="fullscreen; picture-in-picture; encrypted-media"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
    </div>
  );
}
