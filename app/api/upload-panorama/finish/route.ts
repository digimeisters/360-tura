import { NextResponse } from 'next/server';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Client } from '@/app/lib/r2';
import { refreshPublicPages } from '@/app/lib/revalidatePublic';
import { generatePanoramaPreview, convertPanoramaToWebp } from '@/app/lib/panoramaPreview';
import { requireAdmin } from '@/app/lib/adminAuth';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * ============================================================
 * POST /api/upload-panorama/finish  (KORAK 2 - obrada)
 * ============================================================
 * Poziva se POSLE što je admin panel već otpremio sirov fajl direktno na
 * R2 preko potpisanog URL-a iz KORAKA 1 (vidi ../route.ts za objašnjenje
 * zašto je upload podeljen na dva koraka - Vercel-ov limit od 4.5MB po
 * telu zahteva).
 *
 * Ova ruta preuzima taj privremeni fajl NAZAD sa R2 (server -> R2 poziv,
 * na koji se limit tela zahteva NE odnosi - on važi samo za ono što
 * pregledač šalje OVOJ funkciji), pretvara ga u WebP, pravi sličicu i tek
 * onda upisuje konačan URL u bazu - identična obrada kao pre, samo je
 * sirovi fajl stigao drugim putem.
 *
 * Body (JSON): { roomId: string, key: string }
 */
export async function POST(req: Request) {
  let bucket: string | undefined;
  let tmpKey: string | undefined;

  try {
    const ctx = await requireAdmin(req);
    if (!ctx.ok) {
      return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });
    }

    bucket = process.env.R2_BUCKET_NAME;
    const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;

    if (!bucket || !cdnUrl) {
      return NextResponse.json(
        { success: false, error: 'Nedostaju R2_BUCKET_NAME ili NEXT_PUBLIC_CDN_URL environment varijable.' },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const roomId = typeof body.roomId === 'string' ? body.roomId : '';
    const key = typeof body.key === 'string' ? body.key : '';
    tmpKey = key;

    if (!roomId || !key) {
      return NextResponse.json({ success: false, error: 'Nedostaje roomId ili key.' }, { status: 400 });
    }
    if (!key.startsWith(`tmp-panorama/${roomId}-`)) {
      return NextResponse.json({ success: false, error: 'Neispravan key.' }, { status: 400 });
    }

    const { data: room, error: roomErr } = await ctx.supabase
      .from('rooms')
      .select('id, tour_slug')
      .eq('id', roomId)
      .single();

    if (roomErr || !room) {
      return NextResponse.json(
        { success: false, error: `Soba ${roomId} nije pronađena u bazi.` },
        { status: 404 }
      );
    }

    const getResult = await r2Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!getResult.Body) {
      throw new Error('Fajl nije pronađen na R2 posle otpremanja - probajte ponovo.');
    }
    const buffer = Buffer.from(await getResult.Body.transformToByteArray());
    const ext = key.split('.').pop() || 'jpg';

    // Fajlovi idu u "folder" sa imenom ture (slug, ne naslov - naslov se
    // može menjati, slug ostaje isti ceo vek ture) da se u R2/Cloudflare
    // pregledu vidi na prvi pogled kojoj nekretnini pripadaju, umesto svih
    // panorama izmešanih u jednom ravnom spisku.
    const folder = (room as { tour_slug?: string }).tour_slug || 'ostalo';

    // Panorama se čuva kao WebP: isti kadar u punoj rezoluciji, ali oko 90%
    // manji od JPEG-a. Ako konverzija pukne, ide original - bolje teška
    // panorama nego nikakva.
    let finalBody: Buffer = buffer;
    let contentType = getResult.ContentType || 'image/jpeg';
    let finalKey = `${folder}/${roomId}-panorama.${ext}`;
    try {
      finalBody = await convertPanoramaToWebp(buffer);
      contentType = 'image/webp';
      finalKey = `${folder}/${roomId}-panorama.webp`;
    } catch (convertError) {
      console.error('UPLOAD PANORAMA: WebP konverzija nije uspela:', convertError);
    }

    await r2Client.send(
      new PutObjectCommand({ Bucket: bucket, Key: finalKey, Body: finalBody, ContentType: contentType })
    );

    const base = cdnUrl.replace(/\/+$/, '');

    // Ime fajla je izvedeno iz id-a sobe, pa zamena panorame piše preko iste
    // putanje. Bez oznake verzije URL ostaje identičan: React ne primeti
    // promenu i ne učita scenu ponovo, a i CDN i pretraživač i dalje drže
    // staru sliku. Vreme otpremanja u query-ju rešava oboje.
    const version = Date.now();
    const r2Url = `${base}/${finalKey}?v=${version}`;

    // Izvedene slike: mali isečak za share karticu i lakša panorama za
    // telefone. Ako neka pukne, original je već gore i soba radi - to su
    // dodaci koji ne smeju da obore upload.
    let previewUrl: string | null = null;
    try {
      const preview = await generatePanoramaPreview(buffer);
      const previewKey = `${folder}/${roomId}-preview.jpg`;
      await r2Client.send(
        new PutObjectCommand({ Bucket: bucket, Key: previewKey, Body: preview, ContentType: 'image/jpeg' })
      );
      previewUrl = `${base}/${previewKey}?v=${version}`;
    } catch (previewError) {
      console.error('UPLOAD PANORAMA: preview nije generisan:', previewError);
    }

    const updates: Record<string, string> = { panorama_url_cf: r2Url };
    if (previewUrl) updates.preview_url = previewUrl;

    const { error: updateError } = await ctx.supabase.from('rooms').update(updates).eq('id', roomId);
    if (updateError) {
      throw new Error(`Supabase upis greška: ${updateError.message}`);
    }

    // Privremeni fajl više ne treba - ne čekamo ovo da bi odgovor stigao
    // brže, greška ovde ne sme da obori uspešan upload.
    r2Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch((delErr) => {
      console.error('UPLOAD PANORAMA: brisanje privremenog fajla nije uspelo:', delErr);
    });

    // Nova sličica može biti naslovna slika ture na početnoj strani i na
    // spisku svih tura.
    refreshPublicPages();

    return NextResponse.json({
      success: true,
      roomId,
      r2Url,
      previewUrl,
      bytes: finalBody.length,
      originalBytes: buffer.length,
    });
  } catch (error: any) {
    console.error('UPLOAD PANORAMA FINISH ERROR:', error);
    // Neuspela obrada: pokušaj da počistiš privremeni fajl, da se tmp-panorama/
    // ne puni ostacima iz prekinutih upload-a.
    if (bucket && tmpKey) {
      r2Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: tmpKey })).catch(() => {});
    }
    return NextResponse.json(
      { success: false, error: error?.message || 'Greška tokom obrade panorame.' },
      { status: 500 }
    );
  }
}
