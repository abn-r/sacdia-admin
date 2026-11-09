import { describe, expect, it } from "vitest";

import { CONFIGURATION_EXTRA_MATCH_PATHS } from "./index-pages";
import { getBestMatchLength, isLeafActive, isSubItemActiveFor, matchesNavPath } from "./nav-match";
import type { NavGroup } from "./sidebar-items";

const groups: NavGroup[] = [
  {
    id: 1,
    items: [
      { id: "clubs", title: "Clubes", url: "/dashboard/clubs", activeMatch: "clubs-list" },
      {
        id: "parent",
        title: "Padre",
        subItems: [{ id: "val", title: "Validaciones", url: "/dashboard/clubs/validations", activeMatch: "prefix" }],
      },
    ],
  },
  {
    id: 2,
    items: [{ id: "activities", title: "Actividades", url: "/dashboard/clubs/activities", activeMatch: "prefix" }],
  },
];

describe("nav-match", () => {
  it("only the most specific item is active on /dashboard/clubs/activities", () => {
    const path = "/dashboard/clubs/activities";
    const best = getBestMatchLength(path, groups);
    expect(isLeafActive(path, { url: "/dashboard/clubs", activeMatch: "clubs-list" }, best)).toBe(false);
    expect(isLeafActive(path, { url: "/dashboard/clubs/activities", activeMatch: "prefix" }, best)).toBe(true);
  });

  it("Clubes stays active on a club detail path", () => {
    const path = "/dashboard/clubs/42";
    const best = getBestMatchLength(path, groups);
    expect(isLeafActive(path, { url: "/dashboard/clubs", activeMatch: "clubs-list" }, best)).toBe(true);
  });

  it("nested sub items resolve through the shared best length", () => {
    const path = "/dashboard/clubs/validations/7";
    const best = getBestMatchLength(path, groups);
    const subItem = groups[0].items[1].subItems?.[0];
    expect(subItem).toBeDefined();
    expect(isSubItemActiveFor(path, subItem!, best)).toBe(true);
  });
});

describe("nav-match with index pages", () => {
  const indexed: NavGroup[] = [
    {
      id: 1,
      items: [
        { id: "clubs", title: "Clubes", url: "/dashboard/clubs", activeMatch: "clubs-list" },
        { id: "activities", title: "Actividades", url: "/dashboard/clubs/activities", activeMatch: "prefix" },
        {
          id: "validations",
          title: "Validaciones",
          subItems: [
            {
              id: "evidence-folders",
              title: "Carpetas",
              url: "/dashboard/clubs/evidence-folders",
              activeMatch: "evidence-folders",
            },
          ],
        },
        {
          id: "notifications",
          title: "Notificaciones",
          subItems: [
            {
              id: "notifications-hub",
              title: "Resumen",
              url: "/dashboard/configuration/notifications",
              activeMatch: "exact",
            },
          ],
        },
      ],
    },
    {
      id: 2,
      items: [
        { id: "admin-catalogs", title: "Catálogos", url: "/dashboard/catalogs", activeMatch: "prefix" },
        {
          id: "admin-settings",
          title: "Configuración",
          url: "/dashboard/configuration",
          activeMatch: "prefix",
          matchPaths: CONFIGURATION_EXTRA_MATCH_PATHS,
        },
      ],
    },
  ];

  const activeIds = (path: string): string[] => {
    const best = getBestMatchLength(path, indexed);
    const out: string[] = [];
    for (const group of indexed) {
      for (const item of group.items) {
        if ("subItems" in item && item.subItems) {
          for (const sub of item.subItems) if (isSubItemActiveFor(path, sub, best)) out.push(sub.id);
        } else if (isLeafActive(path, item, best)) {
          out.push(item.id);
        }
      }
    }
    return out;
  };

  it.each([
    ["/dashboard/catalogs", "admin-catalogs"],
    ["/dashboard/catalogs/honors", "admin-catalogs"],
    ["/dashboard/catalogs/honors/12/edit", "admin-catalogs"],
    ["/dashboard/configuration", "admin-settings"],
    ["/dashboard/configuration/roles", "admin-settings"],
    ["/dashboard/configuration/permissions/3", "admin-settings"],
    ["/dashboard/investiture-settings", "admin-settings"],
    ["/dashboard/investiture-pastors", "admin-settings"],
    ["/dashboard/clubs/evidence-folders/templates", "admin-settings"],
    ["/dashboard/system/jobs/history", "admin-settings"],
    ["/dashboard/settings/scoring-categories", "admin-settings"],
    ["/dashboard/campamentos/configuracion/union", "admin-settings"],
    ["/dashboard/configuration/local-field/delivery", "admin-settings"],
  ])("%s highlights only %s", (path, id) => {
    expect(activeIds(path)).toEqual([id]);
  });

  it("keeps the notifications entry, not Configuración, on its own hub", () => {
    expect(activeIds("/dashboard/configuration/notifications")).toEqual(["notifications-hub"]);
  });

  it("Clubes and Actividades are never active together", () => {
    expect(activeIds("/dashboard/clubs/activities")).toEqual(["activities"]);
    expect(activeIds("/dashboard/clubs/activities/new")).toEqual(["activities"]);
    expect(activeIds("/dashboard/clubs/42")).toEqual(["clubs"]);
    expect(activeIds("/dashboard/clubs")).toEqual(["clubs"]);
  });

  it("clubs-list does not claim the activities path even alone", () => {
    expect(matchesNavPath("/dashboard/clubs/activities", "/dashboard/clubs", "clubs-list")).toBe(false);
  });

  it("evidence folders list stays active for the folder pages", () => {
    expect(activeIds("/dashboard/clubs/evidence-folders")).toEqual(["evidence-folders"]);
  });
});
