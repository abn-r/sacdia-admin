import { describe, expect, it } from "vitest";

import { subjectFromUser } from "@/lib/auth/screen-catalog";
import { buildUser } from "@/lib/auth/testing/auth-user-fixture";
import { resolvePrerequisiteHref } from "@/lib/prerequisites/resolve-prerequisite-href";


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
