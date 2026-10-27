// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_FAILED_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth/cookies";
import { ApiError } from "@/lib/api/client";

const jar = new Map<string, string>();
const cookieStore = {
  get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
  set: (name: string, value: string) => {
    jar.set(name, value);
  },
  delete: (name: string) => {
    jar.delete(name);
  },
};

vi.mock("next/headers", () => ({
  cookies: async () => cookieStore,
  headers: async () => new Headers(),
}));

const apiRequestMock = vi.fn();
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

import { GET } from "./route";

function refreshRequest(next = "/dashboard/clubs") {
  return new NextRequest(
    `http://localhost:3001/api/auth/refresh?next=${encodeURIComponent(next)}`,
  );
}

function setCookieFor(response: Response, name: string) {
  return response.headers.getSetCookie().find((c) => c.startsWith(`${name}=`));
}

describe("GET /api/auth/refresh", () => {
  beforeEach(() => {
    jar.clear();
    jar.set(REFRESH_TOKEN_COOKIE, "refresh-token");
    apiRequestMock.mockReset();
  });

  it("redirects to next and clears the failure marker when refresh succeeds", async () => {
    jar.set(REFRESH_FAILED_COOKIE, "1");
    apiRequestMock.mockResolvedValue({ access_token: "new-access", refresh_token: "new-refresh" });

    const response = await GET(refreshRequest());

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3001/dashboard/clubs");
    expect(jar.get(ACCESS_TOKEN_COOKIE)).toBe("new-access");
    expect(jar.get(REFRESH_TOKEN_COOKIE)).toBe("new-refresh");
    expect(jar.has(REFRESH_FAILED_COOKIE)).toBe(false);
  });

  it.each([
    ["5xx", new ApiError("Service unavailable", 503, null)],
    ["429", new ApiError("Too many requests", 429, null)],
    ["network error", new TypeError("fetch failed")],
  ])("marks a transient failure (%s) and sends the user to login", async (_label, error) => {
    apiRequestMock.mockRejectedValue(error);

    const response = await GET(refreshRequest());
    const location = new URL(response.headers.get("location")!);

    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/dashboard/clubs");
    expect(location.searchParams.get("reason")).toBe("refresh_unavailable");
    expect(setCookieFor(response, REFRESH_FAILED_COOKIE)).toMatch(/Max-Age=60/);
    // The refresh token is kept so a retry can succeed once the backend recovers.
    expect(jar.get(REFRESH_TOKEN_COOKIE)).toBe("refresh-token");
    expect(setCookieFor(response, REFRESH_TOKEN_COOKIE)).toBeUndefined();
  });

  it("clears auth cookies and redirects to login when the refresh token is rejected", async () => {
    apiRequestMock.mockRejectedValue(new ApiError("Unauthorized", 401, null));

    const response = await GET(refreshRequest());
    const location = new URL(response.headers.get("location")!);

    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("reason")).toBeNull();
    expect(jar.has(REFRESH_TOKEN_COOKIE)).toBe(false);
    expect(setCookieFor(response, REFRESH_TOKEN_COOKIE)).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/);
    expect(setCookieFor(response, ACCESS_TOKEN_COOKIE)).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/);
    expect(setCookieFor(response, REFRESH_FAILED_COOKIE)).toBeUndefined();
  });
});
