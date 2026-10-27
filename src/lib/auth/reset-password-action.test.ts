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
import { checkNewPassword } from "@/lib/auth/password-policy";
import { resetPasswordAction } from "@/lib/auth/reset-password-action";

const VALID = "Sacdia2026!ok";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("checkNewPassword (mirror of the backend policy)", () => {
  it.each([
    ["", "required"],
    ["Ab1!short", "min_length"],
    ["A" + "a1!".repeat(43), "max_length"],
    ["sacdia2026!ok", "uppercase"],
    ["SACDIA2026!OK", "lowercase"],
    ["Sacdiaxxxx!ok", "number"],
    ["Sacdia2026xok", "special"],
    [" Sacdia2026!ok", "first_char"],
  ])("%j breaks %s", (value, issue) => {
    expect(checkNewPassword(value)).toBe(issue);
  });

  it("accepts a password that meets every rule", () => {
    expect(checkNewPassword(VALID)).toBeNull();
  });
});

describe("resetPasswordAction", () => {
  beforeEach(() => apiRequestMock.mockReset());

  it("sends the token and the new password to the API", async () => {
    apiRequestMock.mockResolvedValue({ success: true });

    const state = await resetPasswordAction(
      {},
      form({ token: "tok-1", password: VALID, confirm: VALID }),
    );

    expect(state).toEqual({ success: true });
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/auth/password/reset",
      expect.objectContaining({
        method: "POST",
        body: { token: "tok-1", password: VALID },
      }),
    );
  });

  it("checks the policy and the confirmation before calling the API", async () => {
    expect(
      await resetPasswordAction(
        {},
        form({ token: "t", password: "short", confirm: "short" }),
      ),
    ).toEqual({ error: "policy.min_length" });
    expect(
      await resetPasswordAction(
        {},
        form({ token: "t", password: VALID, confirm: VALID + "x" }),
      ),
    ).toEqual({ error: "errors.mismatch" });
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it("without a token the link is invalid", async () => {
    const state = await resetPasswordAction(
      {},
      form({ password: VALID, confirm: VALID }),
    );
    expect(state).toEqual({ error: "errors.link_invalid", linkInvalid: true });
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it.each(["AUTH_PASSWORD_RESET_TOKEN_INVALID", "AUTH_PASSWORD_RESET_TOKEN_EXPIRED"])(
    "%s marks the link as invalid",
    async (code) => {
      apiRequestMock.mockRejectedValueOnce(new ApiError("x", 400, { code }));
      const state = await resetPasswordAction(
        {},
        form({ token: "t", password: VALID, confirm: VALID }),
      );
      expect(state).toEqual({ error: "errors.link_invalid", linkInvalid: true });
    },
  );

  it("maps rate limit, other 400s and unexpected errors", async () => {
    const submit = () =>
      resetPasswordAction({}, form({ token: "t", password: VALID, confirm: VALID }));

    apiRequestMock.mockRejectedValueOnce(new ApiError("x", 429, {}));
    expect(await submit()).toEqual({ error: "errors.too_many_attempts" });

    apiRequestMock.mockRejectedValueOnce(
      new ApiError("x", 400, { code: "AUTH_PASSWORD_RESET_FAILED" }),
    );
    expect(await submit()).toEqual({ error: "errors.password_rejected" });

    apiRequestMock.mockRejectedValueOnce(new Error("network"));
    expect(await submit()).toEqual({ error: "errors.generic" });
  });
});
