import { describe, expect, it } from "vitest";

import {
  OTHER_SCREEN_GROUP_ID,
} from "@/lib/auth/screen-catalog";

import {
  buildPickerGroups,
  classifyPickerBucket,
  permissionMatchesSurfaceFilter,
  permissionStub,
  pickerScreenIdForKey,
  screensForPermissionKey,
  surfacesForPermissionKey,
} from "./permission-picker-groups";

describe("permission surfaces", () => {
  it("marks users:read_detail as panel + app", () => {
    const screenIds = screensForPermissionKey("users:read_detail").map(
      (screen) => screen.id,
    );
    expect(screenIds).toContain("users");
    expect(screenIds).toContain("app-members");
    expect(surfacesForPermissionKey("users:read_detail")).toEqual([
      "admin",
      "app",
    ]);
    expect(permissionMatchesSurfaceFilter("users:read_detail", "shared")).toBe(
      true,
    );
  });

  it("keeps users:create on the panel only", () => {
    expect(surfacesForPermissionKey("users:create")).toEqual(["admin"]);
    expect(permissionMatchesSurfaceFilter("users:create", "app")).toBe(false);
    expect(permissionMatchesSurfaceFilter("users:create", "admin")).toBe(true);
    expect(permissionMatchesSurfaceFilter("users:create", "shared")).toBe(
      false,
    );
  });
});

describe("pickerScreenIdForKey", () => {
  it("places a shared key on the app screen when filtering app", () => {
    expect(pickerScreenIdForKey("users:read_detail", "all")).toBe("users");
    expect(pickerScreenIdForKey("users:read_detail", "admin")).toBe("users");
    expect(pickerScreenIdForKey("users:read_detail", "app")).toBe("app-members");
  });

  it("sends unknown keys to other", () => {
    expect(pickerScreenIdForKey("totally:unknown", "all")).toBe(
      OTHER_SCREEN_GROUP_ID,
    );
  });
});

describe("classifyPickerBucket", () => {
  const users = screensForPermissionKey("users:read")[0] ?? null;

  it("splits list, alta, ficha and health on the users screen", () => {
    expect(classifyPickerBucket("users:read", users)).toBe("view");
    expect(classifyPickerBucket("users:create", users)).toBe("routes");
    expect(classifyPickerBucket("users:read_detail", users)).toBe("routes");
    expect(classifyPickerBucket("health:read", users)).toBe("sensitive");
    expect(classifyPickerBucket("users:update_admin", users)).toBe("actions");
    expect(classifyPickerBucket("finances:delete", users)).toBe("destructive");
  });
});

describe("buildPickerGroups", () => {
  const permissions = [
    permissionStub("create", "users:create"),
    permissionStub("detail", "users:read_detail"),
    permissionStub("health", "health:read"),
    permissionStub("orphan", "totally:unknown"),
  ];

  it("nests health away from create under users", () => {
    const groups = buildPickerGroups(permissions, "all");
    const users = groups.find((group) => group.screenId === "users");
    expect(users).toBeDefined();
    expect(
      users!.buckets.map((bucket) => [
        bucket.id,
        bucket.items.map((item) => item.permission.permission_name),
      ]),
    ).toEqual([
      ["routes", ["users:create", "users:read_detail"]],
      ["sensitive", ["health:read"]],
    ]);
    expect(users!.items.find((item) => item.permission.permission_id === "detail")
      ?.surfaces).toEqual(["admin", "app"]);
  });

  it("shows the shared key under app-members on the app filter", () => {
    const groups = buildPickerGroups(permissions, "app");
    expect(groups.map((group) => group.screenId)).toEqual(["app-members"]);
    expect(
      groups[0]!.items.map((item) => item.permission.permission_name),
    ).toEqual(["users:read_detail"]);
  });

  it("hides panel-only keys from the app filter", () => {
    const groups = buildPickerGroups(permissions, "app");
    const names = groups.flatMap((group) =>
      group.items.map((item) => item.permission.permission_name),
    );
    expect(names).not.toContain("users:create");
    expect(names).not.toContain("health:read");
  });

  it("keeps orphans in all, not in surface filters", () => {
    const all = buildPickerGroups(permissions, "all");
    expect(all.some((group) => group.screenId === OTHER_SCREEN_GROUP_ID)).toBe(
      true,
    );
    expect(buildPickerGroups(permissions, "admin").some((group) => group.screenId === OTHER_SCREEN_GROUP_ID)).toBe(
      false,
    );
  });
});
