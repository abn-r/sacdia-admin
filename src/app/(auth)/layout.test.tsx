// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { REFRESH_FAILED_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { ApiError } from "@/lib/api/client";

// Browser-like cookie jar shared by the layout (via next/headers) and the
// refresh route, so a full login -> refresh -> login round trip can be replayed.
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

const redirectMock = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

const apiRequestMock = vi.fn();
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

import AuthLayout from "./layout";
import { GET as refreshGET } from "@/app/api/auth/refresh/route";

const CHILDREN = "login-form";

/** Renders the auth layout; returns the redirect target, or null if it rendered. */
async function visitLogin(): Promise<string | null> {
  try {
    await AuthLayout({ children: CHILDREN });
    return null;
  } catch (error) {
    const match = /^NEXT_REDIRECT:(.*)$/.exec((error as Error).message);
    if (!match) throw error;
    return match[1];
  }
}

function applySetCookies(response: Response) {
  for (const header of response.headers.getSetCookie()) {
    const [pair, ...attributes] = header.split(";").map((part) => part.trim());
    const [name, value] = pair.split("=");
    const expired = attributes.some((attr) => /^max-age=0$/i.test(attr));
    if (expired || value === "") jar.delete(name);
    else jar.set(name, value);
  }
}

describe("AuthLayout", () => {
  beforeEach(() => {
    jar.clear();
    apiRequestMock.mockReset();
    redirectMock.mockClear();
  });

  it("renders the login form when there is no session at all", async () => {
    expect(await visitLogin()).toBeNull();
  });

  it("redirects to the refresh route when a refresh cookie exists", async () => {
    jar.set(REFRESH_TOKEN_COOKIE, "refresh-token");

    expect(await visitLogin()).toBe("/api/auth/refresh?next=%2Fdashboard");
  });

  it("renders the login form when the previous refresh attempt failed", async () => {
    jar.set(REFRESH_TOKEN_COOKIE, "refresh-token");
    jar.set(REFRESH_FAILED_COOKIE, "1");

    expect(await visitLogin()).toBeNull();
  });

  it("lands on /login once when the backend refresh fails (no redirect loop)", async () => {
    jar.set(REFRESH_TOKEN_COOKIE, "refresh-token");
    apiRequestMock.mockRejectedValue(new ApiError("Bad gateway", 502, null));

    const hops: string[] = [];
    let target = await visitLogin();

    while (target !== null && hops.length < 5) {
      hops.push(target);
      expect(target.startsWith("/api/auth/refresh")).toBe(true);

      const response = await refreshGET(
        new NextRequest(new URL(target, "http://localhost:3001")),
      );
      applySetCookies(response);
      const location = new URL(response.headers.get("location")!);
      hops.push(location.pathname + location.search);
      expect(location.pathname).toBe("/login");

      target = await visitLogin();
    }

    expect(hops).toEqual([
      "/api/auth/refresh?next=%2Fdashboard",
      "/login?next=%2Fdashboard&reason=refresh_unavailable",
    ]);
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
  });
});
