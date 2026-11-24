import { describe, expect, it } from "vitest";

import { usersListErrorState } from "@/lib/users/list-error";

const checkedAt = "2026-11-24T10:00:00.000Z";

describe("usersListErrorState", () => {
  it("maps each failed endpoint state to an ErrorState kind", () => {
    expect(usersListErrorState({ endpointState: "forbidden", checkedAt }).kind).toBe("forbidden");
    expect(usersListErrorState({ endpointState: "rate-limited", checkedAt }).kind).toBe("rateLimited");
    expect(usersListErrorState({ endpointState: "missing", checkedAt }).kind).toBe("error");
  });

  it("carries the time of the failed attempt", () => {
    expect(usersListErrorState({ endpointState: "missing", checkedAt }).detail).toEqual({ at: checkedAt });
  });
});
