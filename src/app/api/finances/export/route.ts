import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { API_BASE_URL } from "@/lib/api/client";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";

/**
 * Same-origin proxy of `GET /clubs/:clubId/finances/export`.
 * The access token lives in an httpOnly cookie, so the browser cannot call
 * the backend with it directly; this handler adds the Bearer header and
 * streams the xlsx/pdf back with the server's Content-Disposition (filename).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const clubId = Number(searchParams.get("clubId"));
  const year = Number(searchParams.get("year"));
  const format = searchParams.get("format") ?? "xlsx";

  if (!Number.isInteger(clubId) || clubId <= 0 || !Number.isInteger(year)) {
    return NextResponse.json({ message: "Invalid parameters" }, { status: 400 });
  }

  if (format !== "xlsx" && format !== "pdf") {
    return NextResponse.json({ message: "Invalid format" }, { status: 400 });
  }

  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const upstream = new URL(
    `${API_BASE_URL.replace(/\/$/, "")}/clubs/${clubId}/finances/export`,
  );
  upstream.searchParams.set("year", String(year));
  upstream.searchParams.set("format", format);
  const month = searchParams.get("month");
  if (month) upstream.searchParams.set("month", month);
  const sectionId = searchParams.get("club_section_id");
  if (sectionId) upstream.searchParams.set("club_section_id", sectionId);

  const response = await fetch(upstream, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
      },
    });
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    response.headers.get("content-type") ??
      (format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
  );
  const disposition = response.headers.get("content-disposition");
  if (disposition) headers.set("Content-Disposition", disposition);
  headers.set("Cache-Control", "no-store");

  return new NextResponse(response.body, { status: 200, headers });
}
