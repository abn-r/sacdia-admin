import { describe, expect, it } from "vitest";

import { subjectFromUser } from "@/lib/auth/screen-catalog";
import type { AuthUser } from "@/lib/auth/types";
import { resolvePrerequisiteHref } from "@/lib/prerequisites/resolve-prerequisite-href";

function buildUser(roles: string[], permissions: string[]): AuthUser {
  return {
    id: "actor",
    email: "actor@example.com",
    roles,
    authorization: {
      grants: { global_roles: roles.map((role_name) => ({ role_name })) },
      effective: { permissions },
    },
  };
}

describe("resolvePrerequisiteHref", () => {
  it("returns the catalog path when the actor can open the screen", () => {
    const subject = subjectFromUser(buildUser(["admin"], ["local_fields:read"]));
    expect(resolvePrerequisiteHref(subject, "catalogs-districts")).toBe(
      "/dashboard/catalogs/districts",
    );
  });

  it("returns null when the actor cannot open the screen", () => {
    const subject = subjectFromUser(buildUser(["director-lf"], []));
    expect(resolvePrerequisiteHref(subject, "catalogs-districts")).toBeNull();
  });
});
