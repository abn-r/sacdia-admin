export const CLASS_DETAIL_TABS = ["modules", "honors", "prerequisites"] as const;

export type ClassDetailTab = (typeof CLASS_DETAIL_TABS)[number];

/** Tab from `?tab=`; anything unknown (or repeated) falls back to Módulos. */
export function resolveClassDetailTab(raw: string | string[] | undefined): ClassDetailTab {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (CLASS_DETAIL_TABS as readonly string[]).includes(value ?? "")
    ? (value as ClassDetailTab)
    : "modules";
}
