import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/adminAuth';
import { getShowcaseTours } from '@/app/lib/showcaseTours';
import { looksLikeEmail, sendEmail } from '@/app/lib/email';
import { tourReadyEmail } from '@/app/lib/emails/tourReady';
import { embedSnippet } from '@/app/lib/embedCode';
import { CONTACT, SITE_URL } from '@/app/lib/site';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/tours/send-ready
 *
 * Mejl "Vaša tura je gotova" klijentu - dugme "Pošalji klijentu" u
 * /admin/ture. Samo za admina, samo za objavljenu turu (link drugima ne
 * radi dok tura nije objavljena). Sa `preview: true` samo vraća HTML mejla,
 * da se u adminu vidi tačno ono što će otići, pre slanja.
 *
 * Telo: { slug, to, name?, hdrUrl?, qrPng? (base64 PNG), preview? }
 */

// QR PNG od 1600px je ~30 KB; granica čuva rutu od slučajno ogromnog priloga.
const MAX_QR_BASE64 = 400_000;

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
  const hdrUrl = clean(body.hdrUrl, 500);
  const qrPng = typeof body.qrPng === 'string' ? body.qrPng.replace(/^data:image\/png;base64,/, '') : '';
  const preview = body.preview === true;

  if (hdrUrl && !/^https:\/\/\S+$/.test(hdrUrl)) {
    return NextResponse.json({ success: false, error: 'Link za HDR fotografije mora da počinje sa https://.' }, { status: 400 });
  }
  if (qrPng.length > MAX_QR_BASE64) {
    return NextResponse.json({ success: false, error: 'QR prilog je prevelik.' }, { status: 400 });
  }
  if (!preview && !looksLikeEmail(to)) {
    return NextResponse.json({ success: false, error: 'Upišite ispravan mejl primaoca.' }, { status: 400 });
  }

  // Objavljene, aktivne ture (isti izvor kao sajt) - neobjavljena se ne šalje.
  const tours = await getShowcaseTours('sr');
  const tour = tours.find((t) => t.slug === slug);
  if (!tour) {
    return NextResponse.json(
      { success: false, error: 'Tura nije objavljena (ili nije aktivna) - prvo je objavite, pa pošaljite klijentu.' },
      { status: 409 }
    );
  }

  const email = tourReadyEmail({
    name,
    title: tour.title,
    tourUrl: `${SITE_URL}/tour/${tour.slug}`,
    embedCode: embedSnippet(tour.slug),
    coverUrl: tour.coverUrl,
    roomCount: tour.roomCount,
    languages: tour.languages,
    areaSqm: tour.areaSqm,
    hdrUrl: hdrUrl || null,
    qrAttached: Boolean(qrPng)
  });

  if (preview) return NextResponse.json({ success: true, subject: email.subject, html: email.html });

  const result = await sendEmail({
    to,
    ...email,
    // Odgovor ("nešto treba ispraviti") ide na info@, ne na adresu za slanje.
    replyTo: CONTACT.email,
    attachments: qrPng ? [{ filename: `qr-${tour.slug}.png`, content: qrPng }] : undefined
  });

  if (!result.ok) {
    const error =
      result.reason === 'not-configured'
        ? 'Slanje mejlova nije podešeno na serveru (RESEND_API_KEY).'
        : 'Mejl nije prošao kroz Resend - pokušajte ponovo za minut.';
    return NextResponse.json({ success: false, error }, { status: 502 });
  }
  return NextResponse.json({ success: true });
}
