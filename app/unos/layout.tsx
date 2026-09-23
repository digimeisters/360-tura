import type { Metadata } from 'next';

// Radni ekran, ne stranica za pretragu: Google sme da je otvori, ali ne i da
// je prikaže u rezultatima. Namerno nije i u robots.ts (disallow) - tada
// Google ne bi ni pročitao ovu zabranu, pa bi link mogao da se pojavi u
// rezultatima bez opisa.
export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
