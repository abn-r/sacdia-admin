import { describe, expect, it } from "vitest";
import {
  filterUsersRoleOptionsByViewer,
  toUsersRoleFilterOptions,
  withCurrentRoleFilterOption,
} from "./role-filter-options";

const HARDCODED_ADMIN_FILTER_ROLES = ["super-admin", "admin", "coordinator"];

const CATALOG_ROLES = [
  { name: "super-admin", role_category: "GLOBAL" },
  { name: "admin", role_category: "GLOBAL" },
  { name: "coordinator", role_category: "GLOBAL" },
  { name: "user", role_category: "GLOBAL" },
  { name: "member", role_category: "CLUB" },
  { name: "deputy-director", role_category: "CLUB" },
  { name: "secretary", role_category: "CLUB" },
  { name: "treasurer", role_category: "CLUB" },
  { name: "director", role_category: "CLUB" },
];

describe("toUsersRoleFilterOptions", () => {
  it("includes every catalog role, not only the hardcoded admin trio", () => {
    const options = toUsersRoleFilterOptions(CATALOG_ROLES);
    const values = options.map((option) => option.value);

    expect(values).toEqual(
      expect.arrayContaining([
        "member",
        "user",
        "deputy-director",
        "secretary",
        "treasurer",
        "director",
        ...HARDCODED_ADMIN_FILTER_ROLES,
      ]),
    );
    expect(values).toHaveLength(CATALOG_ROLES.length);
    expect(values.length).toBeGreaterThan(HARDCODED_ADMIN_FILTER_ROLES.length);
  });

  it("keeps GLOBAL and CLUB categories so the filter can match either assignment table", () => {
    const options = toUsersRoleFilterOptions(CATALOG_ROLES);

    expect(options.find((option) => option.value === "user")?.category).toBe("GLOBAL");
    expect(options.find((option) => option.value === "member")?.category).toBe("CLUB");
    expect(options.find((option) => option.value === "secretary")?.category).toBe("CLUB");
  });

  it("dedupes role names case-insensitively and skips empty names", () => {
    const options = toUsersRoleFilterOptions([
      { name: "Member", role_category: "CLUB" },
      { role_name: "member", role_category: "GLOBAL" },
      { name: "  ", role_category: "CLUB" },
      { name: "user", role_category: "GLOBAL" },
    ]);

    expect(options.map((option) => option.value)).toEqual(["user", "Member"]);
  });

  it("returns an empty list for a missing catalog payload", () => {
    expect(toUsersRoleFilterOptions(undefined)).toEqual([]);
    expect(toUsersRoleFilterOptions(null)).toEqual([]);
    expect(toUsersRoleFilterOptions({ data: [] })).toEqual([]);
  });
});

describe("withCurrentRoleFilterOption", () => {
  it("keeps a selected role that is no longer in the catalog so the select stays valid", () => {
    const options = toUsersRoleFilterOptions([{ name: "member", role_category: "CLUB" }]);

    expect(withCurrentRoleFilterOption(options, "all")).toEqual(options);
    expect(withCurrentRoleFilterOption(options, "pastor").map((option) => option.value)).toEqual([
      "member",
      "pastor",
    ]);
  });
});

const SCOPED_CATALOG = [
  { name: "super-admin", role_category: "GLOBAL" },
  { name: "admin", role_category: "GLOBAL" },
  { name: "assistant-admin", role_category: "GLOBAL" },
  { name: "director-dia", role_category: "GLOBAL" },
  { name: "assistant-dia", role_category: "GLOBAL" },
  { name: "director-union", role_category: "GLOBAL" },
  { name: "assistant-union", role_category: "GLOBAL" },
  { name: "director-lf", role_category: "GLOBAL" },
  { name: "assistant-lf", role_category: "GLOBAL" },
  { name: "coordinator", role_category: "GLOBAL" },
  { name: "pastor", role_category: "GLOBAL" },
  { name: "user", role_category: "GLOBAL" },
  { name: "director", role_category: "CLUB" },
  { name: "member", role_category: "CLUB" },
];

function scopedValues(
  scopeType: string | null,
  actorRoles: string[],
): string[] {
  return filterUsersRoleOptionsByViewer(toUsersRoleFilterOptions(SCOPED_CATALOG), {
    scopeType,
    actorRoles,
  }).map((option) => option.value);
}

describe("filterUsersRoleOptionsByViewer", () => {
  it("lets platform admins see every catalog role even with a LOCAL_FIELD list scope", () => {
    const values = scopedValues("LOCAL_FIELD", ["admin"]);

    expect(values).toEqual(
      expect.arrayContaining([
        "super-admin",
        "admin",
        "director-dia",
        "director-union",
        "director-lf",
        "coordinator",
        "member",
      ]),
    );
    expect(values).toHaveLength(SCOPED_CATALOG.length);
  });

  it("lets super-admin see every catalog role", () => {
    expect(scopedValues("ALL", ["super-admin"])).toHaveLength(SCOPED_CATALOG.length);
  });

  it("shows only CLUB roles for a campo local viewer", () => {
    const values = scopedValues("LOCAL_FIELD", ["director-lf"]);

    expect(values.sort()).toEqual(["director", "member"]);
    expect(values).not.toContain("director-lf");
    expect(values).not.toContain("coordinator");
    expect(values).not.toContain("director-union");
  });

  it("shows campo local + club (and T5 below LF) for a unión viewer", () => {
    const values = scopedValues("UNION", ["director-union"]);

    expect(values).toEqual(
      expect.arrayContaining([
        "director-lf",
        "assistant-lf",
        "coordinator",
        "pastor",
        "user",
        "director",
        "member",
      ]),
    );
    expect(values).not.toContain("director-union");
    expect(values).not.toContain("assistant-union");
    expect(values).not.toContain("director-dia");
    expect(values).not.toContain("admin");
  });

  it("shows unión downward for a división viewer", () => {
    const values = scopedValues("DIVISION", ["director-dia"]);

    expect(values).toEqual(
      expect.arrayContaining([
        "director-union",
        "assistant-union",
        "director-lf",
        "coordinator",
        "member",
      ]),
    );
    expect(values).not.toContain("director-dia");
    expect(values).not.toContain("assistant-dia");
    expect(values).not.toContain("admin");
    expect(values).not.toContain("super-admin");
  });
});
