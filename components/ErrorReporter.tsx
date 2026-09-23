'use client';

import { useEffect } from 'react';
import { reportClientError } from '../app/lib/reportError';

/**
 * Hvata greške koje React-ov ekran za grešku (error.tsx) ne vidi: one iz
 * događaja, tajmera i obećanja (npr. Pannellum, audio vodič, upload), i
 * prijavljuje ih - vidi app/lib/reportError.ts. Ne crta ništa.
 */
export default function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      // Greške iz dodataka pregledača (ad-blokeri, prevodioci) nisu naše.
      if (/^(chrome|moz|safari|safari-web)-extension:/.test(event.filename || '')) return;
      const error = event.error instanceof Error ? event.error : null;
      reportClientError({
        message: error?.message || event.message,
        stack: error?.stack || (event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined),
        source: 'window'
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      reportClientError({
        message: reason instanceof Error ? reason.message : String(reason ?? ''),
        stack: reason instanceof Error ? reason.stack : undefined,
        source: 'promise'
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
