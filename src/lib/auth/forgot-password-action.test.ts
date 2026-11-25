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
import { forgotPasswordAction } from "@/lib/auth/forgot-password-action";

function form(email: string) {
  const data = new FormData();
  data.set("email", email);
  return data;
}

describe("forgotPasswordAction", () => {
  beforeEach(() => apiRequestMock.mockReset());

  it("posts the trimmed email to the reset-request endpoint", async () => {
    apiRequestMock.mockResolvedValue({ success: true });

    const result = await forgotPasswordAction({}, form("  mateo.herrera@correo.test "));

    expect(apiRequestMock).toHaveBeenCalledWith(
      "/auth/password/reset-request",
      expect.objectContaining({ method: "POST", body: { email: "mateo.herrera@correo.test" } }),
    );
    expect(result).toEqual({ sent: true });
  });

  it("rejects a malformed email without calling the API", async () => {
    expect(await forgotPasswordAction({}, form("no-es-correo"))).toEqual({
      error: "errors.emailInvalid",
    });
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it("answers the same success when the backend rejects the address (no enumeration)", async () => {
    apiRequestMock.mockRejectedValueOnce(new ApiError("Bad Request", 400, null));
    expect(await forgotPasswordAction({}, form("nadie@correo.test"))).toEqual({ sent: true });
  });

  it("shows the wait notice on 429", async () => {
    apiRequestMock.mockRejectedValueOnce(new ApiError("Too Many Requests", 429, null));
    expect(await forgotPasswordAction({}, form("mateo.herrera@correo.test"))).toEqual({
      error: "errors.tooManyAttempts",
    });
  });

  it("shows a generic error when the server is down", async () => {
    apiRequestMock.mockRejectedValueOnce(new ApiError("Unavailable", 503, null));
    expect(await forgotPasswordAction({}, form("mateo.herrera@correo.test"))).toEqual({
      error: "errors.generic",
    });
  });
});
