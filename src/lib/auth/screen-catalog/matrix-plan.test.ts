import { describe, expect, it } from "vitest";

import { bundleKeys, getScreen } from "./index";
import { bundleState, planBundle, planToggle } from "./matrix-plan";

describe("planToggle", () => {
  it("cascades viewAny when a verb is granted to a role without the screen", () => {
    const plan = planToggle("users", new Set(), "users:create", true);
    expect(plan.mode).toBe("bulk");
    if (plan.mode === "bulk") {
      expect(plan.reason).toBe("cascade-up");
      expect([...plan.next].sort()).toEqual(["users:create", "users:read"]);
    }
  });

  it("stays single when viewAny is already satisfied", () => {
    const plan = planToggle(
      "users",
      new Set(["users:read"]),
      "users:create",
      true,
    );
    expect(plan).toEqual({ mode: "single", key: "users:create", enabled: true });
  });

  it("revokes every verb when viewAny is removed", () => {
    const granted = new Set(["users:read", "users:create", "clubs:read"]);
    const plan = planToggle("users", granted, "users:read", false);
    expect(plan.mode).toBe("bulk");
    if (plan.mode === "bulk") {
      expect(plan.reason).toBe("cascade-down");
      expect([...plan.next]).toEqual(["clubs:read"]);
    }
  });

  it("is a plain toggle for screens without capabilities and for orphans", () => {
    expect(planToggle("clubs", new Set(), "clubs:read", true)).toEqual({
      mode: "single",
      key: "clubs:read",
      enabled: true,
    });
    expect(planToggle(null, new Set(), "x:y", false)).toEqual({
      mode: "single",
      key: "x:y",
      enabled: false,
    });
  });
});

describe("planBundle", () => {
  it("grants and revokes the whole bundle", () => {
    const keys = bundleKeys(getScreen("users")!);
    const grant = planBundle("users", new Set(["clubs:read"]), true);
    expect(grant?.mode).toBe("bulk");
    if (grant?.mode === "bulk") {
      for (const key of keys) expect(grant.next.has(key)).toBe(true);
      expect(grant.next.has("clubs:read")).toBe(true);
    }

    const revoke = planBundle("users", new Set([...keys, "clubs:read"]), false);
    if (revoke?.mode === "bulk") {
      expect([...revoke.next]).toEqual(["clubs:read"]);
    }
  });

  it("returns null for unknown screens", () => {
    expect(planBundle("ghost", new Set(), true)).toBeNull();
  });
});

describe("bundleState", () => {
  it("reports none / some / all", () => {
    expect(bundleState(["a", "b"], new Set())).toBe("none");
    expect(bundleState(["a", "b"], new Set(["a"]))).toBe("some");
    expect(bundleState(["a", "b"], new Set(["a", "b"]))).toBe("all");
    expect(bundleState([], new Set(["a"]))).toBe("none");
  });
});
