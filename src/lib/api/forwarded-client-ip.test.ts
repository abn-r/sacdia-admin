// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  headers: {} as Record<string, string>,
  throws: false,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => {
    if (state.throws) throw new Error("outside request scope");
    return new Headers(state.headers);
  }),
  cookies: vi.fn(async () => ({ get: () => undefined })),
}));

import { apiRequest } from "./client";
import { getForwardedClientIpHeaders, isIpLiteral } from "./forwarded-client-ip";

beforeEach(() => {
  state.headers = {};
  state.throws = false;
  process.env.ADMIN_PROXY_SECRET = "s3cret";
});

afterEach(() => {
  delete process.env.ADMIN_PROXY_SECRET;
  vi.unstubAllGlobals();
});

describe("isIpLiteral", () => {
  it("accepts IPv4 and IPv6, rejects junk", () => {
    for (const ok of ["203.0.113.7", "::1", "2001:db8::1", "::ffff:1.2.3.4"]) {
      expect(isIpLiteral(ok)).toBe(true);
    }
    for (const bad of ["", "abc", "999.1.1.1", "1.2.3", "1:2:3", ":::", "1::2::3", "evil, 1.1.1.1"]) {
      expect(isIpLiteral(bad)).toBe(false);
    }
  });
});

describe("getForwardedClientIpHeaders", () => {
  it("sends both headers with x-real-ip", async () => {
    state.headers = { "x-real-ip": " 198.51.100.4 ", "x-forwarded-for": "203.0.113.7" };
    expect(await getForwardedClientIpHeaders()).toEqual({
      "x-sacdia-client-ip": "198.51.100.4",
      "x-sacdia-proxy-secret": "s3cret",
    });
  });

  it("uses the first x-forwarded-for entry", async () => {
    state.headers = { "x-forwarded-for": "203.0.113.7, 10.0.0.1" };
    expect((await getForwardedClientIpHeaders())["x-sacdia-client-ip"]).toBe("203.0.113.7");
  });

  it("skips forwarding for an invalid IP", async () => {
    state.headers = { "x-real-ip": "not-an-ip" };
    expect(await getForwardedClientIpHeaders()).toEqual({});
  });

  it("skips forwarding when the secret is unset", async () => {
    delete process.env.ADMIN_PROXY_SECRET;
    state.headers = { "x-real-ip": "198.51.100.4" };
    expect(await getForwardedClientIpHeaders()).toEqual({});
  });

  it("skips forwarding when headers() throws", async () => {
    state.throws = true;
    expect(await getForwardedClientIpHeaders()).toEqual({});
  });
});

describe("apiRequest (server)", () => {
  function stubFetch() {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  function sentHeaders(fetchMock: ReturnType<typeof stubFetch>) {
    const calls = fetchMock.mock.calls as unknown as Array<[string, { headers: Headers }]>;
    return calls[0]![1].headers;
  }

  it("adds the forwarding headers to the backend request", async () => {
    state.headers = { "x-real-ip": "198.51.100.4" };
    const fetchMock = stubFetch();
    await apiRequest("/auth/login", { method: "POST", body: { a: 1 } });
    const h = sentHeaders(fetchMock);
    expect(h.get("x-sacdia-client-ip")).toBe("198.51.100.4");
    expect(h.get("x-sacdia-proxy-secret")).toBe("s3cret");
  });

  it("still makes the request without headers when headers() throws", async () => {
    state.throws = true;
    const fetchMock = stubFetch();
    await apiRequest("/auth/me");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const h = sentHeaders(fetchMock);
    expect(h.get("x-sacdia-client-ip")).toBeNull();
    expect(h.get("x-sacdia-proxy-secret")).toBeNull();
  });
});
