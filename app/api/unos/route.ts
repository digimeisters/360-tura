import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client } from '@/app/lib/r2';
import { processTourForm, FormAnswers } from '@/app/lib/tourFromForm';
import { uniqueSlug } from '@/app/lib/slug';
import { rateLimit, tooManyRequests } from '@/app/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Kod je jedna zajednička vrednost koju agencija dobija i dalje prosleđuje,
// pa vremenom procuri. Bez brojanja pokušaja pogađanje je besplatno.
const CODE_ATTEMPT_LIMIT = 5;
const CODE_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

// Uspešno slanje pokreće Gemini obradu i upload na R2 - ni sa ispravnim kodom
// se to ne radi u petlji.
const SUBMIT_LIMIT = 10;
const SUBMIT_WINDOW_MS = 60 * 60 * 1000;

const MAX_FLOORPLAN_BYTES = 10 * 1024 * 1024;
// Bez PDF-a: modal "Skica" crta tlocrt kao <img>, pa bi PDF ostao prazan
// okvir. Ako agent ima samo PDF, treba mu slika - bolje da to sazna pri
// slanju nego da otkrije prazan modal.
const FLOORPLAN_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

function codeMatches(provided: string): boolean {
  const expected = process.env.FORM_ACCESS_CODE || '';
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  try {
    if (!process.env.FORM_ACCESS_CODE) {
      console.error('[api/unos] FORM_ACCESS_CODE nije podešen.');
      return NextResponse.json(
        { success: false, error: 'Unos nije podešen na serveru.' },
        { status: 503 }
      );
    }

    const submitLimit = rateLimit(req, 'unos-submit', SUBMIT_LIMIT, SUBMIT_WINDOW_MS);
    if (!submitLimit.ok) {
      return tooManyRequests(
        submitLimit.retryAfterSec,
        'Previše slanja u kratkom roku. Pokušajte ponovo kasnije.'
      );
    }

    const formData = await req.formData();

    const code = String(formData.get('accessCode') || '');
    if (!codeMatches(code)) {
      // Brojimo samo PROMAŠENE pokušaje: agent koji pravi turu za turom ne
      // sme da se sapliće o brojač, a onaj ko pogađa kod ima pet pokušaja na
      // svakih petnaest minuta.
      const attempt = rateLimit(req, 'unos-code', CODE_ATTEMPT_LIMIT, CODE_ATTEMPT_WINDOW_MS);
      if (!attempt.ok) {
        return tooManyRequests(
          attempt.retryAfterSec,
          'Previše pogrešnih pokušaja. Sačekajte pa probajte ponovo.'
        );
      }

      // Namerno ista poruka i za prazan i za pogrešan kod.
      return NextResponse.json(
        { success: false, error: 'Kod za slanje nije ispravan.', field: 'accessCode' },
        { status: 401 }
      );
    }

    const rawAnswers = formData.get('answers');
    if (typeof rawAnswers !== 'string') {
      return NextResponse.json({ success: false, error: 'Nedostaju odgovori.' }, { status: 400 });
    }

    const answers = JSON.parse(rawAnswers) as FormAnswers;

    const title = String(answers['Naslov oglasa'] || '').trim();
    if (!title) {
      return NextResponse.json({ success: false, error: 'Naslov je obavezan.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, error: 'Nedostaje konfiguracija.' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Slug se izvodi na serveru, pre AI obrade - agent ga ne kuca, a AI ga
    // ne izmišlja, pa je link predvidiv i sigurno slobodan.
    const { data: existing } = await supabase.from('tours').select('slug');
    const taken = new Set((existing ?? []).map((t) => t.slug.toLowerCase()));
    const slug = uniqueSlug(title, taken);

    const processed = await processTourForm(answers, slug);

    // Tlocrt ide na R2 tek kad je poznat slug, da ime fajla bude čitljivo.
    let floorplanUrl: string | null = null;
    const floorplan = formData.get('floorplan');
    if (floorplan instanceof File && floorplan.size > 0) {
      const ext = FLOORPLAN_TYPES[floorplan.type];
      const bucket = process.env.R2_BUCKET_NAME;
      const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;

      if (!ext) {
        return NextResponse.json(
          { success: false, error: 'Tlocrt mora biti slika (JPG, PNG ili WEBP). PDF se ne prikazuje u turi.' },
          { status: 400 }
        );
      }
      if (floorplan.size > MAX_FLOORPLAN_BYTES) {
        return NextResponse.json(
          { success: false, error: 'Tlocrt je veći od 10MB.' },
          { status: 400 }
        );
      }
      if (bucket && cdnUrl) {
        const key = `${slug}-tlocrt.${ext}`;
        await r2Client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: Buffer.from(await floorplan.arrayBuffer()),
            ContentType: floorplan.type
          })
        );
        floorplanUrl = `${cdnUrl.replace(/\/+$/, '')}/${key}`;
      }
    }

    const { error } = await supabase.from('tours').insert({
      slug: processed.slug,
      // Agent je poslao samo podatke - sobe i panorame tek dolaze. Tura čeka
      // u pripremi dok je ti ne objaviš iz /admin/ture.
      published: false,
      title: processed.title,
      title_i18n: processed.title_i18n,
      about_text_i18n: processed.about_text_i18n,
      category: processed.category,
      property_type: processed.property_type,
      advertiser_type: processed.advertiser_type,
      agency_name: processed.agency_name,
      agent_name: processed.agent_name,
      agent_phone: processed.agent_phone,
      agent_email: processed.agent_email,
      address: processed.address,
      location_map_url: processed.location_map_url,
      floorplan_url: floorplanUrl,
      faq_1_i18n: processed.faq_1_i18n,
      faq_2_i18n: processed.faq_2_i18n,
      faq_3_i18n: processed.faq_3_i18n,
      faq_4_i18n: processed.faq_4_i18n,
      faq_5_i18n: processed.faq_5_i18n,
      target_languages: processed.target_languages
    });

    if (error) {
      console.error('[api/unos] insert failed:', error.message);
      return NextResponse.json({ success: false, error: 'Tura nije sačuvana.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      slug: processed.slug,
      languages: processed.target_languages
    });
  } catch (err) {
    console.error('[api/unos] unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Neočekivana greška. Pokušajte ponovo.' },
      { status: 500 }
    );
  }
}
