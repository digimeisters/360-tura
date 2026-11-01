import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Samo za lokalni razvoj: telefon na istom Wi-Fi-ju sme da otvori dev
  // server (npr. http://192.168.0.29:3000). Na pravi sajt ne utiče.
  allowedDevOrigins: ['192.168.*.*'],
  // Slike zgrada novogradnje (2560 px, ~700 KB) telefon dobija smanjene preko
  // /_next/image (ProjectSelector, getImageProps). Samo fascikla projekata na
  // našem CDN-u - ostale adrese ne mogu da troše smanjivanje. Izuzetak su
  // telefonske panorame (*-panorama-m.webp): sekcija "Od tlocrta do ture" na
  // početnoj ih uzima smanjene (app/lib/tourStory.ts), jer pune imaju ~450 KB.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.kvadrat360.com', pathname: '/projekti/**', search: '' },
      { protocol: 'https', hostname: 'cdn.kvadrat360.com', pathname: '/*-panorama-m.webp', search: '' }
    ],
    qualities: [75],
  },
  // Zaštitna zaglavlja. Strane sa nalogom ili tajnim linkom (admin, prodaja,
  // unos, izveštaji, odjava) ne smeju u tuđi <iframe> - lažna strana bi mogla
  // da "podmetne" klik. Ture i /novogradnja/.../ugradnja namerno ostaju
  // ugradive (sajtovi agencija i investitora), pa ovde nisu.
  async headers() {
    const noFrame = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" }
    ];
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
        ]
      },
      ...['/admin/:path*', '/prodaja/:path*', '/unos', '/izvestaj/:path*', '/obavestenja/:path*'].map((source) => ({
        source,
        headers: noFrame
      }))
    ];
  },
  // Kratka adresa procene za oglase i štampu; strana živi među alatima.
  // ?tip=izdavanje i UTM parametri prelaze uz preusmerenje.
  async redirects() {
    return [
      { source: '/procena-vrednosti', destination: '/alati/procena-vrednosti', permanent: true },
      // /admin nema svoj sadržaj - ulaz u admin je spisak tura (pre iscrtavanja, pravi 307).
      { source: '/admin', destination: '/admin/ture', permanent: false }
    ];
  },
};

export default nextConfig;
