import { describe, expect, it } from "vitest";

import { canCapability, canViewScreen } from "@/lib/auth/screen-catalog";
import type { AuthUser } from "@/lib/auth/types";

function user(roles: string[], permissions: string[]): AuthUser {
  return {
    id: "actor",
    email: "actor@example.com",
    roles,
    authorization: {
      grants: { global_roles: roles.map((role_name) => ({ role_name })) },
      effective: { permissions },
    },
  } as AuthUser;
}

describe.each(["requests-transfers", "requests-assignments"])("%s review", (screen) => {
  it("lets a coordinator read the list but not review", () => {
    const coordinator = user(["coordinator"], ["requests:read"]);
    expect(canViewScreen(coordinator, screen)).toBe(true);
    expect(canCapability(coordinator, screen, "review")).toBe(false);
  });

  it("lets a reviewer approve and reject", () => {
    const reviewer = user(["director-lf"], ["requests:read", "requests:review"]);
    expect(canCapability(reviewer, screen, "review")).toBe(true);
  });
});
