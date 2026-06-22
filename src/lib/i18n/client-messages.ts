type Messages = Record<string, unknown>;

export const ROOT_CLIENT_MESSAGE_NAMESPACES = [
  "auth",
  "nav",
  "shared",
] as const;

const DASHBOARD_BASE_NAMESPACES = [
  "dashboardHub",
  "nav",
  "selectors",
  "shared",
  "translations",
] as const;

const DASHBOARD_ROUTE_NAMESPACES: Array<{
  prefix: string;
  namespaces: readonly string[];
}> = [
  { prefix: "/dashboard/achievements", namespaces: ["achievements", "classes", "honors"] },
  { prefix: "/dashboard/activities", namespaces: ["activities", "clubs"] },
  { prefix: "/dashboard/annual-folders", namespaces: ["annual_folders", "clubs", "rankings", "scoring_categories"] },
  { prefix: "/dashboard/camporees", namespaces: ["camporees", "camporeeEvents", "classes", "clubs", "units_admin", "users"] },
  {
    prefix: "/dashboard/catalogs",
    namespaces: [
      "catalogs",
      "camporeeEvents",
      "classes",
      "finances",
      "folders",
      "honor_categories",
      "honors",
      "inventory",
      "resource_categories",
      "scoring_categories",
    ],
  },
  { prefix: "/dashboard/certificate-bulk-imports", namespaces: ["certificate_bulk_imports", "users"] },
  { prefix: "/dashboard/certifications", namespaces: ["certifications", "classes", "users"] },
  { prefix: "/dashboard/classes", namespaces: ["classes", "users"] },
  { prefix: "/dashboard/clubs", namespaces: ["clubs", "classes", "enrollments", "member_of_month", "membership", "units_admin", "users"] },
  { prefix: "/dashboard/coordination", namespaces: ["coordinationAdmin", "clubs", "users"] },
  { prefix: "/dashboard/enrollments", namespaces: ["enrollments", "classes", "clubs", "users"] },
  { prefix: "/dashboard/evidence-review", namespaces: ["evidence_review", "classes", "honors", "users"] },
  { prefix: "/dashboard/finances", namespaces: ["finances", "clubs"] },
  { prefix: "/dashboard/honors", namespaces: ["honors", "catalogs", "classes"] },
  { prefix: "/dashboard/insurance", namespaces: ["insurance", "clubs", "users"] },
  { prefix: "/dashboard/inventory", namespaces: ["inventory", "clubs"] },
  { prefix: "/dashboard/investiture", namespaces: ["investiture", "classes", "clubs", "users"] },
  { prefix: "/dashboard/member-of-month", namespaces: ["member_of_month", "clubs", "units_admin", "users"] },
  { prefix: "/dashboard/member-ranking-weights", namespaces: ["memberRankingWeights", "rankings"] },
  { prefix: "/dashboard/member-rankings", namespaces: ["rankings", "clubs", "users"] },
  { prefix: "/dashboard/notifications", namespaces: ["notifications", "units_admin", "users"] },
  { prefix: "/dashboard/ranking-weights", namespaces: ["rankingWeights", "rankings"] },
  { prefix: "/dashboard/rbac", namespaces: ["rbac", "permissions", "roles", "users"] },
  { prefix: "/dashboard/reports", namespaces: ["reports", "clubs", "users"] },
  { prefix: "/dashboard/requests", namespaces: ["requests", "membership", "clubs", "users"] },
  { prefix: "/dashboard/resources", namespaces: ["resources", "resource_categories"] },
  { prefix: "/dashboard/section-rankings", namespaces: ["rankings", "clubs", "users"] },
  { prefix: "/dashboard/settings/scoring-categories", namespaces: ["settings", "scoring_categories"] },
  { prefix: "/dashboard/settings", namespaces: ["settings", "system_config"] },
  { prefix: "/dashboard/sla", namespaces: ["sla", "clubs"] },
  { prefix: "/dashboard/system/jobs", namespaces: ["system_jobs"] },
  { prefix: "/dashboard/system", namespaces: ["system_config"] },
  { prefix: "/dashboard/users", namespaces: ["users", "admin_users", "clubs", "membership", "rbac", "roles"] },
  { prefix: "/dashboard/validation", namespaces: ["validation_admin", "users"] },
  { prefix: "/dashboard/year-end", namespaces: ["year_end", "clubs"] },
];

export function pickMessages(
  messages: object,
  namespaces: readonly string[],
): Messages {
  const source = messages as Messages;
  const result: Messages = {};

  for (const namespace of namespaces) {
    if (Object.prototype.hasOwnProperty.call(source, namespace)) {
      result[namespace] = source[namespace];
    }
  }

  return result;
}

export function getClientMessageNamespacesForDashboardPath(
  pathname: string,
  messages: object,
): string[] {
  const matched = DASHBOARD_ROUTE_NAMESPACES.find(({ prefix }) =>
    pathname.startsWith(prefix),
  );

  if (!matched && pathname !== "/dashboard") {
    // Unknown dashboard route: prefer correctness over over-optimization.
    return Object.keys(messages);
  }

  return Array.from(
    new Set([
      ...DASHBOARD_BASE_NAMESPACES,
      ...(matched?.namespaces ?? ["users", "clubs", "honors"]),
    ]),
  );
}
