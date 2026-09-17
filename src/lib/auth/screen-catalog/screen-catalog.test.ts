import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import * as permissionConstants from "@/lib/auth/permissions";
import type { AuthUser } from "@/lib/auth/types";

import {
  bundleKeys,
  canCapability,
  canViewScreen,
  collectSidebarLeaves,
  evaluateAccess,
  getScreen,
  GLOBAL_ROLE_ALIASES,
  groupByScreen,
  OTHER_SCREEN_GROUP_ID,
  resolvePathEntry,
  resolveScreenPath,
  SCREEN_CATALOG,
  subjectFromUser,
  USER_MANAGEMENT_ROLES,
} from "./index";

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

const KNOWN_KEYS = new Set<string>(
  (Object.values(permissionConstants) as unknown[]).filter(
    (value): value is string =>
      typeof value === "string" && /^[a-z_-]+:[a-z_-]+$/.test(value),
  ),
);

function readSqlTree(dir: string): string {
  let out = "";
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out += readSqlTree(full);
    } else if (name.endsWith(".sql")) {
      out += readFileSync(full, "utf8");
    }
  }
  return out;
}

// Keys used by screens that have no constant in permissions.ts yet.
const INLINE_KEYS = new Set([
  "dashboard:read",
  "evidence_folders:read",
  "annual_folders:evaluate",
  "annual_folder_templates:read",
]);

describe("screen catalog integrity", () => {
  it("has unique screen ids", () => {
    const ids = SCREEN_CATALOG.map((screen) => screen.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique capability ids inside each screen", () => {
    for (const screen of SCREEN_CATALOG) {
      const ids = screen.capabilities.map((cap) => cap.id);
      expect(new Set(ids).size, screen.id).toBe(ids.length);
    }
  });

  it("resolves a path for every screen", () => {
    for (const screen of SCREEN_CATALOG) {
      const path = resolveScreenPath(screen);
      expect(path, screen.id).toBeTruthy();
      if (screen.surfaces.includes("admin")) {
        expect(path, screen.id).toMatch(/^\/dashboard/);
      }
    }
  });

  it("covers every sidebar leaf with a screen", () => {
    const missing = collectSidebarLeaves()
      .filter((leaf) => !getScreen(leaf.id))
      .map((leaf) => leaf.id);
    expect(missing).toEqual([]);
  });

  it("only uses keys declared in permissions.ts (or the inline allowlist)", () => {
    const unknown: string[] = [];
    for (const screen of SCREEN_CATALOG) {
      for (const key of bundleKeys(screen)) {
        if (!KNOWN_KEYS.has(key) && !INLINE_KEYS.has(key)) {
          unknown.push(`${screen.id}: ${key}`);
        }
      }
    }
    expect(unknown).toEqual([]);
  });

  it("gives every route capability an href that does not clash with a screen path", () => {
    const screenPaths = new Set(
      SCREEN_CATALOG.map((screen) => resolveScreenPath(screen)),
    );
    for (const screen of SCREEN_CATALOG) {
      for (const cap of screen.capabilities) {
        if (cap.kind !== "route" || !cap.href) continue;
        expect(screenPaths.has(cap.href), `${screen.id}.${cap.id}`).toBe(false);
      }
    }
  });

  it("only uses keys the backend seeds (seeds + migrations, when available)", () => {
    const prismaDir = resolve(process.cwd(), "../sacdia-backend/prisma");
    if (!existsSync(prismaDir)) {
      return;
    }
    const seed = readSqlTree(prismaDir);
    const missing: string[] = [];
    for (const screen of SCREEN_CATALOG) {
      for (const key of bundleKeys(screen)) {
        if (!seed.includes(`'${key}'`)) {
          missing.push(`${screen.id}: ${key}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("mirrors GLOBAL_ROLE_ALIASES from the backend guard (when available)", () => {
    const guardPath = resolve(
      process.cwd(),
      "../sacdia-backend/src/common/guards/global-roles.guard.ts",
    );
    if (!existsSync(guardPath)) {
      return;
    }
    const guard = readFileSync(guardPath, "utf8");
    for (const [role, aliases] of Object.entries(GLOBAL_ROLE_ALIASES)) {
      const key = /^[a-z]+$/.test(role) ? role : `'${role}'`;
      const match = guard.match(
        new RegExp(`${key}:\\s*(FIELD_ADMIN_ROLES|\\[[\\s\\S]*?\\])`),
      );
      expect(match, `alias entry for ${role}`).not.toBeNull();
      const rhs = match![1]!.trim();
      if (rhs === "FIELD_ADMIN_ROLES") {
        expect([...aliases].sort()).toEqual(
          [
            "director-lf",
            "assistant-lf",
            "director-union",
            "assistant-union",
            "director-dia",
            "assistant-dia",
          ].sort(),
        );
      } else {
        const parsed = rhs
          .replace(/^\[|\]$/g, "")
          .split(",")
          .map((token) => token.trim().replace(/^'|'$/g, ""))
          .filter((token) => token.length > 0 && !token.startsWith("//"));
        expect([...aliases].sort(), role).toEqual(parsed.sort());
      }
    }
  });
});

describe("evaluateAccess", () => {
  it("expands role aliases like the backend guard", () => {
    const assistantAdmin = subjectFromUser(
      buildUser(["assistant-admin"], ["catalogs:read"]),
    );
    expect(
      evaluateAccess(assistantAdmin, {
        permissions: ["catalogs:read"],
        roles: ["admin"],
      }),
    ).toBe(true);

    const directorLf = subjectFromUser(
      buildUser(["director-lf"], ["catalogs:read"]),
    );
    expect(
      evaluateAccess(directorLf, {
        permissions: ["catalogs:read"],
        roles: ["admin"],
      }),
    ).toBe(false);
  });

  it("requires permission AND role when both are declared", () => {
    const subject = subjectFromUser(buildUser(["director-lf"], []));
    expect(
      evaluateAccess(subject, {
        permissions: ["users:create"],
        roles: [...USER_MANAGEMENT_ROLES],
      }),
    ).toBe(false);
  });

  it("honours requireAll", () => {
    const subject = subjectFromUser(buildUser(["admin"], ["roles:read"]));
    expect(
      evaluateAccess(subject, {
        permissions: ["roles:read", "permissions:read"],
        requireAll: true,
      }),
    ).toBe(false);
  });
});

describe("users screen", () => {
  it("shows Alta only with users:create AND a management role", () => {
    expect(
      canCapability(
        buildUser(["director-union"], ["users:read", "users:create"]),
        "users",
        "create",
      ),
    ).toBe(true);
    expect(
      canCapability(
        buildUser(["director-union"], ["users:read"]),
        "users",
        "create",
      ),
    ).toBe(false);
    expect(
      canCapability(
        buildUser(["coordinator"], ["users:read", "users:create"]),
        "users",
        "create",
      ),
    ).toBe(false);
  });

  it("lets a director-union with read + read_detail enter, but not create", () => {
    const user = buildUser(
      ["director-union"],
      ["users:read", "users:read_detail"],
    );
    expect(canViewScreen(user, "users")).toBe(true);
    expect(canCapability(user, "users", "view_detail")).toBe(true);
    expect(canCapability(user, "users", "create")).toBe(false);
    expect(canCapability(user, "users", "bulk_create")).toBe(false);
  });

  it("keeps Accesos / administrative writes admin-only", () => {
    const fieldRoles = [
      "director-lf",
      "assistant-lf",
      "director-union",
      "assistant-union",
      "director-dia",
      "assistant-dia",
    ];
    for (const role of fieldRoles) {
      expect(
        canCapability(
          buildUser([role], ["users:update_admin"]),
          "users",
          "update_admin",
        ),
        role,
      ).toBe(false);
    }
    expect(
      canCapability(
        buildUser(["admin"], ["users:update_admin"]),
        "users",
        "update_admin",
      ),
    ).toBe(true);
    expect(
      canCapability(buildUser(["super-admin"], []), "users", "update_admin"),
    ).toBe(true);
    expect(
      canCapability(
        buildUser(["assistant-admin"], ["users:update_admin"]),
        "users",
        "update_admin",
      ),
    ).toBe(true);
  });

  it("accepts the legacy OR for sensitive families", () => {
    expect(
      canCapability(
        buildUser(["admin"], ["users:read_detail"]),
        "users",
        "health.read",
      ),
    ).toBe(true);
    expect(
      canCapability(buildUser(["admin"], ["health:read"]), "users", "health.read"),
    ).toBe(true);
    expect(
      canCapability(buildUser(["admin"], ["users:read"]), "users", "health.read"),
    ).toBe(false);
  });

  it("returns false for unknown capabilities", () => {
    expect(canCapability(buildUser(["admin"], []), "users", "nope")).toBe(false);
    expect(canCapability(buildUser(["admin"], []), "ghost", "create")).toBe(false);
  });

  it("lists create and bulk_create in the bundle", () => {
    const keys = bundleKeys(getScreen("users")!);
    expect(keys).toContain("users:create");
    expect(keys).toContain("users:bulk_create");
    expect(keys).toContain("users:read");
  });
});

describe("exactRoles gates (service-level rules)", () => {
  it("does not expand aliases for director designation", () => {
    const assign = ["club_roles:assign"];
    expect(
      canCapability(buildUser(["admin"], assign), "clubs", "designate_director"),
    ).toBe(true);
    expect(
      canCapability(
        buildUser(["assistant-admin"], assign),
        "clubs",
        "designate_director",
      ),
    ).toBe(false);
    expect(
      canCapability(
        buildUser(["director-union"], assign),
        "clubs",
        "designate_director",
      ),
    ).toBe(false);
    expect(
      canCapability(buildUser(["director-lf"], []), "clubs", "designate_director"),
    ).toBe(false);
  });

  it("requires assign+revoke and a field/admin role for annual succession", () => {
    const both = ["club_roles:assign", "club_roles:revoke"];
    expect(
      canCapability(buildUser(["admin"], both), "clubs", "succeed_director"),
    ).toBe(true);
    expect(
      canCapability(buildUser(["assistant-lf"], both), "clubs", "succeed_director"),
    ).toBe(true);
    expect(
      canCapability(
        buildUser(["admin"], ["club_roles:assign"]),
        "clubs",
        "succeed_director",
      ),
    ).toBe(false);
    expect(
      canCapability(buildUser(["director-union"], both), "clubs", "succeed_director"),
    ).toBe(false);
  });

  it("keeps manage_roles permission-only", () => {
    expect(
      canCapability(
        buildUser(["coordinator"], ["club_roles:assign"]),
        "clubs",
        "manage_roles",
      ),
    ).toBe(true);
  });
});

describe("RBAC writes", () => {
  it("are super-admin only, even with permissions:assign", () => {
    const admin = buildUser(["admin"], ["permissions:assign", "roles:read"]);
    expect(canCapability(admin, "admin-system-roles", "manage")).toBe(false);
    expect(canCapability(admin, "admin-system-permissions", "manage")).toBe(false);
    expect(canCapability(admin, "admin-system-matrix", "write")).toBe(false);
    expect(canCapability(admin, "admin-system-permissions", "user_grants")).toBe(
      false,
    );
    const root = buildUser(["super-admin"], []);
    expect(canCapability(root, "admin-system-matrix", "write")).toBe(true);
    expect(canViewScreen(root, "admin-system-audit")).toBe(true);
    expect(canViewScreen(admin, "admin-system-audit")).toBe(false);
  });
});

describe("materials and camporees", () => {
  it("gates material verbs by their own keys (permission-only module)", () => {
    const approver = buildUser(["coordinator"], ["materiales:read", "materiales:approve"]);
    expect(canViewScreen(approver, "materials-inbox")).toBe(true);
    expect(canCapability(approver, "materials-inbox", "approve")).toBe(true);
    expect(canCapability(approver, "materials-inbox", "deliver")).toBe(false);
    // Receipts queue: the verb is the entry gate.
    expect(canViewScreen(approver, "materials-receipts")).toBe(false);
    expect(
      canViewScreen(
        buildUser(["coordinator"], ["materiales:validate-receipt"]),
        "materials-receipts",
      ),
    ).toBe(true);
  });

  it("does not let camporees:* stand in for camporee_events:*", () => {
    const creator = buildUser(["director-lf"], ["camporees:read", "camporees:create"]);
    expect(canCapability(creator, "campamentos-list-local", "create")).toBe(true);
    expect(canCapability(creator, "campamentos-list-local", "events.create")).toBe(
      false,
    );
    expect(
      canCapability(
        buildUser(["director-lf"], ["camporee_events:create"]),
        "campamentos-list-union",
        "events.create",
      ),
    ).toBe(true);
  });

  it("does not let director-lf assign judges without camporee_events:update", () => {
    expect(
      canCapability(buildUser(["director-lf"], []), "campamentos-list-local", "events.update"),
    ).toBe(false);
    expect(
      canCapability(
        buildUser(["director-lf"], ["camporee_events:update"]),
        "campamentos-list-local",
        "events.update",
      ),
    ).toBe(true);
  });

  it("mirrors camporee_events:* on venues and scoring.read", () => {
    const creator = buildUser(["director-lf"], ["camporees:create"]);
    expect(canCapability(creator, "campamentos-list-local", "venues.create")).toBe(
      false,
    );
    expect(
      canCapability(
        buildUser(["director-lf"], ["camporee_events:create"]),
        "campamentos-list-local",
        "venues.create",
      ),
    ).toBe(true);
    expect(
      canCapability(
        buildUser(["director-lf"], ["camporee_events:read"]),
        "campamentos-list-union",
        "scoring.read",
      ),
    ).toBe(true);
  });

  it("keeps event types admin-only and ignores catalogs:*", () => {
    expect(
      canCapability(
        buildUser(["director-lf"], ["catalogs:create", "camporee_event_types:create"]),
        "catalogs-camporee-event-types",
        "create",
      ),
    ).toBe(false);
    expect(
      canCapability(
        buildUser(["assistant-admin"], ["camporee_event_types:create"]),
        "admin-campamentos-config-union",
        "create",
      ),
    ).toBe(true);
  });
});

describe("catalog CRUD screens", () => {
  // Screens whose server actions (generic-catalogs-i18n, phase-e, honors…)
  // gate through `create` / `update` / `delete`. A missing capability would
  // silently deny the action, so pin the contract here.
  const CRUD_SCREENS = [
    "catalogs-divisions",
    "catalogs-countries",
    "catalogs-unions",
    "catalogs-local-fields",
    "catalogs-districts",
    "catalogs-churches",
    "catalogs-club-ideals",
    "catalogs-club-types",
    "catalogs-classes",
    "catalogs-class-modules",
    "catalogs-class-sections",
    "catalogs-activity-types",
    "catalogs-ecclesiastical-years",
    "catalogs-allergies",
    "catalogs-diseases",
    "catalogs-medicines",
    "catalogs-relationship-types",
    "catalogs-finance-categories",
    "catalogs-inventory-categories",
    "catalogs-honor-categories",
    "catalogs-honors",
    "catalogs-master-honors",
    "catalogs-camporee-event-types",
  ];

  it("declare create, update and delete", () => {
    for (const screenId of CRUD_SCREENS) {
      const screen = getScreen(screenId);
      expect(screen, screenId).toBeDefined();
      const ids = new Set(screen!.capabilities.map((cap) => cap.id));
      for (const verb of ["create", "update", "delete"]) {
        expect(ids.has(verb), `${screenId}.${verb}`).toBe(true);
      }
    }
  });
});

describe("resolvePathEntry", () => {
  it("prefers the exact route capability over the parent screen", () => {
    const entry = resolvePathEntry("/dashboard/users/new");
    expect(entry?.screenId).toBe("users");
    expect(entry?.capabilityId).toBe("create");
  });

  it("falls back to the screen viewAny for nested detail paths", () => {
    const entry = resolvePathEntry("/dashboard/users/abc-123");
    expect(entry?.screenId).toBe("users");
    expect(entry?.capabilityId).toBeUndefined();
  });

  it("picks the longest prefix between screen paths and route hrefs", () => {
    expect(resolvePathEntry("/dashboard/materials/inventory/x")?.screenId).toBe(
      "materials-inventory",
    );
    expect(resolvePathEntry("/dashboard/materials/request/FOLIO")?.capabilityId).toBe(
      "request_detail",
    );
    expect(resolvePathEntry("/dashboard/materials")?.capabilityId).toBe("hub");
  });

  it("never uses /dashboard as a prefix", () => {
    expect(resolvePathEntry("/dashboard/unknown-shell")).toBeUndefined();
  });
});

describe("groupByScreen", () => {
  it("groups keys under the first screen whose bundle contains them and keeps orphans", () => {
    const groups = groupByScreen(
      [
        { permission_name: "users:create" },
        { permission_name: "users:read" },
        { permission_name: "clubs:read" },
        { permission_name: "totally:unknown" },
      ],
      (item) => item.permission_name,
    );

    expect(groups.map((group) => group.screenId)).toEqual([
      "users",
      "clubs",
      OTHER_SCREEN_GROUP_ID,
    ]);
    expect(groups[0]!.requiredRoles).toEqual([...USER_MANAGEMENT_ROLES]);
    expect(groups[0]!.items.map((item) => item.permission_name)).toEqual([
      "users:create",
      "users:read",
    ]);
  });
});
