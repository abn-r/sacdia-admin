import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      // Google OAuth profile pictures
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      // GitHub OAuth profile pictures
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      // Cloudflare R2 — public CDN (honors images, PDFs, class documents)
      {
        protocol: "https",
        hostname: "pub-c8aa231ae66c46ff96fc5e811994d9d2.r2.dev",
      },
      // Cloudflare R2 — private S3-compatible endpoint (user profiles, secure documents)
      {
        protocol: "https",
        hostname: "5da196c051c48c7a4ebeea275a2b23d1.r2.cloudflarestorage.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
  },
};

export default nextConfig;
