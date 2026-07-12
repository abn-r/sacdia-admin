import type { NextRequest } from "next/server";

export function isSameOrigin(req: NextRequest): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const allowedOrigin = (() => {
    if (appUrl) {
      try {
        return new URL(appUrl).origin;
      } catch {
        return null;
      }
    }

    const host = req.headers.get("host");
    return host ? `${req.nextUrl.protocol}//${host}` : null;
  })();

  if (!allowedOrigin) {
    return false;
  }

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  if (origin) {
    return origin === allowedOrigin;
  }

  if (referer) {
    try {
      return new URL(referer).origin === allowedOrigin;
    } catch {
      return false;
    }
  }

  return false;
}
