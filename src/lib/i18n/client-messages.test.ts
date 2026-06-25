import { describe, expect, it } from "vitest";
import { getClientMessageNamespacesForDashboardPath } from "./client-messages";

describe("getClientMessageNamespacesForDashboardPath", () => {
  const dashboardMessages = {
    classes: {},
    clubs: {},
    dashboardHub: {},
    evidence_review: {},
    honors: {},
    investiture: {},
    membership: {},
    nav: {},
    requests: {},
    roles: {},
    shared: {},
    system_jobs: {},
    units_admin: {},
    users: {},
  };

  it("returns all dashboard messages because dashboard layouts are preserved during client navigation", () => {
    expect(
      getClientMessageNamespacesForDashboardPath(
        "/dashboard/clubs/1",
        dashboardMessages,
      ),
    ).toEqual(Object.keys(dashboardMessages));
  });

  it.each([
    {
      pathname: "/dashboard/clubs/1?tab=overview",
      namespaces: ["clubs", "classes", "users"],
    },
    {
      pathname: "/dashboard/clubs/1?tab=membership",
      namespaces: ["clubs", "membership", "requests", "users"],
    },
    {
      pathname: "/dashboard/clubs/1?tab=sections",
      namespaces: ["clubs", "requests", "units_admin", "users"],
    },
    {
      pathname: "/dashboard/requests/transfers",
      namespaces: ["requests", "membership", "clubs", "users"],
    },
    {
      pathname: "/dashboard/evidence-review",
      namespaces: ["evidence_review", "classes", "honors", "users"],
    },
    {
      pathname: "/dashboard/investiture/pipeline",
      namespaces: ["investiture", "classes", "clubs", "users"],
    },
  ])(
    "keeps required client i18n namespaces for $pathname",
    ({ pathname, namespaces }) => {
      expect(
        getClientMessageNamespacesForDashboardPath(pathname, dashboardMessages),
      ).toEqual(expect.arrayContaining(namespaces));
    },
  );

  it("includes roles on the dashboard home because role charts translate role names", () => {
    expect(
      getClientMessageNamespacesForDashboardPath("/dashboard", dashboardMessages),
    ).toContain("roles");
  });

  it("keeps route-specific namespaces for evidence review", () => {
    expect(
      getClientMessageNamespacesForDashboardPath(
        "/dashboard/evidence-review",
        dashboardMessages,
      ),
    ).toEqual(
      expect.arrayContaining(["evidence_review", "roles", "shared"]),
    );
  });

  it("includes requests on club detail pages because membership panels render request tables", () => {
    expect(
      getClientMessageNamespacesForDashboardPath(
        "/dashboard/clubs/1?tab=membership",
        dashboardMessages,
      ),
    ).toEqual(expect.arrayContaining(["clubs", "membership", "requests"]));
  });
});
