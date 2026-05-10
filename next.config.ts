import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// ---------------------------------------------------------------------------
// Content Security Policy
// ---------------------------------------------------------------------------
//
// WHAT IS ALLOWED AND WHY
//
// script-src:
//   'self'          — app's own JS bundles
//   'unsafe-inline' — Next.js 16 inlines a small bootstrap script in <head>
//                     that cannot be removed without nonce-based CSP (bigger
//                     refactor involving middleware). Required in production.
//   'unsafe-eval'   — Next.js dev server uses eval() for hot-module reload.
//                     REMOVED in production. Never present in prod builds.
//
// style-src:
//   'self' 'unsafe-inline' — Tailwind + shadcn/ui inject styles at runtime.
//
// img-src:
//   data:            — inline SVG data-URIs used by shadcn/ui icons
//   blob:            — object URLs created by browser for uploaded files
//   lh3.googleusercontent.com  — Google OAuth profile pictures
//   avatars.githubusercontent.com — GitHub OAuth profile pictures
//   pub-*.r2.dev     — Cloudflare R2 public CDN (class docs, images)
//   *.r2.cloudflarestorage.com — Cloudflare R2 private endpoint
//
// font-src:
//   'self' data:     — next/font/google downloads Geist + Instrument Serif at
//                      BUILD TIME and self-hosts them. No runtime Google Fonts
//                      requests are made, so no external font origin is needed.
//
// connect-src:
//   'self'           — Next.js API routes + HMR websocket in dev
//   NEXT_PUBLIC_API_URL — NestJS backend API. Sourced from the env var at
//                         build time so the value is baked into the header.
//                         Falls back to localhost:3000 to match client.ts.
//
// frame-ancestors 'none' — redundant with X-Frame-Options: DENY but belt+
//                           suspenders (CSP takes precedence in modern browsers).
//
// REPORT-ONLY mode (for future use):
//   Swap the header name to "Content-Security-Policy-Report-Only" and add
//   `report-uri /api/csp-report` to collect violations without enforcement.
//   This is useful when evaluating nonce-based CSP before switching.
// ---------------------------------------------------------------------------

const isDev = process.env.NODE_ENV === "development";

const backendOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return "http://localhost:3000";
  try {
    return new URL(raw).origin;
  } catch {
    return "http://localhost:3000";
  }
})();

const scriptSrc = isDev
  ? `'self' 'unsafe-inline' 'unsafe-eval'`
  : `'self' 'unsafe-inline'`;

const cspValue = [
  `default-src 'self'`,
  `script-src ${scriptSrc}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://pub-c8aa231ae66c46ff96fc5e811994d9d2.r2.dev https://pub-c0e79f5fa4634581867fab5b0fed605c.r2.dev https://5da196c051c48c7a4ebeea275a2b23d1.r2.cloudflarestorage.com`,
  `font-src 'self' data:`,
  `connect-src 'self' ${backendOrigin} https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
]
  .join("; ")
  .concat(";");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy", value: cspValue },
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
        pathname: "/**",
      },
      // Cloudflare R2 — public CDN bucket (member photos, club assets)
      {
        protocol: "https",
        hostname: "pub-c0e79f5fa4634581867fab5b0fed605c.r2.dev",
        pathname: "/**",
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

export default withSentryConfig(withNextIntl(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "sacdia-6g",

  project: "sacdia-admin",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
