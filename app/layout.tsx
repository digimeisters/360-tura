import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, Plus_Jakarta_Sans, Urbanist } from "next/font/google";
import "./globals.css";
import ScrollToTop from "../components/ScrollToTop";
import ErrorReporter from "../components/ErrorReporter";
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

// Kurziv sa serifima samo za naglašene reči u naslovima sajta (<em>).
const serif = Instrument_Serif({
  weight: "400",
  style: "italic",
  subsets: ["latin", "latin-ext"],
  variable: "--font-instrument",
  display: "swap",
});

// Urbanist: moderan, topao font za info kutije u turi.
const urbanist = Urbanist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-urbanist",
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

// viewportFit: 'cover' pušta sadržaj ispod notch-a/zaobljenih ivica
// (iPhone, neki Android telefoni) - bez ovoga env(safe-area-inset-*) uvek
// vraća 0, pa tura ne bi mogla da izbegne preklapanje sa tim ivicama.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
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
    <html lang="sr" className={`${inter.variable} ${jakarta.variable} ${serif.variable} ${urbanist.variable}`}>
      <head>
        {cdn && <link rel="preconnect" href={cdn} />}
        {cdn && <link rel="preconnect" href={cdn} crossOrigin="anonymous" />}
      </head>
      <body className="min-h-full flex flex-col">
        <ScrollToTop />
        {/* Prijavljuje greške u pregledaču vlasniku na Telegram (samo na pravom domenu). */}
        <ErrorReporter />
        {children}
      </body>
    </html>
  );
}
