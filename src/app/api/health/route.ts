import { NextResponse } from "next/server";

/**
 * Lightweight uptime probe for Sentry Uptime Monitoring.
 *
 * Point the monitor here instead of `/`: the root redirects through
 * `/dashboard` to `/login`, which renders the full i18n bundle (~366 KB)
 * on every check and was consuming the Vercel Fast Origin Transfer quota.
 * This handler stays outside the proxy matcher and the root layout, so each
 * check costs one tiny function invocation and a few bytes of transfer.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
