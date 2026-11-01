import type { Metadata } from 'next';
import { UnsubscribeButton } from './UnsubscribeButton';

/**
 * /obavestenja/odjava?w=<prijava>&s=<potpis> - odjava sa "Obavesti me"
 * (link iz mejla "Stan je ponovo slobodan"). Odjava je tek na klik: programi
 * za proveru mejla sami otvaraju linkove, pa GET ne sme ništa da menja.
 */

export const metadata: Metadata = {
  title: 'Odjava sa obaveštenja',
  robots: { index: false, follow: false }
};

type Props = { searchParams: Promise<{ w?: string; s?: string }> };

export default async function UnsubscribePage({ searchParams }: Props) {
  const { w = '', s = '' } = await searchParams;
  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '72px 20px', fontFamily: 'var(--font-body)', color: '#111113' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1.15, margin: '0 0 10px' }}>Odjava sa obaveštenja</h1>
      <p style={{ color: '#5B5D63', lineHeight: 1.6, margin: '0 0 22px' }}>
        Više vam nećemo javljati kad se stan oslobodi. Ako se predomislite, ponovo se upišite na kartici stana.
        <br />
        <span lang="en">You will no longer get emails when the apartment becomes available.</span>
      </p>
      <UnsubscribeButton w={w} s={s} />
    </main>
  );
}
