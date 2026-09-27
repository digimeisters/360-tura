'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { SITE_URL } from '../../lib/site';
import { FORM } from '../../lib/formTheme';

/**
 * QR kod ture - deo Premium paketa ("QR kod za oglas, letak i izlog").
 *
 * Pravi se u pregledaču, bez servera: biblioteka `qrcode` vrati SVG, u
 * sredinu se ubaci znak Kvadrat360 (romb) na belom polju, i to se preuzima
 * kao SVG (štampa - oštar u svakoj veličini) ili PNG 1600px (oglas, poruka,
 * društvene mreže).
 *
 * Nivo ispravke grešaka je H (do ~30% koda sme da fali), pa logo preko
 * sredine ne smeta čitanju (provereno dekoderom na 300px i 1600px, i za
 * dugačak slug). Link nosi ?utm_source=qr: analitika tura (tour_events) za
 * sada NE beleži izvor posete, pa se oznaka još ne vidi u /admin/analitika -
 * stoji u linku da bi se merenje moglo uključiti bez ponovne štampe letaka.
 */

const INK = '#111113';
const BRAND = '#1E5AA8';
/** Deo širine koda koji zauzima belo polje sa logom - ispod granice koju H podnosi. */
const LOGO_SHARE = 0.22;
const PNG_SIZE = 1600;

export function tourQrUrl(slug: string): string {
  return `${SITE_URL}/tour/${slug}?utm_source=qr`;
}

/** SVG QR koda sa logom u sredini. */
async function buildQrSvg(url: string): Promise<string> {
  const raw = await QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 2,
    color: { dark: INK, light: '#FFFFFF' }
  });
  const size = Number(/viewBox="0 0 (\d+) \d+"/.exec(raw)?.[1] ?? 0);
  if (!size) return raw;

  const box = size * LOGO_SHARE;
  const x = (size - box) / 2;
  // Romb iz znaka Kvadrat360 (public/brand/kvadrat360-icon.svg), skaliran u polje.
  const mark = box * 0.62;
  const stroke = mark * 0.15;
  const logo =
    `<rect x="${x}" y="${x}" width="${box}" height="${box}" rx="${box * 0.2}" fill="#FFFFFF"/>` +
    `<rect x="${(size - mark) / 2}" y="${(size - mark) / 2}" width="${mark}" height="${mark}" rx="${mark * 0.27}" ` +
    `fill="none" stroke="${BRAND}" stroke-width="${stroke}" transform="rotate(45 ${size / 2} ${size / 2})"/>`;
  return raw.replace('</svg>', `${logo}</svg>`);
}

function download(blob: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function svgToPng(svg: string, px: number): Promise<Blob> {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas nije dostupan.');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, px, px);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG nije napravljen.'))), 'image/png')
  );
}

export default function TourQrDialog({
  slug,
  title,
  published,
  onClose
}: {
  slug: string;
  title: string;
  published: boolean;
  onClose: () => void;
}) {
  const url = tourQrUrl(slug);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    buildQrSvg(url)
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setError('QR kod nije napravljen.'));
    return () => {
      alive = false;
    };
  }, [url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const btn: React.CSSProperties = {
    padding: '9px 14px',
    borderRadius: '10px',
    border: '1px solid ' + FORM.border,
    background: FORM.surface,
    color: FORM.textPrimary,
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer'
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`QR kod: ${title}`}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: FORM.surface, color: FORM.textPrimary, borderRadius: '18px', width: '100%', maxWidth: '420px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 20px 50px rgba(0,0,0,.3)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontFamily: FORM.fontDisplay }}>QR kod ture</h2>
          <button type="button" onClick={onClose} aria-label="Zatvori" style={{ ...btn, padding: '4px 10px', fontSize: '18px', lineHeight: 1 }}>
            ×
          </button>
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: FORM.textSecondary }}>{title}</p>

        {!published && (
          <p style={{ margin: 0, fontSize: '12.5px', color: '#92400e', background: '#fef3c7', borderRadius: '8px', padding: '8px 10px' }}>
            Tura još nije objavljena — kod će raditi tek kad je objavite.
          </p>
        )}

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid ' + FORM.border, padding: '10px', aspectRatio: '1 / 1', display: 'grid', placeItems: 'center' }}>
          {svg ? (
            // eslint-disable-next-line @next/next/no-img-element -- lokalni SVG iz memorije, next/image nema šta da doda
            <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={`QR kod za turu ${title}`} style={{ width: '100%', height: '100%' }} />
          ) : (
            <span style={{ fontSize: '13px', color: FORM.textSecondary }}>{error || 'Pravim kod…'}</span>
          )}
        </div>

        <p style={{ margin: 0, fontSize: '12px', color: FORM.textSecondary, wordBreak: 'break-all' }}>{url}</p>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={!svg}
            onClick={() => void svgToPng(svg, PNG_SIZE).then((b) => download(b, `qr-${slug}.png`)).catch(() => setError('PNG nije napravljen.'))}
            style={{ ...btn, background: BRAND, color: '#fff', borderColor: BRAND, flex: '1 1 150px' }}
          >
            Preuzmi PNG
          </button>
          <button
            type="button"
            disabled={!svg}
            onClick={() => download(new Blob([svg], { type: 'image/svg+xml' }), `qr-${slug}.svg`)}
            style={{ ...btn, flex: '1 1 150px' }}
          >
            Preuzmi SVG (štampa)
          </button>
        </div>
        <p style={{ margin: 0, fontSize: '11.5px', color: FORM.textSecondary }}>
          PNG za oglas, poruku i društvene mreže. SVG za letak i izlog — oštar u svakoj veličini. Na štampi najmanje 2,5 cm.
        </p>
      </div>
    </div>
  );
}
