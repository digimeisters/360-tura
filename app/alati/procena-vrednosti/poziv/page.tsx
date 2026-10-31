import type { Metadata } from 'next';
import Link from 'next/link';
import { verifyCallbackToken } from '../../../lib/valuation/callbackToken';
import CallbackConfirm from './CallbackConfirm';

/**
 * /alati/procena-vrednosti/poziv?z=<leadId>&t=<token> - dugme "Da, pozovite
 * me za snimanje" iz mejla "Vaša procena" (app/lib/emails/valuationResult.ts).
 *
 * Link iz mejla samo otvara ovu stranu; poziv se traži tek klikom na dugme
 * (POST /api/valuation/callback). Programi za proveru linkova u mejlu
 * (Outlook, antivirus) otvaraju svaki link, pa GET ne sme sam ništa da
 * upiše.
 */

export const metadata: Metadata = {
  title: 'Poziv za snimanje ture',
  robots: { index: false, follow: false }
};

type Props = { searchParams: Promise<{ z?: string; t?: string }> };

export default async function CallbackPage({ searchParams }: Props) {
  const { z, t } = await searchParams;
  const valid = Boolean(z && t && /^[0-9a-f-]{36}$/i.test(z) && verifyCallbackToken(z, t.slice(0, 64)));

  return (
    <main style={{ minHeight: '100dvh', background: '#F1F1EC', color: '#111113', display: 'grid', placeItems: 'center', padding: '24px 16px', fontFamily: 'Urbanist, Arial, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '460px', background: '#FFFFFF', borderRadius: '18px', padding: '28px 24px', boxShadow: '0 10px 30px rgba(0,0,0,.06)' }}>
        <p style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#1E5AA8' }}>Kvadrat360</p>
        {valid ? (
          <>
            <h1 style={{ margin: 0, fontSize: '26px', lineHeight: 1.15, fontWeight: 800, letterSpacing: '-.02em' }}>Pozovite me za snimanje ture</h1>
            <p style={{ margin: '10px 0 20px', fontSize: '16px', lineHeight: 1.6, color: '#5B5D63' }}>
              Zovemo vas na broj iz procene da dogovorimo termin, bez obaveze. Tura je gotova za 24–48h od snimanja.
            </p>
            <CallbackConfirm leadId={z as string} token={(t as string).slice(0, 64)} />
          </>
        ) : (
          <>
            <h1 style={{ margin: 0, fontSize: '24px', lineHeight: 1.2, fontWeight: 800 }}>Link nije ispravan</h1>
            <p style={{ margin: '10px 0 20px', fontSize: '16px', lineHeight: 1.6, color: '#5B5D63' }}>
              Možda nije ceo kopiran iz mejla. Pozovite nas ili pišite preko kontakt forme.
            </p>
            <Link href="/#kontakt" style={{ fontWeight: 700, color: '#1E5AA8', textDecoration: 'none' }}>
              Kontakt forma
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
