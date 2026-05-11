import type React from "react";

export const STAGGER_CLASSES =
  "animate-in fade-in slide-in-from-bottom-2 duration-300";

export function getStaggerStyle(
  index: number,
  step = 40,
  cap = 400,
): React.CSSProperties {
  return {
    animationDelay: `${Math.min(index * step, cap)}ms`,
    animationFillMode: "backwards",
  };
}
