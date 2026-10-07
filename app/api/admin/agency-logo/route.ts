import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { requireAdmin } from '@/app/lib/adminAuth';
import { r2Client } from '@/app/lib/r2';
import { slugify } from '@/app/lib/slug';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'image/jpeg': 'jpg'
};

// Logo je mali fajl - ide kroz rutu (Vercel pušta do 4,5MB), bez potpisanog URL-a.
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/**
 * Logo agencije za krug na mestu stativa u turi (migracija 027).
 *
 * POST   multipart { agency, file } -> R2 agencije/<naziv>-logo-<vreme>.<ext>,
 *        upis u agency_branding. Važi za sve ture te agencije.
 * DELETE { agency } -> briše red; ture se vraćaju na Kvadrat360 znak.
 *        Fajl na R2 ostaje (mali je, a stara tura u kešu ne ostaje bez slike).
 */
export async function POST(req: Request) {
  const ctx = await requireAdmin(req);
  if (!ctx.ok) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });

  const bucket = process.env.R2_BUCKET_NAME;
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;
  if (!bucket || !cdnUrl) {
    return NextResponse.json({ success: false, error: 'R2 nije podešen na serveru.' }, { status: 500 });
  }

  const form = await req.formData().catch(() => null);
  const agency = typeof form?.get('agency') === 'string' ? String(form?.get('agency')) : '';
  const file = form?.get('file');
  if (!agency || !(file instanceof File)) {
    return NextResponse.json({ success: false, error: 'Nedostaje agencija ili fajl.' }, { status: 400 });
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ success: false, error: 'Dozvoljeni su PNG, SVG, WEBP i JPG.' }, { status: 400 });
  }
  if (file.size > MAX_LOGO_BYTES) {
    return NextResponse.json({ success: false, error: 'Logo je veći od 2MB.' }, { status: 400 });
  }

  // Samo agencija koja već ima turu - naziv mora da se poklopi tačno.
  const { data: tours } = await ctx.supabase.from('tours').select('slug').eq('agency_name', agency).limit(1);
  if (!tours?.length) {
    return NextResponse.json({ success: false, error: 'Nema ture sa tim nazivom agencije.' }, { status: 404 });
  }

  const key = `agencije/${slugify(agency) || 'agencija'}-logo-${Date.now()}.${ext}`;
  try {
    await r2Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: file.type,
        CacheControl: 'public, max-age=31536000, immutable'
      })
    );
  } catch (err) {
    console.error('[api/admin/agency-logo] R2 upload failed:', err);
    return NextResponse.json({ success: false, error: 'Logo nije otpremljen.' }, { status: 500 });
  }

  const logoUrl = `${cdnUrl.replace(/\/+$/, '')}/${key}`;
  const { error } = await ctx.supabase
    .from('agency_branding')
    .upsert({ agency_name: agency, logo_url: logoUrl, updated_at: new Date().toISOString() });
  if (error) {
    console.error('[api/admin/agency-logo] upsert failed:', error.message);
    return NextResponse.json({ success: false, error: 'Logo nije sačuvan.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, logoUrl });
}

export async function DELETE(req: Request) {
  const ctx = await requireAdmin(req);
  if (!ctx.ok) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });

  const body = await req.json().catch(() => ({}));
  const agency = typeof body.agency === 'string' ? body.agency : '';
  if (!agency) return NextResponse.json({ success: false, error: 'Nedostaje agencija.' }, { status: 400 });

  const { error } = await ctx.supabase.from('agency_branding').delete().eq('agency_name', agency);
  if (error) {
    console.error('[api/admin/agency-logo] delete failed:', error.message);
    return NextResponse.json({ success: false, error: 'Logo nije uklonjen.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
