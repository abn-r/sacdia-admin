import type React from "react";

/** Strong ease-out for UI entrances (Emil / animations.dev). */
export const EASE_OUT_EXPO = "cubic-bezier(0.23, 1, 0.32, 1)";

/** Drawer / sheet curve. */
export const EASE_DRAWER = "cubic-bezier(0.32, 0.72, 0, 1)";

/** Press feedback scale — subtle, never below ~0.95. */
export const PRESS_SCALE = "0.97";

const STAGGER_BASE =
  "motion-reduce:animate-none animate-in fade-in slide-in-from-bottom-1 fill-mode-backwards duration-250 [animation-timing-function:var(--ease-out-expo)]";

/** Table rows, list items — cap stagger so long lists stay snappy. */
export const STAGGER_CLASSES = STAGGER_BASE;

/** Page sections and cards. Keep under ~300ms — navigation is frequent. */
export const PAGE_ENTER_CLASSES =
  "motion-reduce:animate-none animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards duration-250 [animation-timing-function:var(--ease-out-expo)]";

/** Empty states and placeholders. */
export const EMPTY_STATE_ENTER_CLASSES =
  "motion-reduce:animate-none animate-in fade-in zoom-in-95 fill-mode-backwards duration-300 [animation-timing-function:var(--ease-out-expo)]";

/** Overlay surfaces: dialog, popover, dropdown, select. */
export const SURFACE_MOTION_CLASSES =
  "duration-200 motion-reduce:animate-none motion-reduce:transition-none [animation-timing-function:var(--ease-out-expo)]";

/**
 * Stagger delay for list/table entrances.
 * Prefer 30–80ms steps; cap keeps long lists from feeling sluggish.
 */
export function getStaggerStyle(
  index: number,
  step = 40,
  cap = 200,
): React.CSSProperties {
  return {
    animationDelay: `${Math.min(index * step, cap)}ms`,
    animationFillMode: "backwards",
  };
}
