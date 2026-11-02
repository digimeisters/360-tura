import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/adminAuth';
import { handleGenerateDraft } from './_actions/draft';
import { handleReviewDraft, handleTranslateStep } from './_actions/review';
import { handleGenerateVoice } from './_actions/voice';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * AI popunjavanje sobe (admin). Jedna adresa, radnja u body.action:
 * generate_draft (podrazumevano) -> _actions/draft.ts
 * review_draft, translate_step   -> _actions/review.ts
 * generate_voice                 -> _actions/voice.ts
 * Zajedničko (kontekst sobe, panorama, i18n tekst) je u _actions/shared.ts.
 */

type ActionType = 'generate_draft' | 'translate_step' | 'review_draft';

/**
 * ============================================================
 * POST HANDLER
 * ============================================================
 */
export async function POST(req: Request) {
  try {
    // Ruta troši Gemini kredit i prepisuje sadržaj sobe, pa je otvorena samo
    // prijavljenom administratoru.
    const ctx = await requireAdmin(req);
    if (!ctx.ok) {
      return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });
    }

    const body = await req.json();

    if (body.action === 'generate_voice') {
      return await handleGenerateVoice(body, ctx.supabase);
    }

    const action: ActionType =
      body.action === 'translate_step' || body.action === 'review_draft' ? body.action : 'generate_draft';

    if (action === 'translate_step') {
      return await handleTranslateStep(body);
    }
    if (action === 'review_draft') {
      return await handleReviewDraft(body);
    }

    return await handleGenerateDraft(body);
  } catch (error) {
    console.error('REAL ESTATE AI ERROR:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Greška tokom AI obrade.' },
      { status: 500 }
    );
  }
}
