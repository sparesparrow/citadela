import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 je nativni modul — Next ho nesmi zabalit do bundlu,
  // jinak adapter dostane rozbitou instanci a kazdy dotaz spadne.
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.booking.com" },
      { protocol: "https", hostname: "assets.worhot.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
