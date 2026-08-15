import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `pg` si otevira TCP spojeni a nacita nativni doplnky (pg-native, kdyz je
  // po ruce) — zabaleni do bundlu mu rozbije resolver. Musi zustat externi.
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
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
