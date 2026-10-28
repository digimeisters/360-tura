'use client';

import { useState } from 'react';
import { floorplanUrlFor } from '../../lib/floorplanImage';
import type { Language } from './types';

/**
 * Adresa tlocrta na jeziku ture + rezerva: plan sačuvan pre 28. 10. 2026
 * nema kopiju po jeziku, pa se slika tada jednom prebaci na srpsku.
 */
export function usePlanSrc(url: string, lang: Language): { src: string; onError: () => void } {
  const own = floorplanUrlFor(url, lang) ?? url;
  const [failed, setFailed] = useState<string | null>(null);
  return {
    src: failed === own ? url : own,
    onError: () => {
      if (own !== url) setFailed(own);
    }
  };
}
