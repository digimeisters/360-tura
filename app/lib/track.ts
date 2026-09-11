export type TourEventType = 'open' | 'start' | 'room_view' | 'share' | 'contact';

export type SiteEventType = 'page_view' | 'cta_click' | 'contact_click' | 'form_submit';

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

function send(payload: Record<string, unknown>): void {
  const body = JSON.stringify({ ...payload, sessionId: getSessionId() });

  try {
    // sendBeacon je jedini način da događaj prođe dok se tab zatvara ili dok
    // klik vodi na drugu stranu (tura, Viber, WhatsApp).
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
    // Analitika ne sme da obori stranu ni pod kojim uslovima.
  }
}

export function trackEvent(payload: TrackPayload): void {
  if (typeof window === 'undefined') return;
  send(payload);
}

// Administrator je prijavljen preko Supabase-a, a klijent tada drži sesiju u
// localStorage pod "sb-<projekat>-auth-token". Proverava se samo ključ, bez
// učitavanja Supabase klijenta na početnoj - tvoje posete se ne broje.
function isAdminBrowser(): boolean {
  try {
    return Object.keys(localStorage).some((k) => /^sb-.+-auth-token$/.test(k));
  } catch {
    return false;
  }
}

// Odakle je posetilac došao: utm_source iz linka kampanje ima prednost, pa
// domen prethodne strane. Unutrašnji prelazi i direktne posete su prazni.
function visitSource(): string | null {
  try {
    const utm = new URLSearchParams(window.location.search).get('utm_source');
    if (utm) return utm.toLowerCase().replace(/[^a-z0-9.-]/g, '').slice(0, 100) || null;
    if (!document.referrer) return null;
    const host = new URL(document.referrer).hostname.replace(/^www\./, '');
    return host && host !== window.location.hostname.replace(/^www\./, '') ? host : null;
  } catch {
    return null;
  }
}

export function trackSiteEvent(eventType: SiteEventType, target?: string): void {
  if (typeof window === 'undefined' || isAdminBrowser()) return;

  const payload: Record<string, unknown> = { scope: 'site', eventType };
  if (target) payload.target = target;
  if (eventType === 'page_view') {
    payload.device = window.matchMedia('(max-width: 760px)').matches ? 'mobile' : 'desktop';
    payload.source = visitSource();
  }
  send(payload);
}
