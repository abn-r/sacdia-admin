import { describe, expect, it } from "vitest";

import type { DashboardMetrics } from "@/lib/api/operations-dashboard";

import { sidebarCountsFromQueues } from "./sidebar-insights";

function queues(overrides: Partial<DashboardMetrics["queues"]> = {}): DashboardMetrics["queues"] {
  return {
    role_assignments_pending: 0,
    transfers_pending: 0,
    class_validations_pending: 0,
    honors_review_pending: 0,
    annual_folders_pending_union: 0,
    ...overrides,
  } as DashboardMetrics["queues"];
}

describe("sidebarCountsFromQueues", () => {
  it("attaches the four queues to the redesigned sidebar ids", () => {
    expect(
      sidebarCountsFromQueues(
        queues({
          role_assignments_pending: 3,
          transfers_pending: 2,
          class_validations_pending: 4,
          honors_review_pending: 5,
          annual_folders_pending_union: 7,
        }),
      ),
    ).toEqual({
      "requests-assignments": 3,
      "requests-transfers": 2,
      "validations-investitures": 9,
      "clubs-evidence-folders-list": 7,
    });
  });

  it("no longer reports the removed annual-folders-evaluate id", () => {
    const counts = sidebarCountsFromQueues(queues({ annual_folders_pending_union: 1 }));
    expect(counts).not.toHaveProperty("annual-folders-evaluate");
  });

  it("omits queues with no pending work or invalid values", () => {
    expect(sidebarCountsFromQueues(queues({ transfers_pending: Number.NaN }))).toEqual({});
  });
});
