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
