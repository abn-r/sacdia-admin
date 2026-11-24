import type { ScreenDefinition } from "../types";

const DASHBOARD_READ = "dashboard:read";

export const homeScreens: ScreenDefinition[] = [
  {
    id: "home",
    surfaces: ["admin"],
    viewAny: { permissions: [DASHBOARD_READ] },
    capabilities: [
      {
        id: "v2",
        kind: "route",
        href: "/dashboard/v2",
        gate: { permissions: [DASHBOARD_READ] },
      },
    ],
  },
];
