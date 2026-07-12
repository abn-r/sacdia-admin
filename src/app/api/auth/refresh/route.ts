import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  refreshSessionFromCookies,
  sanitizeDashboardNextPath,
} from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/same-origin";

function getSafeNextPath(request: NextRequest): string {
  const rawNext = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  return sanitizeDashboardNextPath(rawNext) ?? "/dashboard";
}

export async function GET(request: NextRequest) {
  const token = await refreshSessionFromCookies();
  const next = getSafeNextPath(request);

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(new URL(next, request.url));
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
