import { describe, expect, it } from "vitest";

import { buildAuthUser } from "@/lib/auth/testing/auth-user-fixture";
import { filterSidebarItems } from "@/navigation/sidebar/filter-sidebar";
import { sidebarItems, type NavGroup } from "@/navigation/sidebar/sidebar-items";

import { canCapability, canViewScreen, subjectFromUser } from "./index";

const REVIEW = "service-credentials-review";
const REQUIREMENTS = "role-requirements";

function titles(groups: NavGroup[]): string[] {
  return groups.flatMap((group) =>
    group.items.flatMap((item) =>
      "subItems" in item && item.subItems ? item.subItems.map((s) => s.title) : [item.title],
    ),
  );
}

describe("service credentials screens", () => {
  it("opens the review queue with the permission plus the backend capability", () => {
    const reviewer = buildAuthUser({
      roles: ["director-lf"],
      permissions: ["service_credentials:review"],
      capabilities: ["service_credentials.review"],
    });
    expect(canViewScreen(reviewer, REVIEW)).toBe(true);
    expect(canCapability(reviewer, REVIEW, "approve")).toBe(true);
    expect(canCapability(reviewer, REVIEW, "reject")).toBe(true);
  });

  it("denies the queue without the permission or without the capability", () => {
    expect(
      canViewScreen(
        buildAuthUser({ roles: ["director-lf"], permissions: [], capabilities: ["service_credentials.review"] }),
        REVIEW,
      ),
    ).toBe(false);
    expect(
      canViewScreen(
        buildAuthUser({ roles: ["director-lf"], permissions: ["service_credentials:review"], capabilities: [] }),
        REVIEW,
      ),
    ).toBe(false);
  });

  it("gates the requirements screen on role_requirements:manage only", () => {
    const admin = buildAuthUser({ roles: ["admin"], permissions: ["role_requirements:manage"] });
    const reviewer = buildAuthUser({ roles: ["director-lf"], permissions: ["service_credentials:review"] });
    expect(canViewScreen(admin, REQUIREMENTS)).toBe(true);
    expect(canCapability(admin, REQUIREMENTS, "update")).toBe(true);
    expect(canViewScreen(reviewer, REQUIREMENTS)).toBe(false);
  });

  it("shows each sidebar entry only to who can open it", () => {
    const reviewer = buildAuthUser({
      roles: ["director-lf"],
      permissions: ["service_credentials:review"],
      capabilities: ["service_credentials.review"],
    });
    const visible = titles(filterSidebarItems(sidebarItems, subjectFromUser(reviewer)));
    expect(visible).toContain("Constancias de consejería");
    expect(visible).not.toContain("Requisitos de cargos");

    const plain = titles(
      filterSidebarItems(sidebarItems, subjectFromUser(buildAuthUser({ roles: ["director-lf"], permissions: ["users:read"] }))),
    );
    expect(plain).not.toContain("Constancias de consejería");
    expect(plain).not.toContain("Requisitos de cargos");

    const admin = titles(
      filterSidebarItems(
        sidebarItems,
        subjectFromUser(buildAuthUser({ roles: ["admin"], permissions: ["role_requirements:manage"] })),
      ),
    );
    expect(admin).toContain("Requisitos de cargos");
  });
});
