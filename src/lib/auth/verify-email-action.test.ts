import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock("@/lib/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/client")>();
  return { ...original, apiRequest: apiRequestMock };
});

import { ApiError } from "@/lib/api/client";
import { verifyEmailAction } from "@/lib/auth/verify-email-action";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("verifyEmailAction", () => {
  beforeEach(() => apiRequestMock.mockReset());

  it("sends the token to the API", async () => {
    apiRequestMock.mockResolvedValue({ success: true });

    const state = await verifyEmailAction({}, form({ token: " tok-1 " }));

    expect(state).toEqual({ success: true });
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/auth/verify-email/confirm",
      expect.objectContaining({ method: "POST", body: { token: "tok-1" } }),
    );
  });

  it("keeps a previous success without calling the API again", async () => {
    const state = await verifyEmailAction(
      { success: true },
      form({ token: "tok-1" }),
    );
    expect(state).toEqual({ success: true });
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it("without a token the link is invalid", async () => {
    expect(await verifyEmailAction({}, form({}))).toEqual({ linkInvalid: true });
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it.each([
    "AUTH_EMAIL_VERIFICATION_TOKEN_INVALID",
    "AUTH_EMAIL_VERIFICATION_TOKEN_EXPIRED",
  ])("%s marks the link as invalid", async (code) => {
    apiRequestMock.mockRejectedValueOnce(new ApiError("x", 400, { code }));
    expect(await verifyEmailAction({}, form({ token: "t" }))).toEqual({
      linkInvalid: true,
    });
  });

  it("maps rate limit and unexpected errors", async () => {
    const submit = () => verifyEmailAction({}, form({ token: "t" }));

    apiRequestMock.mockRejectedValueOnce(new ApiError("x", 429, {}));
    expect(await submit()).toEqual({ error: "errors.too_many_attempts" });

    apiRequestMock.mockRejectedValueOnce(new Error("network"));
    expect(await submit()).toEqual({ error: "errors.generic" });
  });
});
