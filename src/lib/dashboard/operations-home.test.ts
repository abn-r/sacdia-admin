import { describe, expect, it } from "vitest";
import type { DashboardMetrics } from "@/lib/api/operations-dashboard";
import { buildWorkQueue, hrefPath } from "@/lib/dashboard/operations-home";

function metrics(overrides: Partial<DashboardMetrics["queues"]>): DashboardMetrics {
  return {
    administrative_clubs: { total: 2, active: 2, inactive: 0 },
    operations: {
      operational_clubs: 1,
      non_operational_clubs: 1,
      operational_sections: 2,
      operational_rate_pct: 50,
    },
    people: {
      institutionally_active: 10,
      platform_accounts: { active: 10, inactive: 0 },
    },
    classes: { total_enrollments: 4, distinct_people: 4, by_class: [] },
    monthly_reports: {
      expected_sections: 2,
      submitted_sections: 0,
      draft_sections: 0,
      generated_sections: 0,
      missing_sections: 2,
      coverage_pct: 0,
    },
    honors: {
      in_progress: 1,
      pending_review: 3,
      approved: 1,
      attribution: "current_affiliation",
    },
    activities: {
      registered: 8,
      joint_registered: 1,
      distinct_participating_sections: 2,
    },
    queues: {
      role_assignments_pending: 0,
      transfers_pending: 0,
      class_validations_pending: 0,
      honors_review_pending: 0,
      annual_folders_pending_union: 0,
      ...overrides,
    },
  };
}

describe("operations home queue", () => {
  it("keeps only pending queues and sorts by count", () => {
    const queue = buildWorkQueue(
      metrics({
        role_assignments_pending: 0,
        transfers_pending: 1,
        class_validations_pending: 4,
        honors_review_pending: 3,
        annual_folders_pending_union: 0,
      }),
    );

    expect(queue.map((item) => item.id)).toEqual(["classes", "honors", "transfers"]);
    expect(queue[0]?.href).toContain("/dashboard/clubs/validations");
  });

  it("drops unavailable honors review instead of coercing to zero", () => {
    const queue = buildWorkQueue(
      metrics({
        honors_review_pending: null,
        transfers_pending: 2,
      }),
    );

    expect(queue.map((item) => item.id)).toEqual(["transfers"]);
  });

  it("strips query strings for access checks", () => {
    expect(hrefPath("/dashboard/clubs/validations?tab=honors")).toBe(
      "/dashboard/clubs/validations",
    );
  });
});
