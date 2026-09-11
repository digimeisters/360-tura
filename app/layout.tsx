import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { SITE_NAME, SITE_URL } from "./lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Kvadrat360 — 360° virtuelne ture za nekretnine',
    template: '%s | Kvadrat360'
  },
  description:
    'Profesionalne 360° virtuelne ture i HDR fotografija nekretnina, sa audio vodičem na srpskom, engleskom, nemačkom i ruskom.',
  applicationName: SITE_NAME,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'sr_RS',
    url: SITE_URL
  },
  twitter: { card: 'summary_large_image' }
};

// Panorame stižu sa R2 CDN-a, a prva se traži tek kad se Pannellum podigne.
// Preconnect otvara vezu (DNS, TLS) unapred, pa se to čekanje ne plaća onda
// kad se slika stvarno zatraži.
function cdnOrigin(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_CDN_URL || '').origin;
  } catch {
    return null;
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cdn = cdnOrigin();

  return (
    <html lang="sr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {/* Same fajlove isporučuje gstatic, ne googleapis - bez ovoga se
            preconnect troši na pogrešan domen. */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {cdn && <link rel="preconnect" href={cdn} crossOrigin="anonymous" />}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap"
        />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Script 
          src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js" 
          strategy="beforeInteractive" 
        />
      </body>
    </html>
  );
}