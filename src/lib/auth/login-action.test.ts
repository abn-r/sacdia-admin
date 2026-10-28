import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApiRequest = vi.fn();

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));
vi.mock("@/lib/auth/session", () => ({
  clearSession: vi.fn(),
  normalizeAuthTokenResponse: vi.fn(),
  setAuthCookies: vi.fn(),
}));
vi.mock("@/lib/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/client")>();
  return { ...actual, apiRequest: (...args: unknown[]) => mockApiRequest(...args) };
});

import { ApiError } from "@/lib/api/client";
import { loginAction } from "@/lib/auth/actions";

function credentials() {
  const formData = new FormData();
  formData.set("email", "director@example.test");
  formData.set("password", "not-a-real-password");
  return formData;
}

describe("loginAction errors", () => {
  beforeEach(() => mockApiRequest.mockReset());

  it("tells the user to wait when the backend throttles the login (429)", async () => {
    mockApiRequest.mockRejectedValueOnce(
      new ApiError("ThrottlerException: Too Many Requests", 429, null),
    );

    await expect(loginAction({}, credentials())).resolves.toEqual({
      error: "errors.too_many_attempts",
    });
  });

  it("keeps the invalid-credentials message for 401", async () => {
    mockApiRequest.mockRejectedValueOnce(new ApiError("Unauthorized", 401, null));

    await expect(loginAction({}, credentials())).resolves.toEqual({
      error: "errors.invalid_credentials",
    });
  });
});
