import { NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  await clearSession();

  const next = request.nextUrl.searchParams.get("next") || "/login";
  return NextResponse.redirect(new URL(next, request.url));
}

export async function POST() {
  await clearSession();
  return NextResponse.json({ success: true });
}
