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

describe("finances", () => {
  it("lets a permission holder create without a named global role", () => {
    expect(
      canCapability(buildUser(["pastor"], ["finances:create"]), "finances", "create"),
    ).toBe(true);
  });

  it("hides create when the role has no finances:create", () => {
    expect(
      canCapability(buildUser(["director-lf"], ["finances:read"]), "finances", "create"),
    ).toBe(false);
  });

  it("does not teach the screen from a write key", () => {
    expect(canViewScreen(buildUser(["director-lf"], ["finances:create"]), "finances")).toBe(
      false,
    );
    expect(canViewScreen(buildUser(["director-lf"], ["finances:read"]), "finances")).toBe(
      true,
    );
  });

  it("gates update and delete on their own keys", () => {
    const reader = buildUser(["director-lf"], ["finances:read"]);
    expect(canCapability(reader, "finances", "update")).toBe(false);
    expect(canCapability(reader, "finances", "delete")).toBe(false);
    expect(
      canCapability(
        buildUser(["director-lf"], ["finances:read", "finances:update"]),
        "finances",
        "update",
      ),
    ).toBe(true);
    expect(
      canCapability(
        buildUser(["director-lf"], ["finances:read", "finances:delete"]),
        "finances",
        "delete",
      ),
    ).toBe(true);
  });
});

describe("club-inventory", () => {
  it("lets a permission holder create without a named global role", () => {
    expect(
      canCapability(
        buildUser(["pastor"], ["inventory:create"]),
        "club-inventory",
        "create",
      ),
    ).toBe(true);
  });

  it("hides create when the role has no inventory:create", () => {
    expect(
      canCapability(
        buildUser(["director-lf"], ["inventory:read"]),
        "club-inventory",
        "create",
      ),
    ).toBe(false);
  });

  it("does not teach the screen from a write key", () => {
    expect(
      canViewScreen(buildUser(["director-lf"], ["inventory:create"]), "club-inventory"),
    ).toBe(false);
    expect(
      canViewScreen(buildUser(["director-lf"], ["inventory:read"]), "club-inventory"),
    ).toBe(true);
  });

  it("gates update and delete on their own keys", () => {
    const reader = buildUser(["director-lf"], ["inventory:read"]);
    expect(canCapability(reader, "club-inventory", "update")).toBe(false);
    expect(canCapability(reader, "club-inventory", "delete")).toBe(false);
    expect(
      canCapability(
        buildUser(["director-lf"], ["inventory:read", "inventory:update"]),
        "club-inventory",
        "update",
      ),
    ).toBe(true);
    expect(
      canCapability(
        buildUser(["director-lf"], ["inventory:read", "inventory:delete"]),
        "club-inventory",
        "delete",
      ),
    ).toBe(true);
  });
});

describe("insurance-by-section", () => {
  it("lets insurance:create register without a named global role", () => {
    expect(
      canCapability(
        buildUser(["pastor"], ["insurance:create"]),
        "insurance-by-section",
        "create",
      ),
    ).toBe(true);
  });

  it("hides create when the role only has insurance:read", () => {
    expect(
      canCapability(
        buildUser(["director-lf"], ["insurance:read"]),
        "insurance-by-section",
        "create",
      ),
    ).toBe(false);
  });

  it("does not teach the screen from a write key", () => {
    expect(
      canViewScreen(
        buildUser(["director-lf"], ["insurance:create"]),
        "insurance-by-section",
      ),
    ).toBe(false);
    expect(
      canViewScreen(buildUser(["director-lf"], ["insurance:read"]), "insurance-by-section"),
    ).toBe(true);
  });

  it("uses insurance:update for both edit and deactivate", () => {
    const reader = buildUser(["director-lf"], ["insurance:read"]);
    expect(canCapability(reader, "insurance-by-section", "update")).toBe(false);
    expect(canCapability(reader, "insurance-by-section", "delete")).toBe(false);
    const writer = buildUser(["director-lf"], ["insurance:read", "insurance:update"]);
    expect(canCapability(writer, "insurance-by-section", "update")).toBe(true);
    expect(canCapability(writer, "insurance-by-section", "delete")).toBe(true);
  });
});

describe("insurance-expiring", () => {
  it("rejects insurance:read without an allowed global role (old viewAny)", () => {
    expect(
      canViewScreen(buildUser(["pastor"], ["insurance:read"]), "insurance-expiring"),
    ).toBe(false);
  });

  it("lets director-lf in via coordinator alias without insurance:read", () => {
    expect(canViewScreen(buildUser(["director-lf"], []), "insurance-expiring")).toBe(
      true,
    );
    expect(
      canViewScreen(buildUser(["assistant-lf"], []), "insurance-expiring"),
    ).toBe(true);
  });

  it("lets admin/coordinator in without insurance:read (SkipPermissions)", () => {
    expect(canViewScreen(buildUser(["admin"], []), "insurance-expiring")).toBe(true);
    expect(canViewScreen(buildUser(["coordinator"], []), "insurance-expiring")).toBe(
      true,
    );
  });

  it("expands aliases like GlobalRolesGuard", () => {
    expect(
      canViewScreen(buildUser(["assistant-admin"], []), "insurance-expiring"),
    ).toBe(true);
    expect(
      canViewScreen(buildUser(["zone-coordinator"], []), "insurance-expiring"),
    ).toBe(true);
    expect(
      canViewScreen(buildUser(["general-coordinator"], []), "insurance-expiring"),
    ).toBe(true);
    expect(
      canViewScreen(buildUser(["director-union"], []), "insurance-expiring"),
    ).toBe(false);
  });
});

describe("insurance-config", () => {
  it("splits tabs: configure vs payment instructions", () => {
    const products = buildUser(["director-lf"], ["insurance:configure"]);
    expect(canViewScreen(products, "insurance-config")).toBe(true);
    expect(canCapability(products, "insurance-config", "configure")).toBe(true);
    expect(
      canCapability(products, "insurance-config", "configure_payment_instructions"),
    ).toBe(false);

    const payments = buildUser(["admin"], ["field-payment-orders:configure"]);
    expect(canViewScreen(payments, "insurance-config")).toBe(true);
    expect(canCapability(payments, "insurance-config", "configure")).toBe(false);
    expect(
      canCapability(payments, "insurance-config", "configure_payment_instructions"),
    ).toBe(true);
  });

  it("hides the hub with neither key", () => {
    expect(
      canViewScreen(buildUser(["director-lf"], ["insurance:read"]), "insurance-config"),
    ).toBe(false);
  });
});

describe("payment-orders tabs", () => {
  it("opens pending from any obligation source key", () => {
    expect(
      canCapability(
        buildUser(["director-lf"], ["camporee-orders:read"]),
        "payment-orders",
        "pending",
      ),
    ).toBe(true);
    expect(
      canCapability(
        buildUser(["director-lf"], ["materiales:read"]),
        "payment-orders",
        "pending",
      ),
    ).toBe(true);
    expect(
      canCapability(
        buildUser(["director-lf"], ["insurance:read"]),
        "payment-orders",
        "pending",
      ),
    ).toBe(false);
  });

  it("opens orders from field-payment-orders:read or :review", () => {
    expect(
      canCapability(
        buildUser(["director-lf"], ["field-payment-orders:read"]),
        "payment-orders",
        "orders",
      ),
    ).toBe(true);
    expect(
      canCapability(
        buildUser(["director-lf"], ["field-payment-orders:review"]),
        "payment-orders",
        "orders",
      ),
    ).toBe(true);
    expect(
      canCapability(
        buildUser(["director-lf"], ["camporee-orders:read"]),
        "payment-orders",
        "orders",
      ),
    ).toBe(false);
  });

  it("opens reassignments with insurance:read", () => {
    expect(
      canCapability(
        buildUser(["director-lf"], ["insurance:read"]),
        "payment-orders",
        "reassignments",
      ),
    ).toBe(true);
    expect(
      canViewScreen(buildUser(["director-lf"], ["insurance:read"]), "payment-orders"),
    ).toBe(true);
  });
});

describe("resources", () => {
  it("gates list verbs on their own keys", () => {
    const reader = buildUser(["director-lf"], ["resources:read"]);
    expect(canViewScreen(reader, "resources-list")).toBe(true);
    expect(canCapability(reader, "resources-list", "create")).toBe(false);
    expect(
      canCapability(
        buildUser(["director-lf"], ["resources:create"]),
        "resources-list",
        "create",
      ),
    ).toBe(true);
    expect(
      canCapability(
        buildUser(["director-lf"], ["resources:update"]),
        "resources-list",
        "update",
      ),
    ).toBe(true);
    expect(
      canCapability(
        buildUser(["director-lf"], ["resources:delete"]),
        "resources-list",
        "delete",
      ),
    ).toBe(true);
  });

  it("gates category verbs on resource_categories:*", () => {
    const reader = buildUser(["admin"], ["resource_categories:read"]);
    expect(canViewScreen(reader, "resources-categories")).toBe(true);
    expect(canCapability(reader, "resources-categories", "create")).toBe(false);
    expect(
      canCapability(
        buildUser(["admin"], ["resource_categories:create"]),
        "resources-categories",
        "create",
      ),
    ).toBe(true);
  });
});
