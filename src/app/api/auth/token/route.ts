import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ token: null }, { status: 401 });
  }

  return NextResponse.json({ token });
}
