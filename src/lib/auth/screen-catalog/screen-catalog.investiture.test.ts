import { describe, expect, it } from "vitest";

import type { AuthUser } from "@/lib/auth/types";

import { canCapability, canViewScreen } from "./index";

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

describe("enrollments", () => {
  it("lets admin+coordinator with investiture:validate approve", () => {
    expect(
      canCapability(
        buildUser(["coordinator"], ["investiture:read", "investiture:validate"]),
        "enrollments",
        "validate",
      ),
    ).toBe(true);
  });

  it("hides validate when the actor has the role but not the permission", () => {
    expect(
      canCapability(
        buildUser(["coordinator"], ["investiture:read"]),
        "enrollments",
        "validate",
      ),
    ).toBe(false);
  });

  it("hides validate when the actor has the permission but not admin/coordinator", () => {
    expect(
      canCapability(
        buildUser(["pastor"], ["investiture:read", "investiture:validate"]),
        "enrollments",
        "validate",
      ),
    ).toBe(false);
  });

  it("lets director-lf through the coordinator alias on validate", () => {
    expect(
      canCapability(
        buildUser(["director-lf"], ["investiture:read", "investiture:validate"]),
        "enrollments",
        "validate",
      ),
    ).toBe(true);
  });

  it("lets assistant-admin through the admin alias on validate", () => {
    expect(
      canCapability(
        buildUser(["assistant-admin"], ["investiture:validate"]),
        "enrollments",
        "validate",
      ),
    ).toBe(true);
  });
});

describe("investiture-pipeline", () => {
  it("lets a coordinator with validate do coordinator_approve, not field_approve", () => {
    const user = buildUser(["coordinator"], ["investiture:validate"]);
    expect(canCapability(user, "investiture-pipeline", "coordinator_approve")).toBe(
      true,
    );
    expect(canCapability(user, "investiture-pipeline", "field_approve")).toBe(
      false,
    );
    expect(canCapability(user, "investiture-pipeline", "bulk_approve")).toBe(
      true,
    );
  });

  it("keeps field_approve admin-only even with investiture:validate", () => {
    expect(
      canCapability(
        buildUser(["admin"], ["investiture:validate"]),
        "investiture-pipeline",
        "field_approve",
      ),
    ).toBe(true);
    expect(
      canCapability(
        buildUser(["zone-coordinator"], ["investiture:validate"]),
        "investiture-pipeline",
        "field_approve",
      ),
    ).toBe(false);
  });

  it("does not require a global role for club_approve (ClubRoles only)", () => {
    expect(
      canCapability(
        buildUser(["director-lf"], ["investiture:validate"]),
        "investiture-pipeline",
        "club_approve",
      ),
    ).toBe(true);
    expect(
      canCapability(
        buildUser(["director-lf"], []),
        "investiture-pipeline",
        "club_approve",
      ),
    ).toBe(false);
  });

  it("requires investiture:mark_invested AND admin/coordinator for invest", () => {
    expect(
      canCapability(
        buildUser(["admin"], ["investiture:mark_invested"]),
        "investiture-pipeline",
        "invest",
      ),
    ).toBe(true);
    expect(
      canCapability(
        buildUser(["coordinator"], ["investiture:validate"]),
        "investiture-pipeline",
        "invest",
      ),
    ).toBe(false);
    expect(
      canCapability(
        buildUser(["assistant-lf"], ["investiture:mark_invested"]),
        "investiture-pipeline",
        "invest",
      ),
    ).toBe(true);
  });
});

describe("investiture-pending", () => {
  it("hides mark_invested from a coordinator who only has validate", () => {
    const user = buildUser(["coordinator"], ["investiture:validate"]);
    expect(canCapability(user, "investiture-pending", "validate")).toBe(true);
    expect(canCapability(user, "investiture-pending", "mark_invested")).toBe(
      false,
    );
  });
});

describe("investiture-config", () => {
  it("lets admin with create permission create, not delete (admin seed has no :delete)", () => {
    const admin = buildUser(
      ["admin"],
      ["investiture_config:read", "investiture_config:create"],
    );
    expect(canViewScreen(admin, "investiture-config")).toBe(true);
    expect(canCapability(admin, "investiture-config", "create")).toBe(true);
    expect(canCapability(admin, "investiture-config", "delete")).toBe(false);
  });

  it("hides create when the actor has the config roles but not create", () => {
    expect(
      canCapability(
        buildUser(["director-lf"], ["investiture_config:read"]),
        "investiture-config",
        "create",
      ),
    ).toBe(false);
  });
});

describe("certifications-reviews", () => {
  it("shows certify only with certifications:certify (no @GlobalRoles)", () => {
    expect(
      canCapability(
        buildUser(["director-lf"], ["certifications:certify"]),
        "certifications-reviews",
        "certify",
      ),
    ).toBe(true);
    expect(
      canCapability(
        buildUser(["admin"], ["certifications:review"]),
        "certifications-reviews",
        "certify",
      ),
    ).toBe(false);
  });

  it("lets review-only actors approve but not certify", () => {
    const user = buildUser(["director-lf"], ["certifications:review"]);
    expect(canViewScreen(user, "certifications-reviews")).toBe(true);
    expect(canCapability(user, "certifications-reviews", "approve")).toBe(true);
    expect(canCapability(user, "certifications-reviews", "certify")).toBe(false);
  });
});

describe("catalogs-certifications", () => {
  it("does not treat publish as entry, and does not OR configure||publish", () => {
    expect(
      canViewScreen(buildUser(["admin"], ["certifications:publish"]), "catalogs-certifications"),
    ).toBe(false);
    expect(
      canCapability(
        buildUser(["admin"], ["certifications:publish"]),
        "catalogs-certifications",
        "publish",
      ),
    ).toBe(true);
    expect(
      canViewScreen(
        buildUser(["admin"], ["certifications:configure"]),
        "catalogs-certifications",
      ),
    ).toBe(true);
  });
});

describe("certificate-bulk-imports", () => {
  it("is role-only: director-lf enters, coordinator does not", () => {
    expect(
      canViewScreen(buildUser(["director-lf"], []), "certificate-bulk-imports"),
    ).toBe(true);
    expect(
      canViewScreen(buildUser(["coordinator"], []), "certificate-bulk-imports"),
    ).toBe(false);
  });

  it("hides approve when the actor has no matching role, even with leftover permissions", () => {
    expect(
      canCapability(
        buildUser(["coordinator"], ["user_certifications:manage"]),
        "certificate-bulk-imports",
        "approve",
      ),
    ).toBe(false);
  });
});

describe("certifications-list", () => {
  it("requires user_certifications:manage for the progress toggle", () => {
    expect(
      canCapability(
        buildUser(["admin"], ["user_certifications:read"]),
        "certifications-list",
        "manage",
      ),
    ).toBe(false);
    expect(
      canCapability(
        buildUser(["admin"], ["user_certifications:manage"]),
        "certifications-list",
        "manage",
      ),
    ).toBe(true);
  });
});
