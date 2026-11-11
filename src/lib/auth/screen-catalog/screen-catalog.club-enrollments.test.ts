import { describe, expect, it } from "vitest";

import { buildAuthUser } from "@/lib/auth/testing/auth-user-fixture";
import { filterSidebarItems } from "@/navigation/sidebar/filter-sidebar";
import { sidebarItems, type NavGroup } from "@/navigation/sidebar/sidebar-items";

import { canCapability, canViewScreen, subjectFromUser } from "./index";

const SCREEN = "club-enrollments-review";

function titles(groups: NavGroup[]): string[] {
  return groups.flatMap((group) =>
    group.items.flatMap((item) =>
      "subItems" in item && item.subItems ? item.subItems.map((s) => s.title) : [item.title],
    ),
  );
}

describe("club enrollments review screen", () => {
  it("opens with the permission plus the backend capability and allows the verbs", () => {
    const reviewer = buildAuthUser({
      roles: ["director-lf"],
      permissions: ["club_enrollments:validate"],
      capabilities: ["club_enrollments.validate"],
    });
    expect(canViewScreen(reviewer, SCREEN)).toBe(true);
    expect(canCapability(reviewer, SCREEN, "validate")).toBe(true);
  });

  it("denies without the permission or without the capability", () => {
    expect(
      canViewScreen(
        buildAuthUser({ roles: ["director-lf"], permissions: [], capabilities: ["club_enrollments.validate"] }),
        SCREEN,
      ),
    ).toBe(false);
    expect(
      canViewScreen(
        buildAuthUser({ roles: ["director-lf"], permissions: ["club_enrollments:validate"], capabilities: [] }),
        SCREEN,
      ),
    ).toBe(false);
  });

  it("shows the sidebar entry only to who can open it", () => {
    const reviewer = buildAuthUser({
      roles: ["director-lf"],
      permissions: ["club_enrollments:validate"],
      capabilities: ["club_enrollments.validate"],
    });
    const outsider = buildAuthUser({ roles: ["director-lf"], permissions: ["users:read"], capabilities: [] });
    expect(titles(filterSidebarItems(sidebarItems, subjectFromUser(reviewer)))).toContain("Inscripciones de sección");
    expect(titles(filterSidebarItems(sidebarItems, subjectFromUser(outsider)))).not.toContain(
      "Inscripciones de sección",
    );
  });
});
