"use client";

import { buildThemeBootScript } from "@/scripts/theme-boot";

/**
 * React 19 warns when a <script> is rendered during client render.
 * SSR emits the boot script once; client hydration skips re-rendering it.
 */
export function ThemeBootScript() {
  if (typeof window !== "undefined") return null;

  /* biome-ignore lint/security/noDangerouslySetInnerHtml: pre-hydration boot script, SSR-only */
  return (
    <script
      id="theme-boot"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: buildThemeBootScript() }}
    />
  );
}
