import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client } from '@/app/lib/r2';
import { requireAdmin } from '@/app/lib/adminAuth';

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
