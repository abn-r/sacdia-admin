import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "./types";

// ---------------------------------------------------------------------------
// Module mocks — must be declared at the top level so Vitest hoists them.
// ---------------------------------------------------------------------------

// Mock next/navigation's redirect. In production Next.js throws an internal
// NEXT_REDIRECT error; here we throw a plain Error so tests can catch it.
const mockRedirect = vi.fn((url: string): never => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

// Mock next/headers cookies — returns a controllable cookie store.
const mockCookieGet = vi.fn();
const mockCookieDelete = vi.fn();
const mockCookieSet = vi.fn();
const mockHeaderGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: mockCookieGet,
      set: mockCookieSet,
      delete: mockCookieDelete,
    }),
  ),
  headers: vi.fn(() =>
    Promise.resolve({
      get: mockHeaderGet,
    }),
  ),
}));

// Mock the API client — controls what /auth/me returns.
const mockApiRequest = vi.fn();

vi.mock("@/lib/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/client")>();
  return {
    ...actual,
    apiRequest: (...args: unknown[]) => mockApiRequest(...args),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "user-1",
    email: "admin@sacdia.org",
    roles: ["admin"],
    ...overrides,
  };
}

/**
 * Seeds the mock cookie store to return a token for the access-token cookie
 * and nothing (undefined) for everything else.
 */
function seedTokens({
  accessToken,
  refreshToken,
}: {
  accessToken?: string;
  refreshToken?: string;
}) {
  mockCookieGet.mockImplementation((name: string) => {
    if (name === "sacdia_admin_access_token") {
      return accessToken ? { value: accessToken } : undefined;
    }
    if (name === "sacdia_admin_refresh_token") {
      return refreshToken ? { value: refreshToken } : undefined;
    }
    return undefined;
  });
}

function seedToken(token: string | undefined) {
  seedTokens({ accessToken: token });
}

// ---------------------------------------------------------------------------
// Tests — getCurrentUser
// ---------------------------------------------------------------------------

describe("getCurrentUser()", () => {
  let session: typeof import("./session");

  beforeEach(async () => {
    vi.resetModules();
    session = await import("./session");
    mockRedirect.mockClear();
    mockApiRequest.mockClear();
    mockCookieGet.mockClear();
    mockCookieSet.mockClear();
    mockCookieDelete.mockClear();
    mockHeaderGet.mockReset();
    mockHeaderGet.mockImplementation((name: string) => {
      if (name === "x-sacdia-pathname") return "/dashboard/users";
      if (name === "x-sacdia-search") return "?page=2";
      return null;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no access-token cookie exists", async () => {
    seedToken(undefined);
    const result = await session.getCurrentUser();
    expect(result).toBeNull();
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("returns the user when /auth/me responds with a valid user payload", async () => {
    seedToken("valid-jwt");
    const user = makeUser();
    // Simulate a plain user payload (no envelope)
    mockApiRequest.mockResolvedValueOnce(user);
    const result = await session.getCurrentUser();
    expect(result).toMatchObject({ id: "user-1", email: "admin@sacdia.org" });
  });

  it("unwraps {status:'success', data: user} envelope from /auth/me", async () => {
    seedToken("valid-jwt");
    const user = makeUser({ id: "inner-user" });
    mockApiRequest.mockResolvedValueOnce({ status: "success", data: user });
    const result = await session.getCurrentUser();
    expect(result?.id).toBe("inner-user");
  });

  it("returns null and clears only the access cookie when /auth/me returns 401", async () => {
    const { ApiError } = await import("@/lib/api/client");
    seedTokens({ accessToken: "expired-jwt", refreshToken: "refresh-token" });
    mockApiRequest.mockRejectedValueOnce(new ApiError("Unauthorized", 401, {}));
    const result = await session.getCurrentUser();
    expect(result).toBeNull();
    expect(mockCookieDelete).toHaveBeenCalledWith("sacdia_admin_access_token");
    expect(mockCookieDelete).not.toHaveBeenCalledWith("sacdia_admin_refresh_token");
  });

  it("returns null and clears cookies when /auth/me returns 403", async () => {
    const { ApiError } = await import("@/lib/api/client");
    seedToken("forbidden-jwt");
    mockApiRequest.mockRejectedValueOnce(new ApiError("Forbidden", 403, {}));
    const result = await session.getCurrentUser();
    expect(result).toBeNull();
    expect(mockCookieDelete).toHaveBeenCalled();
  });

  it("returns null (without clearing cookies) when /auth/me returns 429", async () => {
    const { ApiError } = await import("@/lib/api/client");
    seedToken("valid-jwt");
    mockApiRequest.mockRejectedValueOnce(new ApiError("Rate limited", 429, {}));
    const result = await session.getCurrentUser();
    expect(result).toBeNull();
    expect(mockCookieDelete).not.toHaveBeenCalled();
  });

  it("returns null (without clearing cookies) when /auth/me returns 503", async () => {
    const { ApiError } = await import("@/lib/api/client");
    seedToken("valid-jwt");
    mockApiRequest.mockRejectedValueOnce(new ApiError("Service unavailable", 503, {}));
    const result = await session.getCurrentUser();
    expect(result).toBeNull();
  });

  it("re-throws unexpected non-ApiError errors", async () => {
    seedToken("valid-jwt");
    mockApiRequest.mockRejectedValueOnce(new TypeError("network failure"));
    await expect(session.getCurrentUser()).rejects.toThrow("network failure");
  });
});

// ---------------------------------------------------------------------------
// Tests — requireAdminUser
// ---------------------------------------------------------------------------

describe("requireAdminUser()", () => {
  let session: typeof import("./session");

  beforeEach(async () => {
    vi.resetModules();
    session = await import("./session");
    mockRedirect.mockClear();
    mockApiRequest.mockClear();
    mockCookieGet.mockClear();
    mockCookieSet.mockClear();
    mockCookieDelete.mockClear();
    mockHeaderGet.mockReset();
    mockHeaderGet.mockImplementation((name: string) => {
      if (name === "x-sacdia-pathname") return "/dashboard/users";
      if (name === "x-sacdia-search") return "?page=2";
      return null;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to login when no session cookie exists", async () => {
    seedToken(undefined);
    await expect(session.requireAdminUser()).rejects.toThrow(
      "REDIRECT:/login",
    );
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to refresh when /auth/me returns 401 but a refresh token exists", async () => {
    const { ApiError } = await import("@/lib/api/client");
    seedTokens({ accessToken: "expired-token", refreshToken: "refresh-token" });
    mockApiRequest.mockRejectedValueOnce(new ApiError("Unauthorized", 401, {}));
    await expect(session.requireAdminUser()).rejects.toThrow(
      "REDIRECT:/api/auth/refresh?next=%2Fdashboard%2Fusers%3Fpage%3D2",
    );
  });

  it("redirects when user has no admin role", async () => {
    seedToken("valid-jwt");
    const nonAdminUser = makeUser({ roles: ["member"] });
    mockApiRequest.mockResolvedValueOnce(nonAdminUser);
    await expect(session.requireAdminUser()).rejects.toThrow(
      "REDIRECT:/api/auth/logout?next=/login",
    );
  });

  it("returns the user when token is valid and user has admin role", async () => {
    seedToken("valid-jwt");
    const adminUser = makeUser({ roles: ["admin"] });
    mockApiRequest.mockResolvedValueOnce(adminUser);
    const result = await session.requireAdminUser();
    expect(result).toMatchObject({ id: "user-1" });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("returns the user when role is super-admin", async () => {
    seedToken("valid-jwt");
    const superAdmin = makeUser({ roles: ["super-admin"] });
    mockApiRequest.mockResolvedValueOnce(superAdmin);
    const result = await session.requireAdminUser();
    expect(result).toMatchObject({ email: "admin@sacdia.org" });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects when user has coordinator role not in ALLOWED_ADMIN_ROLES — no, coordinator IS allowed", async () => {
    // This test documents that coordinator IS in ALLOWED_ADMIN_ROLES.
    seedToken("valid-jwt");
    const coordinator = makeUser({ roles: ["coordinator"] });
    mockApiRequest.mockResolvedValueOnce(coordinator);
    const result = await session.requireAdminUser();
    expect(result).toMatchObject({ id: "user-1" });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects to login without clearing cookies when a transient auth check returns null", async () => {
    // getCurrentUser returns null for 429 — requireAdminUser must not logout.
    const { ApiError } = await import("@/lib/api/client");
    seedToken("valid-jwt");
    mockApiRequest.mockRejectedValueOnce(new ApiError("Rate limited", 429, {}));
    await expect(session.requireAdminUser()).rejects.toThrow(
      "REDIRECT:/login",
    );
    expect(mockCookieDelete).not.toHaveBeenCalledWith("sacdia_admin_refresh_token");
  });

  it("sets persistent httpOnly cookies when refreshing from the refresh token", async () => {
    seedTokens({ refreshToken: "refresh-token" });
    mockApiRequest.mockResolvedValueOnce({
      status: "success",
      data: {
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      },
    });

    await expect(session.refreshSessionFromCookies()).resolves.toBe("new-access-token");

    expect(mockApiRequest).toHaveBeenCalledWith("/auth/refresh", {
      method: "POST",
      body: { refreshToken: "refresh-token" },
    });
    expect(mockCookieSet).toHaveBeenCalledWith(
      "sacdia_admin_access_token",
      "new-access-token",
      expect.objectContaining({ httpOnly: true, maxAge: expect.any(Number) }),
    );
    expect(mockCookieSet).toHaveBeenCalledWith(
      "sacdia_admin_refresh_token",
      "new-refresh-token",
      expect.objectContaining({ httpOnly: true, maxAge: expect.any(Number) }),
    );
  });
});
