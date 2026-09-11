import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "./lib/site";

// Fontovi se preuzimaju pri build-u i služe sa našeg domena: nema čekanja na
// Google-ov CSS pre prvog prikaza, tekst ne skače dok font stiže, a IP adresa
// posetioca ne odlazi Google-u. Latin-ext nosi č, ć, š, ž, đ; ćirilica za
// ruski tekst u turama postoji, ali se skida tek kad je stranica zatraži.
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jakarta",
  display: "swap",
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

// Panorame i sličice tura stižu sa R2 CDN-a. Preconnect otvara vezu (DNS,
// TLS) unapred, pa se to čekanje ne plaća onda kad se slika stvarno zatraži.
// Dve veze, jer ih pregledač ne deli: sličice na početnoj su obične <img>
// (bez CORS-a), a Pannellum panorame traži sa CORS-om (crossOrigin).
function cdnOrigin(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_CDN_URL || '').origin;
  } catch {
    return null;
  }
}

// Biblioteka za 360° prikaz (Pannellum) se ovde više ne učitava - treba samo
// turi, pa je tura sama najavljuje i učitava (app/tour/[slug]/pannellum.ts).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cdn = cdnOrigin();

  return (
    <html lang="sr" className={`${inter.variable} ${jakarta.variable}`}>
      <head>
        {cdn && <link rel="preconnect" href={cdn} />}
        {cdn && <link rel="preconnect" href={cdn} crossOrigin="anonymous" />}
      </head>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
