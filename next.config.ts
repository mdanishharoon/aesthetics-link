import type { NextConfig } from "next";

type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

function buildRemotePatterns(): RemotePattern[] {
  const patterns: RemotePattern[] = [
    { protocol: "https", hostname: "images.unsplash.com" },
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
};

export default nextConfig;
