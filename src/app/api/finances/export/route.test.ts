// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
  }),
}));

const fetchMock = vi.fn();

import { GET } from "./route";

function req(query: string) {
  return new NextRequest(`http://localhost:3001/api/finances/export?${query}`);
}

describe("GET /api/finances/export", () => {
  beforeEach(() => {
    jar.clear();
    jar.set(ACCESS_TOKEN_COOKIE, "tok");
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("rejects an unsupported format with 400", async () => {
    const res = await GET(req("clubId=7&year=2026&format=csv"));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("defaults to xlsx upstream", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const res = await GET(req("clubId=7&year=2026"));
    expect(res.status).toBe(200);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("format")).toBe("xlsx");
    expect(res.headers.get("content-type")).toContain("spreadsheetml");
  });

  it("forwards pdf with filters and the server disposition", async () => {
    fetchMock.mockResolvedValue(
      new Response("pdf", {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": 'attachment; filename="finanzas-c-2026-03.pdf"',
        },
      }),
    );
    const res = await GET(req("clubId=7&year=2026&month=3&club_section_id=12&format=pdf"));
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toMatch(/\/clubs\/7\/finances\/export$/);
    expect(url.searchParams.get("format")).toBe("pdf");
    expect(url.searchParams.get("month")).toBe("3");
    expect(url.searchParams.get("club_section_id")).toBe("12");
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain(".pdf");
  });

  it("returns 401 without a token", async () => {
    jar.clear();
    const res = await GET(req("clubId=7&year=2026&format=pdf"));
    expect(res.status).toBe(401);
  });
});
