import type { CamporeeKind } from "@/lib/camporees/normalize";

export const CAMPOREE_GROUPS = [
  "summary",
  "registrations",
  "money",
  "program",
  "scores",
] as const;
export type CamporeeGroup = (typeof CAMPOREE_GROUPS)[number];

export const CAMPOREE_GROUP_VIEWS = {
  summary: [],
  registrations: ["pending", "members", "clubs"],
  money: ["payments", "orders", "merchandise", "supplies"],
  program: ["events", "staff"],
  scores: ["judges", "entry", "results"],
} as const satisfies Record<CamporeeGroup, readonly string[]>;

export type CamporeeViewOf<G extends CamporeeGroup> =
  (typeof CAMPOREE_GROUP_VIEWS)[G][number];

export type CamporeeLocation = { group: CamporeeGroup; view: string | null };

/**
 * The detail used to have 12 flat tabs. Links and redirects written for them
 * (`?tab=events`, `?tab=payments`…) still land on the right group and view.
 */
const LEGACY_TABS: Record<string, CamporeeLocation> = {
  info: { group: "summary", view: null },
  members: { group: "registrations", view: "members" },
  clubs: { group: "registrations", view: "clubs" },
  payments: { group: "money", view: "payments" },
  "payment-orders": { group: "money", view: "orders" },
  "merchandise-orders": { group: "money", view: "merchandise" },
  supplies: { group: "money", view: "supplies" },
  events: { group: "program", view: "events" },
  staff: { group: "program", view: "staff" },
  judges: { group: "scores", view: "judges" },
  scores: { group: "scores", view: "entry" },
  ranking: { group: "scores", view: "results" },
};

export function defaultViewOf(group: CamporeeGroup): string | null {
  return CAMPOREE_GROUP_VIEWS[group][0] ?? null;
}

/** Resolves `?tab=&view=` (new or legacy values) to a valid group and view. */
export function resolveCamporeeLocation(
  tab: string | null | undefined,
  view?: string | null,
): CamporeeLocation {
  const value = tab?.trim() ?? "";
  if ((CAMPOREE_GROUPS as readonly string[]).includes(value)) {
    const group = value as CamporeeGroup;
    const views = CAMPOREE_GROUP_VIEWS[group] as readonly string[];
    return {
      group,
      view: view && views.includes(view) ? view : defaultViewOf(group),
    };
  }
  const legacy = LEGACY_TABS[value];
  if (legacy) return legacy;
  return { group: "summary", view: null };
}

export function camporeeBasePath(kind: CamporeeKind, id: number | string): string {
  return kind === "union"
    ? `/dashboard/campamentos/union/${id}`
    : `/dashboard/campamentos/${id}`;
}

/** Detail URL for a group (and view). The summary is the bare path. */
export function camporeeGroupHref(
  kind: CamporeeKind,
  id: number | string,
  group: CamporeeGroup,
  view?: string | null,
): string {
  const base = camporeeBasePath(kind, id);
  if (group === "summary") return base;
  const params = new URLSearchParams({ tab: group });
  if (view && view !== defaultViewOf(group)) params.set("view", view);
  return `${base}?${params.toString()}`;
}

const GROUP_SET = new Set<string>(CAMPOREE_GROUPS);

/**
 * `?tab=events`-style URLs from before the grouping. Returns the canonical URL
 * (keeping every other parameter, e.g. the event filters) or `null` when the
 * URL is already canonical.
 */
export function legacyDetailRedirect(
  kind: CamporeeKind,
  id: number | string,
  searchParams: Record<string, string | string[] | undefined>,
): string | null {
  const tab = typeof searchParams.tab === "string" ? searchParams.tab : undefined;
  if (!tab || GROUP_SET.has(tab) || !(tab in LEGACY_TABS)) return null;
  const target = LEGACY_TABS[tab];
  if (!target) return null;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "tab" || key === "view" || typeof value !== "string") continue;
    params.set(key, value);
  }
  if (target.group !== "summary") params.set("tab", target.group);
  if (target.view && target.view !== defaultViewOf(target.group)) params.set("view", target.view);
  const base = camporeeBasePath(kind, id);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
