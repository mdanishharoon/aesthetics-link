import type { NextConfig } from "next";

type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

function buildRemotePatterns(): RemotePattern[] {
  const patterns: RemotePattern[] = [
    { protocol: "https", hostname: "images.unsplash.com" },
    { protocol: "https", hostname: "picsum.photos" },
  ];

  const storeUrl = process.env.WOOCOMMERCE_STORE_URL;
  if (storeUrl) {
    try {
      const { hostname } = new URL(storeUrl);
      patterns.push({ protocol: "https", hostname });
    } catch {
      // Invalid URL — skip
    }
  }

  return patterns;
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: buildRemotePatterns(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
