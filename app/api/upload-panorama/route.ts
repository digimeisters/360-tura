import { NextResponse } from 'next/server';
import { PutObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client } from '@/app/lib/r2';
import { requireAdmin } from '@/app/lib/adminAuth';
import { refreshPublicPages } from '@/app/lib/revalidatePublic';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_FILE_BYTES = 40 * 1024 * 1024; // 40MB - panorame su velike equirectangular slike

/**
 * ============================================================
 * POST /api/upload-panorama  (KORAK 1 - priprema)
 * ============================================================
 * Vraća potpisan (presigned) R2 URL na koji admin panel šalje fajl
 * DIREKTNO iz pregledača, mimo ove Vercel funkcije - vidi finish/route.ts
 * za KORAK 2 (obrada + upis u bazu).
 *
 * Zašto u dva koraka: Vercel funkcije imaju TVRD, nepodesiv limit od 4.5MB
 * po telu zahteva. Panorame su skoro uvek veće od toga, pa bi svaki upload
 * pukao pre nego što bi uopšte stigao do koda ove rute (Vercel ga odbije
 * sam, platformski, pre nas - otud i čudna "nije validan JSON" greška na
 * klijentu, jer je odgovor bio obična tekstualna poruka, ne JSON). Rešenje
 * je da veliki fajl ide pravo u R2, a Vercel funkcija samo izda dozvolu
 * (ovaj JSON odgovor je mali, sigurno ispod limita) i kasnije obradi ono
 * što je već gore.
 *
 * Body (JSON): { roomId: string, fileType: string, fileSize: number }
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireAdmin(req);
    if (!ctx.ok) {
      return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });
    }

    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) {
      return NextResponse.json(
        { success: false, error: 'Nedostaje R2_BUCKET_NAME environment varijabla.' },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const roomId = typeof body.roomId === 'string' ? body.roomId : '';
    const fileType = typeof body.fileType === 'string' ? body.fileType : '';
    const fileSize = typeof body.fileSize === 'number' ? body.fileSize : 0;

    if (!roomId) {
      return NextResponse.json({ success: false, error: 'Nedostaje roomId.' }, { status: 400 });
    }

    const ext = ALLOWED_TYPES[fileType];
    if (!ext) {
      return NextResponse.json(
        { success: false, error: `Nepodržan tip fajla: ${fileType || 'nepoznat'}. Dozvoljeno: JPG, PNG, WEBP.` },
        { status: 400 }
      );
    }

    if (fileSize > MAX_FILE_BYTES) {
      return NextResponse.json(
        { success: false, error: `Fajl je prevelik (${(fileSize / 1024 / 1024).toFixed(1)}MB). Maksimum je 40MB.` },
        { status: 400 }
      );
    }

    const { data: room, error: roomErr } = await ctx.supabase
      .from('rooms')
      .select('id')
      .eq('id', roomId)
      .single();

    if (roomErr || !room) {
      return NextResponse.json(
        { success: false, error: `Soba ${roomId} nije pronađena u bazi.` },
        { status: 404 }
      );
    }

    // Privremeno ime: konačno ime (bez tmp- prefiksa) upisuje tek finish
    // ruta, pošto zna da je obrada uspela - dotad se ne dira postojeća
    // (živa) panorama sobe.
    const key = `tmp-panorama/${roomId}-${Date.now()}.${ext}`;

    const uploadUrl = await getSignedUrl(
      r2Client,
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: fileType }),
      { expiresIn: 300 }
    );

    return NextResponse.json({ success: true, uploadUrl, key, contentType: fileType });
  } catch (error: any) {
    console.error('UPLOAD PANORAMA PRESIGN ERROR:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Greška tokom pripreme upload-a.' },
      { status: 500 }
    );
  }
}

// R2 key iz snimljenog CDN URL-a (skida bazu i ?v=...) - isti obrazac kao
// r2KeyFromUrl u api/admin/tours/route.ts.
function r2KeyFromUrl(url: string | null | undefined, cdnBase: string): string | null {
  if (!url) return null;
  const base = cdnBase.replace(/\/+$/, '') + '/';
  if (!url.startsWith(base)) return null;
  return url.slice(base.length).split('?')[0];
}

/**
 * ============================================================
 * DELETE /api/upload-panorama
 * ============================================================
 * Uklanja panoramu sobe (pogrešno otpremljena slika, ili admin više ne želi
 * baš tu) - soba se vraća u stanje "bez panorame", spremna za novi upload.
 * Briše i fajlove na R2 (panorama + sličica), best effort.
 *
 * Body (JSON): { roomId: string }
 */
export async function DELETE(req: Request) {
  try {
    const ctx = await requireAdmin(req);
    if (!ctx.ok) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });

    const body = await req.json().catch(() => ({}));
    const roomId = typeof body.roomId === 'string' ? body.roomId : '';
    if (!roomId) {
      return NextResponse.json({ success: false, error: 'Nedostaje roomId.' }, { status: 400 });
    }

    const { data: room, error: roomErr } = await ctx.supabase
      .from('rooms')
      .select('id, panorama_url_cf, preview_url')
      .eq('id', roomId)
      .maybeSingle();

    if (roomErr || !room) {
      return NextResponse.json({ success: false, error: `Soba ${roomId} nije pronađena.` }, { status: 404 });
    }

    const bucket = process.env.R2_BUCKET_NAME;
    const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;
    if (bucket && cdnUrl) {
      const keys = [
        r2KeyFromUrl((room as any).panorama_url_cf, cdnUrl),
        r2KeyFromUrl((room as any).preview_url, cdnUrl)
      ].filter((k): k is string => Boolean(k));

      if (keys.length > 0) {
        try {
          await r2Client.send(
            new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.map((Key) => ({ Key })) } })
          );
        } catch (r2Error) {
          console.error('DELETE PANORAMA: R2 brisanje nije uspelo:', r2Error);
        }
      }
    }

    const { error: updateError } = await ctx.supabase
      .from('rooms')
      .update({ panorama_url_cf: null, panorama_url: null, preview_url: null })
      .eq('id', roomId);

    if (updateError) {
      return NextResponse.json({ success: false, error: `Upis u bazu nije uspeo: ${updateError.message}` }, { status: 500 });
    }

    refreshPublicPages();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE PANORAMA ERROR:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Greška tokom brisanja panorame.' },
      { status: 500 }
    );
  }
}
