'use client';

import { THEME } from '../theme';
import { type TourAdmin } from './useTourAdmin';

/** Modal: Napredak prevođenja / generisanja glasa / upload-a panorame */
export default function ProgressModal({ a }: { a: TourAdmin }) {
  const { translationProgress, voiceProgress, panoramaUploadProgress } = a;
  return (
    <>
    {(translationProgress || voiceProgress || panoramaUploadProgress) && (
      <div style={{ position: 'absolute', inset: 0, zIndex: 110, backgroundColor: THEME.overlay, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        {/* Sopstveni keyframes: onaj u page.tsx postoji samo dok se soba učitava. */}
        <style>{`
          @keyframes adminPulseDot {
            0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
            40% { transform: scale(1.0); opacity: 1; }
          }
        `}</style>
        <div style={{ backgroundColor: THEME.surface, border: '1px solid ' + THEME.border, borderRadius: '20px', padding: '28px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', boxShadow: THEME.shadowLg, maxWidth: '360px', textAlign: 'center' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: THEME.accent, borderRadius: '50%', animation: 'adminPulseDot 1.4s infinite ease-in-out both' }} />
          <div style={{ color: THEME.textPrimary, fontSize: '18px', fontWeight: 'bold' }}>{voiceProgress || panoramaUploadProgress || translationProgress}</div>
          <p style={{ color: THEME.textSecondary, fontSize: '13px' }}>
            {voiceProgress
              ? 'Molimo vas sačekajte, generisanje AI glasa je u toku...'
              : panoramaUploadProgress
              ? 'Molimo vas sačekajte, upload na Cloudflare je u toku...'
              : 'Molimo vas sačekajte, prevođenje i upis u bazu su u toku...'}
          </p>
        </div>
      </div>
    )}
    </>
  );
}
