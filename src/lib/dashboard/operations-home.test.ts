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
  attentionTotal,
  buildWorkQueue,
  childGap,
  clubTypeColor,
  groupClassesByClubType,
  homeSectionOrder,
  hrefPath,
  OPERATIONS_QUEUE_HREFS,
  progressTone,
  rankChildrenByGap,
  resolveHomeMode,
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

describe("progressTone", () => {
  it("maps coverage to destructive, warning and success thresholds", () => {
    expect(progressTone(0)).toBe("destructive");
    expect(progressTone(49.9)).toBe("destructive");
    expect(progressTone(50)).toBe("warning");
    expect(progressTone(79.99)).toBe("warning");
    expect(progressTone(80)).toBe("success");
    expect(progressTone(100)).toBe("success");
  });

  it("has no tone without a value", () => {
    expect(progressTone(null)).toBe("none");
    expect(progressTone(undefined)).toBe("none");
  });
});

describe("homeSectionOrder", () => {
  it("puts the attention queue first in dispatch mode", () => {
    expect(homeSectionOrder("dispatch")).toEqual(["attention", "breakdown"]);
  });

  it("puts the territorial breakdown first in supervision mode", () => {
    expect(homeSectionOrder("supervise")).toEqual(["breakdown", "attention"]);
  });
});

describe("attentionTotal", () => {
  it("adds every visible queue count", () => {
    expect(
      attentionTotal([
        { id: "roles", count: 2, href: "/a" },
        { id: "folders", count: 5, href: "/b" },
      ]),
    ).toBe(7);
    expect(attentionTotal([])).toBe(0);
  });
});

describe("class formation grouping", () => {
  const item = (
    class_id: number,
    club_type_id: number,
    club_type_name: string,
    enrollment_count: number,
    display_order = class_id,
  ) => ({
    class_id,
    class_name: `Clase ${class_id}`,
    club_type_id,
    club_type_name,
    display_order,
    enrollment_count,
  });

  it("colors each club type with its section token", () => {
    expect(clubTypeColor("Aventureros", 0)).toBe("var(--section-aventureros)");
    expect(clubTypeColor("Conquistadores", 0)).toBe("var(--section-conquistadores)");
    expect(clubTypeColor("Guías Mayores", 0)).toBe("var(--section-guias)");
    expect(clubTypeColor("Pathfinders", 2)).toBe("var(--chart-3)");
  });

  it("groups by club type in display order and drops empty classes", () => {
    const groups = groupClassesByClubType([
      item(3, 2, "Conquistadores", 4, 2),
      item(1, 2, "Conquistadores", 6, 1),
      item(2, 2, "Conquistadores", 0, 3),
      item(7, 1, "Aventureros", 3, 4),
      item(9, 5, "Otro club", 1, 5),
    ]);

    expect(groups.map((group) => [group.name, group.total, group.color])).toEqual([
      ["Conquistadores", 10, "var(--section-conquistadores)"],
      ["Aventureros", 3, "var(--section-aventureros)"],
      ["Otro club", 1, "var(--chart-1)"],
    ]);
    expect(groups[0]?.items.map((row) => row.class_id)).toEqual([1, 3]);
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
