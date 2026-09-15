import { bundleKeys, getScreen } from "./index";
import type { ScreenDefinition } from "./types";

/**
 * Pure planners for the role×permission matrix. Work in permission *keys*;
 * the UI maps keys ↔ ids with the API list. Every plan returns the full next
 * set so callers can apply it with a single `PUT /rbac/roles/:id/permissions`.
 */

export type MatrixPlan =
  | { mode: "single"; key: string; enabled: boolean }
  | { mode: "bulk"; next: Set<string>; reason: "cascade-up" | "cascade-down" | "bundle" };

function viewAnySatisfied(screen: ScreenDefinition, granted: ReadonlySet<string>): boolean {
  const keys = screen.viewAny.permissions ?? [];
  if (keys.length === 0) {
    return true;
  }
  return screen.viewAny.requireAll
    ? keys.every((key) => granted.has(key))
    : keys.some((key) => granted.has(key));
}

/**
 * Toggling one key inside a screen group:
 *  - enabling a verb while `viewAny` is not satisfied also grants the
 *    `viewAny` keys (a button without its screen is useless);
 *  - disabling a `viewAny` key that leaves `viewAny` unsatisfied also
 *    revokes every verb of the screen;
 *  - anything else is a plain single toggle.
 */
export function planToggle(
  screenId: string | null,
  granted: ReadonlySet<string>,
  key: string,
  enabled: boolean,
): MatrixPlan {
  const screen = screenId ? getScreen(screenId) : undefined;
  if (!screen || screen.capabilities.length === 0) {
    return { mode: "single", key, enabled };
  }

  const viewAnyKeys = new Set(screen.viewAny.permissions ?? []);
  const isViewAnyKey = viewAnyKeys.has(key);

  if (enabled && !isViewAnyKey && !viewAnySatisfied(screen, granted)) {
    const next = new Set(granted);
    next.add(key);
    for (const viewKey of viewAnyKeys) {
      next.add(viewKey);
    }
    return { mode: "bulk", next, reason: "cascade-up" };
  }

  if (!enabled && isViewAnyKey) {
    const after = new Set(granted);
    after.delete(key);
    if (!viewAnySatisfied(screen, after)) {
      for (const bundleKey of bundleKeys(screen)) {
        after.delete(bundleKey);
      }
      return { mode: "bulk", next: after, reason: "cascade-down" };
    }
  }

  return { mode: "single", key, enabled };
}

/** "Pantalla completa": grant or revoke every key in the screen bundle. */
export function planBundle(
  screenId: string,
  granted: ReadonlySet<string>,
  enabled: boolean,
): MatrixPlan | null {
  const screen = getScreen(screenId);
  if (!screen) {
    return null;
  }
  const next = new Set(granted);
  for (const key of bundleKeys(screen)) {
    if (enabled) {
      next.add(key);
    } else {
      next.delete(key);
    }
  }
  return { mode: "bulk", next, reason: "bundle" };
}

export type BundleState = "none" | "some" | "all";

export function bundleState(
  keysInGroup: readonly string[],
  granted: ReadonlySet<string>,
): BundleState {
  if (keysInGroup.length === 0) {
    return "none";
  }
  const count = keysInGroup.filter((key) => granted.has(key)).length;
  if (count === 0) return "none";
  return count === keysInGroup.length ? "all" : "some";
}
