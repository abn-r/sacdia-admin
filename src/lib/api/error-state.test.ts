import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import { errorStateFromError } from "@/lib/api/error-state";

const api = (status: number) => new ApiError("x", status, null);

describe("errorStateFromError", () => {
  it.each([
    [401, "forbidden"],
    [403, "forbidden"],
    [404, "notFound"],
    [429, "rateLimited"],
    [0, "offline"],
  ] as const)("maps status %s to %s", (status, kind) => {
    const result = errorStateFromError(api(status));
    expect(result.kind).toBe(kind);
    expect(result.detail).toBeUndefined();
  });

  it("maps a fetch TypeError to offline", () => {
    expect(errorStateFromError(new TypeError("Failed to fetch")).kind).toBe("offline");
  });

  it("maps other statuses to error with code and time", () => {
    const result = errorStateFromError(api(500));
    expect(result.kind).toBe("error");
    expect(result.detail?.code).toBe(500);
    expect(result.detail?.at).toBeInstanceOf(Date);
  });

  it("maps unknown errors to error without a code", () => {
    const result = errorStateFromError(new Error("boom"));
    expect(result.kind).toBe("error");
    expect(result.detail?.code).toBeUndefined();
  });
});
