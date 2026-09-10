export type TourEventType = 'open' | 'start' | 'room_view' | 'share' | 'contact';

type TrackPayload = {
  eventType: TourEventType;
  tourSlug: string;
  roomId?: string | null;
  durationMs?: number;
  lang?: string;
};

const SESSION_KEY = 'k360_session';

// Nasumičan ID koji živi samo u ovom tabu - služi da se više događaja poveže
// u jednu posetu. Ne sadrži nikakav lični podatak i ne prati korisnika
// između poseta.
export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    // Privatni režim može da zabrani sessionStorage - tada je svaki događaj
    // sam svoja sesija, što je bolje nego da se ne meri ništa.
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function trackEvent(payload: TrackPayload): void {
  if (typeof window === 'undefined') return;

  const body = JSON.stringify({ ...payload, sessionId: getSessionId() });

  try {
    // sendBeacon je jedini način da događaj prođe dok se tab zatvara -
    // room_view se šalje baš u tom trenutku.
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon('/api/track', blob)) return;
    }
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true
    }).catch(() => {});
  } catch {
    // Analitika ne sme da obori turu ni pod kojim uslovima.
  }
}
