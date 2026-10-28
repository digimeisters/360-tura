import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/adminAuth';
import { getShowcaseTours } from '@/app/lib/showcaseTours';
import { looksLikeEmail, sendEmail } from '@/app/lib/email';
import { agencyOfferEmail } from '@/app/lib/emails/agencyOffer';
import { escapeHtml, sendTelegramMessage } from '@/app/lib/telegram';
import { CONTACT, SITE_URL } from '@/app/lib/site';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/agency-offer
 *
 * Mejl "Ponuda agenciji" - dugme "Pošalji ponudu" na strani Agencije u
 * adminu. Samo za admina, jedna agencija po slanju (nikad lista). Sa
 * `preview: true` vraća HTML mejla i spisak objavljenih tura za izbor
 * primera, bez slanja. Svako slanje ide i na Telegram, kao evidencija.
 *
 * Telo: { to, name?, note?, slug?, preview? }
 */

// Primer ture kad nijedan nije izabran: ista tura kao u vrhu početne strane.
const DEFAULT_SLUG = 'stan-kragujevac-maglicka1';

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
  const to = clean(body.to, 200);
  const name = clean(body.name, 80) || null;
  const note = clean(body.note, 400) || null;
  const preview = body.preview === true;

  if (!preview && !looksLikeEmail(to)) {
    return NextResponse.json({ success: false, error: 'Upišite ispravan mejl agencije.' }, { status: 400 });
  }

  const tours = await getShowcaseTours('sr').catch(() => null);
  if (!tours?.length) return NextResponse.json({ success: false, error: 'Baza trenutno ne odgovara - pokušajte ponovo za minut.' }, { status: 503 });
  const slug = clean(body.slug, 120) || DEFAULT_SLUG;
  const tour = tours.find((t) => t.slug === slug) ?? tours.find((t) => t.slug === DEFAULT_SLUG) ?? tours[0];

  const email = agencyOfferEmail({
    name,
    note,
    tourTitle: tour.title,
    tourUrl: `${SITE_URL}/tour/${tour.slug}`,
    coverUrl: tour.coverUrl,
    roomCount: tour.roomCount
  });

  if (preview) {
    return NextResponse.json({
      success: true,
      subject: email.subject,
      html: email.html,
      slug: tour.slug,
      tours: tours.map((t) => ({ slug: t.slug, title: t.title }))
    });
  }

  // Odgovor agencije (i "odjava") stiže na info@, ne na adresu za slanje.
  const result = await sendEmail({ to, ...email, replyTo: CONTACT.email });
  if (!result.ok) {
    const error =
      result.reason === 'not-configured'
        ? 'Slanje mejlova nije podešeno na serveru (RESEND_API_KEY).'
        : 'Mejl nije prošao kroz Resend - pokušajte ponovo za minut.';
    return NextResponse.json({ success: false, error }, { status: 502 });
  }

  await sendTelegramMessage(
    [
      '✉️ <b>Ponuda poslata agenciji</b>',
      `Na: <b>${escapeHtml(to)}</b>${name ? ` (${escapeHtml(name)})` : ''}`,
      `Primer ture: ${escapeHtml(tour.title)}`,
      ...(note ? [`Lična rečenica: ${escapeHtml(note)}`] : [])
    ].join('\n')
  ).catch(() => false);

  return NextResponse.json({ success: true });
}
