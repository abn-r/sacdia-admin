import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockCookieGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mockCookieGet,
  })),
}));

async function loadRoute() {
  vi.resetModules();
  process.env.NEXT_PUBLIC_API_URL = "http://backend.test/api/v1";
  return import("./route");
}

describe("GET /api/evidence-review/pdf", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockCookieGet.mockReset();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it("streams the selected PDF through the admin app with inline headers", async () => {
    mockCookieGet.mockReturnValue({ value: "admin-token" });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "success",
            data: {
              id: 42,
              type: "class",
              files: [
                {
                  evidence_file_id: 2,
                  file_url: "https://signed-r2.example.com/doc.pdf?X-Amz-Signature=abc",
                  file_name: "doc.pdf",
                  file_type: "application/pdf",
                  uploaded_at: "2026-03-15T10:05:00.000Z",
                },
              ],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response("%PDF-1.7", {
          status: 200,
          headers: { "content-type": "application/octet-stream" },
        }),
      );

    const { GET } = await loadRoute();
    const response = await GET(
      new NextRequest(
        "http://localhost:3001/api/evidence-review/pdf?type=class&id=42&fileId=2",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      'inline; filename="doc.pdf"',
    );
    expect(await response.text()).toBe("%PDF-1.7");
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://backend.test/api/v1/evidence-review/class/42",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://signed-r2.example.com/doc.pdf?X-Amz-Signature=abc",
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "application/pdf" }),
      }),
    );
  });

  it("rejects requests without an admin token", async () => {
    mockCookieGet.mockReturnValue(undefined);

    const { GET } = await loadRoute();
    const response = await GET(
      new NextRequest(
        "http://localhost:3001/api/evidence-review/pdf?type=class&id=42&fileId=2",
      ),
    );

    expect(response.status).toBe(401);
  });
});
