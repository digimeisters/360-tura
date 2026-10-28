import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/adminAuth';
import { getShowcaseTours } from '@/app/lib/showcaseTours';
import { looksLikeEmail, sendEmail } from '@/app/lib/email';
import { liveGuideLinkEmail } from '@/app/lib/emails/liveGuideLink';
import { liveGuideToken } from '@/app/lib/liveGuide';
import { CONTACT, SITE_URL } from '@/app/lib/site';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/tours/send-live-link
 *
 * Mejl "Vaš link za vođenje uživo" agentu - meni "⋯" → "Link za vođenje
 * uživo" u /admin/ture. Samo za admina, samo za objavljenu turu (tura drugima
 * ne radi dok nije objavljena). Sa `preview: true` samo vraća HTML mejla, da
 * se u adminu vidi tačno ono što će otići, pre slanja.
 *
 * Telo: { slug, to, name?, preview? }
 */

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(req: Request) {
  const ctx = await requireAdmin(req);
  if (!ctx.ok) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ success: false, error: 'Neispravan zahtev.' }, { status: 400 });
  }

  const slug = clean(body.slug, 120);
  const to = clean(body.to, 200);
  const name = clean(body.name, 80) || null;
  const preview = body.preview === true;

  if (!preview && !looksLikeEmail(to)) {
    return NextResponse.json({ success: false, error: 'Upišite ispravan mejl agenta.' }, { status: 400 });
  }

  // Objavljene, aktivne ture (isti izvor kao sajt) - neobjavljena se ne šalje.
  const tours = await getShowcaseTours('sr').catch(() => null);
  if (!tours) return NextResponse.json({ success: false, error: 'Baza trenutno ne odgovara - pokušajte ponovo za minut.' }, { status: 503 });
  const tour = tours.find((t) => t.slug === slug);
  if (!tour) {
    return NextResponse.json(
      { success: false, error: 'Tura nije objavljena (ili nije aktivna) - prvo je objavite, pa pošaljite agentu.' },
      { status: 409 }
    );
  }

  const email = liveGuideLinkEmail({
    name,
    title: tour.title,
    areaSqm: tour.areaSqm,
    coverUrl: tour.coverUrl,
    guideUrl: `${SITE_URL}/tour/${tour.slug}?agent=${liveGuideToken(tour.slug)}`
  });

  if (preview) return NextResponse.json({ success: true, subject: email.subject, html: email.html });

  // Odgovor ("probaćemo zajedno") ide na info@, ne na adresu za slanje.
  const result = await sendEmail({ to, ...email, replyTo: CONTACT.email });

  if (!result.ok) {
    const error =
      result.reason === 'not-configured'
        ? 'Slanje mejlova nije podešeno na serveru (RESEND_API_KEY).'
        : 'Mejl nije prošao kroz Resend - pokušajte ponovo za minut.';
    return NextResponse.json({ success: false, error }, { status: 502 });
  }
  return NextResponse.json({ success: true });
}
