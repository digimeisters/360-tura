/**
 * Prijava greške iz pregledača (klijentski deo). Server je prosleđuje
 * vlasniku na Telegram - vidi app/api/client-error/route.ts.
 *
 * Postoji zato što se greška u turi na nečijem telefonu inače nikad ne
 * sazna: posetilac samo zatvori stranu. Namerno bez spoljnog servisa
 * (Sentry i sl.) - Telegram bot već postoji za upite sa sajta.
 *
 * Prijavljuje se samo sa pravog domena (ne sa localhost-a), najviše
 * nekoliko puta po otvaranju strane, i bez šuma koji nije naša greška.
 */

import { SITE_URL } from './site';

export type ClientErrorSource = 'window' | 'promise' | 'boundary';

export type ClientErrorReport = {
  message: string;
  stack?: string;
  source: ClientErrorSource;
  /** Oznaka serverske greške (error.digest) - poklapa se sa Vercel logom. */
  digest?: string;
};

const MAX_REPORTS_PER_PAGE = 3;
let reportsSent = 0;
const alreadySent = new Set<string>();

// Greške koje nisu naše ili nisu kvarovi: prekinut zahtev pri odlasku sa
// strane, pad mreže na telefonu, poznato bezopasno upozorenje pregledača,
// i "Script error." (tuđa skripta sa drugog domena, bez ikakvog detalja).
const IGNORED = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i,
  /AbortError|The (user|operation) aborted/i,
  /Failed to fetch|NetworkError|Load failed|network error/i
];

function onProductionSite(): boolean {
  try {
    return window.location.hostname === new URL(SITE_URL).hostname;
  } catch {
    return false;
  }
}

export function reportClientError(report: ClientErrorReport): void {
  if (typeof window === 'undefined' || !onProductionSite()) return;

  const message = (report.message || '').trim() || 'Nepoznata greška';
  if (IGNORED.some((re) => re.test(message))) return;
  if (reportsSent >= MAX_REPORTS_PER_PAGE) return;

  const key = `${report.source}:${message}`;
  if (alreadySent.has(key)) return;
  alreadySent.add(key);
  reportsSent++;

  const body = JSON.stringify({
    message: message.slice(0, 300),
    stack: report.stack?.slice(0, 1500),
    source: report.source,
    digest: report.digest?.slice(0, 80),
    path: `${window.location.pathname}${window.location.search}`.slice(0, 200),
    userAgent: navigator.userAgent.slice(0, 200)
  });

  try {
    // sendBeacon prolazi i kad se strana upravo zatvara.
    if (navigator.sendBeacon?.('/api/client-error', new Blob([body], { type: 'application/json' }))) return;
  } catch {
    // pada se na fetch ispod
  }
  void fetch('/api/client-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true
  }).catch(() => {});
}
