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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
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