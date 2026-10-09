import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `pg` si otevira TCP spojeni a nacita nativni doplnky — zabaleni do bundlu
  // mu rozbije resolver. Musi zustat externi (stejne jako v citadela-app).
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
  poweredByHeader: false,
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
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
