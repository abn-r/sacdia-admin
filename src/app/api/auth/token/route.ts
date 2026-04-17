import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";

/**
 * H-03 fix: validate that the request originates from the same origin before
 * returning the JWT. This prevents a cross-origin page (or XSS payload that
 * loaded a cross-origin script) from calling this endpoint and extracting the
 * token from the httpOnly cookie.
 *
 * Same-origin browser fetches send an `Origin` header that matches the app
 * host. Server-side Next.js calls (e.g. from middleware or other route
 * handlers) do NOT hit this route — they read the cookie directly via
 * `next/headers`. This check therefore only affects client-side callers, and
 * same-origin callers always pass it.
 */
function isSameOrigin(req: NextRequest): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  // Derive the allowed origin from NEXT_PUBLIC_APP_URL if set, otherwise fall
  // back to the Host header so the check works in any environment (local dev,
  // staging, production) without extra configuration.
  const allowedOrigin = appUrl
    ? new URL(appUrl).origin
    : (() => {
        const host = req.headers.get("host");
        return host ? `${req.nextUrl.protocol}//${host}` : null;
      })();

  if (!allowedOrigin) {
    // Cannot determine allowed origin — reject to be safe.
    return false;
  }

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  // A same-origin browser fetch always sends an Origin header.
  if (origin) {
    return origin === allowedOrigin;
  }

  // Some browsers omit Origin on same-origin navigations but include Referer.
  if (referer) {
    try {
      return new URL(referer).origin === allowedOrigin;
    } catch {
      return false;
    }
  }

  // Neither Origin nor Referer present → could be a non-browser client,
  // a curl call, or certain browser extensions. Reject to be safe.
  return false;
}

export async function GET(req: NextRequest) {
  if (!isSameOrigin(req)) {
    // Return an empty 403 — no body, no hints about what is being protected.
    return new NextResponse(null, { status: 403 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { token: null },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { token },
    { headers: { "Cache-Control": "no-store" } },
  );
}
