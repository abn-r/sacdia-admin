import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE,
  AUTH_COOKIE_OPTIONS,
  REFRESH_FAILED_COOKIE,
  REFRESH_FAILED_MAX_AGE_SECONDS,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth/cookies";
import {
  attemptSessionRefresh,
  LOGIN_REASON_REFRESH_UNAVAILABLE,
  refreshSessionFromCookies,
  sanitizeDashboardNextPath,
  type RefreshSessionResult,
} from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/same-origin";

function getSafeNextPath(request: NextRequest): string {
  const rawNext = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  return sanitizeDashboardNextPath(rawNext) ?? "/dashboard";
}

async function attemptRefreshForRedirect(): Promise<RefreshSessionResult> {
  try {
    return await attemptSessionRefresh();
  } catch {
    // Network failure reaching the backend: same handling as a 5xx.
    return { status: "unavailable" };
  }
}

export async function GET(request: NextRequest) {
  const result = await attemptRefreshForRedirect();
  const next = getSafeNextPath(request);

  if (result.status === "refreshed") {
    return NextResponse.redirect(new URL(next, request.url));
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", next);

  if (result.status === "unavailable") {
    // Keep the refresh cookie (the backend may recover) but mark the failure so
    // the login layout renders the form instead of redirecting back here.
    loginUrl.searchParams.set("reason", LOGIN_REASON_REFRESH_UNAVAILABLE);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set(REFRESH_FAILED_COOKIE, "1", {
      ...AUTH_COOKIE_OPTIONS,
      maxAge: REFRESH_FAILED_MAX_AGE_SECONDS,
    });
    return response;
  }

  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  return response;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return new NextResponse(null, { status: 403 });
  }

  const cookieStore = await cookies();
  const token = await refreshSessionFromCookies(cookieStore);

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
