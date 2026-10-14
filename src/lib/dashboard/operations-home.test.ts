import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  DashboardMetrics,
  OperationsDashboardChild,
  OperationsDashboardScope,
} from "@/lib/api/operations-dashboard";
import type { AuthUser } from "@/lib/auth/types";

vi.mock("@/lib/auth/require-page-access", () => ({
  canAccessDashboardPath: vi.fn(),
}));

import { canAccessDashboardPath } from "@/lib/auth/require-page-access";
import {
  buildWorkQueue,
  childGap,
  dispatchSummary,
  hrefPath,
  laggingClubs,
  OPERATIONS_QUEUE_HREFS,
  rankChildrenByGap,
  resolveHomeMode,
  supervisionSummary,
  visibleWorkQueue,
} from "@/lib/dashboard/operations-home";

const mockCanAccess = vi.mocked(canAccessDashboardPath);

function metrics(
  overrides: {
    queues?: Partial<DashboardMetrics["queues"]>;
    reports?: Partial<DashboardMetrics["monthly_reports"]>;
    nonOperational?: number;
  } = {},
): DashboardMetrics {
  return {
    administrative_clubs: { total: 2, active: 2, inactive: 0 },
    operations: {
      operational_clubs: 1,
      non_operational_clubs: overrides.nonOperational ?? 0,
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
      submitted_sections: 2,
      draft_sections: 0,
      generated_sections: 0,
      missing_sections: 0,
      coverage_pct: 100,
      ...overrides.reports,
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
      ...overrides.queues,
    },
  };
}

function child(
  id: number,
  name: string,
  overrides: Parameters<typeof metrics>[0] = {},
): OperationsDashboardChild {
  return { id, name, level: "club", ...metrics(overrides) };
}

const scope = (level: OperationsDashboardScope["level"]): OperationsDashboardScope => ({
  level,
  id: level === "all" || level === "coordinator" ? null : 1,
  name: "Alcance",
  path: [],
});

const user = {} as AuthUser;

beforeEach(() => {
  mockCanAccess.mockReset();
});

describe("resolveHomeMode", () => {
  it("dispatches in the actor's own local field or coordinator scope", () => {
    expect(resolveHomeMode(scope("local_field"), {})).toBe("dispatch");
    expect(resolveHomeMode(scope("coordinator"), {})).toBe("dispatch");
  });

  it("supervises at every wider level", () => {
    expect(resolveHomeMode(scope("all"), {})).toBe("supervise");
    expect(resolveHomeMode(scope("division"), {})).toBe("supervise");
    expect(resolveHomeMode(scope("union"), {})).toBe("supervise");
  });

  it("supervises any drilled-down scope, even a local field", () => {
    expect(resolveHomeMode(scope("local_field"), { local_field_id: 7 })).toBe("supervise");
    expect(resolveHomeMode(scope("local_field"), { union_id: 3 })).toBe("supervise");
    expect(resolveHomeMode(scope("union"), { division_id: 1 })).toBe("supervise");
  });

  it("ignores period-only query params", () => {
    expect(
      resolveHomeMode(scope("local_field"), { report_year: 2026, report_month: 8 }),
    ).toBe("dispatch");
  });
});

describe("childGap", () => {
  it("counts missing reports only when a reporting month exists", () => {
    const lagging = child(1, "A", { reports: { missing_sections: 3 } });
    expect(childGap(lagging, true)).toMatchObject({ missingSections: 3, hasGap: true });
    expect(childGap(lagging, false)).toMatchObject({ missingSections: 0, hasGap: false });
  });

  it("treats unavailable honors review as zero in the pending total", () => {
    const value = child(1, "A", {
      queues: { transfers_pending: 2, honors_review_pending: null, role_assignments_pending: 1 },
    });
    expect(childGap(value, true).pendingTotal).toBe(3);
  });

  it("flags non-operational clubs as a gap", () => {
    expect(childGap(child(1, "A", { nonOperational: 1 }), true).hasGap).toBe(true);
  });
});

describe("rankChildrenByGap", () => {
  it("orders by gap, missing reports, non-operational, pending, then name", () => {
    const ranked = rankChildrenByGap(
      [
        child(1, "Sin brecha B", { queues: { transfers_pending: 9 } }),
        child(2, "Pocos faltantes", { reports: { missing_sections: 1 } }),
        child(3, "Muchos faltantes", { reports: { missing_sections: 5 } }),
        child(4, "Sin brecha A"),
        child(5, "No operativo", { nonOperational: 2 }),
        child(6, "Pocos faltantes con pendientes", {
          reports: { missing_sections: 1 },
          queues: { role_assignments_pending: 4 },
        }),
      ],
      true,
    );

    expect(ranked.map((row) => row.child.name)).toEqual([
      "Muchos faltantes",
      "Pocos faltantes con pendientes",
      "Pocos faltantes",
      "No operativo",
      "Sin brecha B",
      "Sin brecha A",
    ]);
  });
});

describe("laggingClubs", () => {
  it("keeps only children with a gap and names each reason", () => {
    const rows = laggingClubs(
      [
        child(1, "Al día"),
        child(2, "Ambos", { reports: { missing_sections: 1 }, nonOperational: 1 }),
        child(3, "Solo informe", { reports: { missing_sections: 2 } }),
      ],
      true,
    );

    expect(rows.map((row) => [row.child.name, row.reasons])).toEqual([
      ["Solo informe", ["missingReport"]],
      ["Ambos", ["missingReport", "nonOperational"]],
    ]);
  });
});

describe("supervisionSummary", () => {
  it("counts children that reported, ignoring those that expected nothing", () => {
    const messages = supervisionSummary(
      [
        child(1, "A"),
        child(2, "B", { reports: { submitted_sections: 1, missing_sections: 1 } }),
        child(3, "C", { reports: { expected_sections: 0, submitted_sections: 0 } }),
      ],
      "local_field",
      metrics({ nonOperational: 2 }),
      true,
    );

    expect(messages).toEqual([
      { key: "childrenReported", values: { reported: 1, total: 2, level: "local_field" } },
      { key: "nonOperationalClubs", values: { count: 2 } },
    ]);
  });

  it("does not count generated reports that were never submitted as delivered", () => {
    const messages = supervisionSummary(
      [
        child(1, "A", {
          reports: {
            expected_sections: 2,
            submitted_sections: 0,
            generated_sections: 2,
            missing_sections: 0,
            coverage_pct: 0,
          },
        }),
      ],
      "division",
      metrics(),
      true,
    );

    expect(messages).toEqual([
      { key: "childrenReported", values: { reported: 0, total: 1, level: "division" } },
    ]);
  });

  it("says there is no closed month and skips the report count", () => {
    expect(supervisionSummary([child(1, "A")], "union", metrics(), false)).toEqual([
      { key: "noClosedMonth", values: {} },
    ]);
  });

  it("omits the report sentence when no child expected a report", () => {
    expect(
      supervisionSummary(
        [child(1, "A", { reports: { expected_sections: 0 } })],
        "club",
        metrics(),
        true,
      ),
    ).toEqual([]);
  });
});

describe("dispatchSummary", () => {
  it("reports submitted over expected sections and non-operational clubs", () => {
    expect(
      dispatchSummary(
        metrics({ reports: { expected_sections: 20, submitted_sections: 18 }, nonOperational: 1 }),
        true,
      ),
    ).toEqual([
      { key: "sectionsReported", values: { submitted: 18, expected: 20 } },
      { key: "nonOperationalClubs", values: { count: 1 } },
    ]);
  });

  it("says there is no closed month", () => {
    expect(dispatchSummary(metrics(), false)).toEqual([{ key: "noClosedMonth", values: {} }]);
  });

  it("omits the report sentence when no section expected a report", () => {
    expect(dispatchSummary(metrics({ reports: { expected_sections: 0 } }), true)).toEqual([]);
  });
});

describe("work queue", () => {
  it("keeps only pending queues and sorts by count", () => {
    const queue = buildWorkQueue(
      metrics({
        queues: {
          transfers_pending: 1,
          class_validations_pending: 4,
          honors_review_pending: 3,
        },
      }),
    );

    expect(queue.map((item) => item.id)).toEqual(["classes", "honors", "transfers"]);
    expect(queue[0]?.href).toContain("/dashboard/clubs/validations");
  });

  it("drops unavailable honors review instead of coercing to zero", () => {
    const queue = buildWorkQueue(
      metrics({ queues: { honors_review_pending: null, transfers_pending: 2 } }),
    );
    expect(queue.map((item) => item.id)).toEqual(["transfers"]);
  });

  it("shows only queues the user can open", () => {
    mockCanAccess.mockImplementation((_user, path) => path !== "/dashboard/annual-folders/evaluate");

    const queue = visibleWorkQueue(
      metrics({ queues: { annual_folders_pending_union: 7, transfers_pending: 1 } }),
      user,
    );

    expect(queue.map((item) => item.id)).toEqual(["transfers"]);
    expect(mockCanAccess).toHaveBeenCalledWith(user, "/dashboard/annual-folders/evaluate");
  });

  it("strips query strings for access checks", () => {
    expect(hrefPath("/dashboard/clubs/validations?tab=honors")).toBe(
      "/dashboard/clubs/validations",
    );
  });

  it("sends the class queue to class section evidence", () => {
    expect(OPERATIONS_QUEUE_HREFS.classes).toBe("/dashboard/clubs/validations?tab=sections");
  });
});
