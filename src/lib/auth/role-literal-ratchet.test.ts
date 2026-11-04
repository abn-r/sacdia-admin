/**
 * Ratchet: authorization decisions in `src/components/**` and `src/lib/**`
 * read `authorization.capabilities` / `territory` from `/auth/me`, never
 * role names. Role names may still appear as DATA (labels, badge variants,
 * grouping of role rows, list filters); every such file is listed below with
 * its reason. A new file carrying a role literal or a `*_ROLES` set fails
 * this test; a listed file that stops carrying them must be removed from the
 * list so the allowlist only shrinks.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CLUB_ROLE_NAMES, GLOBAL_ROLE_NAMES } from "./generated/role-names";

const ROOT = resolve(process.cwd(), "src");
const SCAN_DIRS = ["components", "lib"].map((dir) => join(ROOT, dir));

/** Files allowed to carry role names as data (relative to `src/`). */
const ALLOWLIST: Record<string, string> = {
  "components/clubs/detail/sections-tab.tsx": "officer rows rendered per club role (display order)",
  "components/rbac/user-roles-panel.tsx":
    "badge variant per role row and PLATFORM_ADMIN_ROLES (rows only super-admin may mutate)",
  "components/coordination/coordination-assignments-panel.tsx":
    "role filter of the coordinator candidate query (GET /admin/users?role=)",
  "components/camporee-scoring/camporee-judges-panel.tsx": "judge role labels",
  "lib/users/role-buckets.ts": "grouping of a user's role rows (administrative / operational)",
  "lib/clubs/types.ts": "SECTION_OFFICER_ROLES: club officer roles rendered in section forms",
  "lib/admin-users/list-role-badges.ts": "badge order of club role rows",
  "lib/api/admin-users.ts": "AdminCreatableRole payload type of POST /admin/users",
  "lib/rbac/role-name.ts": "RESERVED_ROLE_NAME validation of the role form",
};

/** Paths (relative to `src/`) excluded from the scan. */
const EXCLUDED_PREFIXES = [
  "lib/auth/generated/",
  "lib/auth/testing/",
  "lib/auth/roles.ts",
  "lib/auth/permissions.ts",
];

const DISTINCT_ROLE_NAMES = [...GLOBAL_ROLE_NAMES, ...CLUB_ROLE_NAMES].filter((name) =>
  name.includes("-"),
);
const AMBIGUOUS_ROLE_NAMES = [...GLOBAL_ROLE_NAMES, ...CLUB_ROLE_NAMES].filter(
  (name) => !name.includes("-"),
);

const ROLE_SET_IDENTIFIER = /\b[A-Z][A-Z0-9_]*_ROLES\b/g;
const DISTINCT_LITERAL = new RegExp(`["'](?:${DISTINCT_ROLE_NAMES.join("|")})["']`, "g");
/**
 * Plain words (`admin`, `user`, `director`, …) also name other things (a
 * surface, a target type, a dashboard level), so they only count when a
 * role-ish identifier is compared on the same line.
 */
const AMBIGUOUS_COMPARISON = new RegExp(
  `\\b(?:roles?|role_name|roleName|globalRoles|clubRoles)\\b[^\\n;]{0,60}?` +
    `(?:\\.has|\\.includes|===|!==)\\s*\\(?\\s*["'](?:${AMBIGUOUS_ROLE_NAMES.join("|")})["']`,
  "g",
);

function walk(dir: string, out: string[]) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) {
      out.push(full);
    }
  }
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/.*$/gm, "$1");
}

function findRoleUsages(source: string): string[] {
  const code = stripComments(source);
  const hits = new Set<string>();
  for (const pattern of [ROLE_SET_IDENTIFIER, DISTINCT_LITERAL, AMBIGUOUS_COMPARISON]) {
    for (const match of code.matchAll(pattern)) {
      hits.add(match[0]);
    }
  }
  return [...hits].sort();
}

describe("role literal ratchet", () => {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) walk(dir, files);
  const usages = new Map<string, string[]>();
  for (const file of files) {
    const rel = relative(ROOT, file).split("\\").join("/");
    if (EXCLUDED_PREFIXES.some((prefix) => rel.startsWith(prefix))) continue;
    const hits = findRoleUsages(readFileSync(file, "utf8"));
    if (hits.length > 0) usages.set(rel, hits);
  }

  it("has no role names or *_ROLES sets outside the allowlist", () => {
    const offenders = [...usages.entries()]
      .filter(([rel]) => !(rel in ALLOWLIST))
      .map(([rel, hits]) => `${rel}: ${hits.join(", ")}`);
    expect(offenders).toEqual([]);
  });

  it("only lists files that still carry role names (the allowlist ratchets down)", () => {
    const stale = Object.keys(ALLOWLIST).filter((rel) => !usages.has(rel));
    expect(stale).toEqual([]);
  });
});
