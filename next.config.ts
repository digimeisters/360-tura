import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Samo za lokalni razvoj: telefon na istom Wi-Fi-ju sme da otvori dev
  // server (npr. http://192.168.0.29:3000). Na pravi sajt ne utiče.
  allowedDevOrigins: ['192.168.*.*'],
};

export default nextConfig;