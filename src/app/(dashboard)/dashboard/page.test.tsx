import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthUser } from "@/lib/auth/types";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

const requireAdminUserMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  requireAdminUser: () => requireAdminUserMock(),
}));

const fetchDashboardMock = vi.fn();
vi.mock("@/lib/api/operations-dashboard", () => ({
  fetchOperationsDashboard: (...args: unknown[]) => fetchDashboardMock(...args),
  parseOperationsDashboardSearchParams: () => ({}),
}));

vi.mock("@/components/dashboard/operations-dashboard-view", () => ({
  OperationsDashboardView: () => null,
}));
vi.mock("@/components/dashboard/operations-dashboard-error", () => ({
  OperationsDashboardError: () => null,
}));

import DashboardHomePage from "./page";

function buildUser(roles: string[]): AuthUser {
  return {
    id: "actor",
    email: "actor@example.com",
    roles,
    authorization: {
      grants: { global_roles: roles.map((role_name) => ({ role_name })) },
      effective: { permissions: ["dashboard:read"] },
    },
  };
}

describe("DashboardHomePage", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    requireAdminUserMock.mockReset();
    fetchDashboardMock.mockReset();
    fetchDashboardMock.mockResolvedValue({});
  });

  it("sends a pastor-only user to the authorization list without loading the dashboard", async () => {
    requireAdminUserMock.mockResolvedValue(buildUser(["pastor"]));

    await expect(
      DashboardHomePage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard/investiture-requests");

    expect(redirectMock).toHaveBeenCalledWith("/dashboard/investiture-requests");
    expect(fetchDashboardMock).not.toHaveBeenCalled();
  });

  it("keeps the current home for director-lf", async () => {
    requireAdminUserMock.mockResolvedValue(buildUser(["director-lf"]));

    await DashboardHomePage({ searchParams: Promise.resolve({}) });

    expect(redirectMock).not.toHaveBeenCalled();
    expect(fetchDashboardMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the current home for a pastor who also holds another admin role", async () => {
    requireAdminUserMock.mockResolvedValue(buildUser(["pastor", "director-lf"]));

    await DashboardHomePage({ searchParams: Promise.resolve({}) });

    expect(redirectMock).not.toHaveBeenCalled();
  });
});
