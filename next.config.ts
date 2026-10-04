import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Samo za lokalni razvoj: telefon na istom Wi-Fi-ju sme da otvori dev
  // server (npr. http://192.168.0.29:3000). Na pravi sajt ne utiče.
  allowedDevOrigins: ['192.168.*.*'],
  // Slike zgrada novogradnje (2560 px, ~700 KB) telefon dobija smanjene preko
  // /_next/image (ProjectSelector, getImageProps). Samo fascikla projekata na
  // našem CDN-u - ostale adrese ne mogu da troše smanjivanje.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.kvadrat360.com', pathname: '/projekti/**', search: '' }],
    qualities: [75],
  },
};

export default nextConfig;
