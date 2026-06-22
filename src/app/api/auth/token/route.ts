import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { refreshSessionFromCookies } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/same-origin";

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
export async function GET(req: NextRequest) {
  if (!isSameOrigin(req)) {
    // Return an empty 403 — no body, no hints about what is being protected.
    return new NextResponse(null, { status: 403 });
  }

  const cookieStore = await cookies();
  const token =
    cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ??
    (await refreshSessionFromCookies(cookieStore));

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
