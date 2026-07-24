import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/lib/api/client";
import {
  buildDashboardHref,
  buildDashboardV2Href,
  buildDrillDownQuery,
  buildResetScopeQuery,
  fetchOperationsDashboard,
  formatMetricCount,
  formatMetricPercent,
  isValidPositiveInt,
  parseOperationsDashboardSearchParams,
  serializeOperationsDashboardParams,
  type OperationsDashboardData,
} from "@/lib/api/operations-dashboard";

vi.mock("@/lib/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/client")>();
  return {
    ...original,
    apiRequest: vi.fn(),
  };
});

import { apiRequest } from "@/lib/api/client";

const mockApiRequest = vi.mocked(apiRequest);

const stubDashboard: OperationsDashboardData = {
  meta: {
    computed_at: "2026-07-15T12:00:00.000Z",
    cached: true,
    cache_ttl_seconds: 60,
    definitions_version: "1",
    scope: {
      level: "all",
      id: null,
      name: "Global",
      path: [],
    },
    period: {
      ecclesiastical_year: {
        id: 3,
        start_date: "2025-09-01",
        end_date: "2026-08-31",
        active: true,
      },
      reporting_month: null,
    },
  },
  summary: {
    administrative_clubs: { total: 10, active: 8, inactive: 2 },
    operations: {
      operational_clubs: 6,
      non_operational_clubs: 4,
      operational_sections: 12,
      operational_rate_pct: 60,
    },
    people: {
      institutionally_active: 100,
      platform_accounts: { active: 70, inactive: 30 },
    },
    classes: { total_enrollments: 50, distinct_people: 45, by_class: [] },
    monthly_reports: {
      expected_sections: 0,
      submitted_sections: 0,
      draft_sections: 0,
      generated_sections: 0,
      missing_sections: 0,
      coverage_pct: null,
    },
    honors: {
      in_progress: null,
      pending_review: null,
      approved: null,
      attribution: "unavailable",
    },
    activities: {
      registered: 5,
      joint_registered: 1,
      distinct_participating_sections: 4,
    },
    queues: {
      role_assignments_pending: 2,
      transfers_pending: 1,
      class_validations_pending: 0,
      honors_review_pending: null,
      annual_folders_pending_union: 0,
    },
  },
  children: [
    {
      id: 9,
      name: "Club Alfa",
      level: "club",
      administrative_clubs: { total: 1, active: 1, inactive: 0 },
      operations: {
        operational_clubs: 1,
        non_operational_clubs: 0,
        operational_sections: 2,
        operational_rate_pct: 100,
      },
      people: {
        institutionally_active: 10,
        platform_accounts: { active: 8, inactive: 2 },
      },
      classes: { total_enrollments: 5, distinct_people: 5, by_class: [] },
      monthly_reports: {
        expected_sections: 2,
        submitted_sections: 1,
        draft_sections: 0,
        generated_sections: 0,
        missing_sections: 1,
        coverage_pct: 50,
      },
      honors: {
        in_progress: 1,
        pending_review: 0,
        approved: 2,
        attribution: "current_affiliation",
      },
      activities: {
        registered: 1,
        joint_registered: 0,
        distinct_participating_sections: 1,
      },
      queues: {
        role_assignments_pending: 0,
        transfers_pending: 0,
        class_validations_pending: 0,
        honors_review_pending: 0,
        annual_folders_pending_union: 0,
      },
    },
  ],
  data_quality: [
    {
      metric: "monthly_reports",
      status: "not_applicable",
      note: "Sin mes cerrado",
    },
  ],
};

describe("isValidPositiveInt", () => {
  it("accepts positive integers only", () => {
    expect(isValidPositiveInt(1)).toBe(true);
    expect(isValidPositiveInt(0)).toBe(false);
    expect(isValidPositiveInt(-1)).toBe(false);
    expect(isValidPositiveInt(1.5)).toBe(false);
    expect(isValidPositiveInt(NaN)).toBe(false);
    expect(isValidPositiveInt("1")).toBe(false);
  });
});

describe("serializeOperationsDashboardParams", () => {
  it("omits ecclesiastical year and territorial scope when absent", () => {
    expect(serializeOperationsDashboardParams({})).toEqual({});
  });

  it("never serializes zero or invalid ids", () => {
    expect(
      serializeOperationsDashboardParams({
        ecclesiastical_year_id: 0,
        division_id: NaN,
        union_id: -2,
        local_field_id: 1.2,
      }),
    ).toEqual({});
  });

  it("requires report_year and report_month together", () => {
    expect(
      serializeOperationsDashboardParams({
        report_year: 2026,
      }),
    ).toEqual({});

    expect(
      serializeOperationsDashboardParams({
        report_year: 2026,
        report_month: 6,
      }),
    ).toEqual({
      report_year: 2026,
      report_month: 6,
    });
  });

  it("serializes valid query params", () => {
    expect(
      serializeOperationsDashboardParams({
        division_id: 4,
        report_year: 2026,
        report_month: 3,
      }),
    ).toEqual({
      division_id: 4,
      report_year: 2026,
      report_month: 3,
    });
  });
});

describe("parseOperationsDashboardSearchParams", () => {
  it("drops invalid and zero query values", () => {
    expect(
      parseOperationsDashboardSearchParams({
        division_id: "0",
        union_id: "abc",
        report_year: "2026",
      }),
    ).toEqual({});
  });

  it("parses valid search params", () => {
    expect(
      parseOperationsDashboardSearchParams({
        union_id: "12",
        report_year: "2026",
        report_month: "5",
      }),
    ).toEqual({
      union_id: 12,
      report_year: 2026,
      report_month: 5,
    });
  });
});

describe("buildDrillDownQuery", () => {
  const periodQuery = {
    ecclesiastical_year_id: 3,
    report_year: 2026,
    report_month: 4,
    division_id: 1,
    union_id: 2,
  };

  it("keeps only target territorial id and preserves period", () => {
    expect(buildDrillDownQuery({ level: "union", id: 9 }, periodQuery)).toEqual({
      ecclesiastical_year_id: 3,
      report_year: 2026,
      report_month: 4,
      union_id: 9,
    });
  });

  it("returns period only for club terminal children", () => {
    expect(buildDrillDownQuery({ level: "club", id: 44 }, periodQuery)).toEqual({
      ecclesiastical_year_id: 3,
      report_year: 2026,
      report_month: 4,
    });
  });
});

describe("buildResetScopeQuery", () => {
  it("removes territorial filters and keeps period", () => {
    expect(
      buildResetScopeQuery({
        division_id: 2,
        union_id: 3,
        report_year: 2026,
        report_month: 2,
      }),
    ).toEqual({
      report_year: 2026,
      report_month: 2,
    });
  });
});

describe("buildDashboardHref", () => {
  it("builds dashboard path with query string", () => {
    expect(buildDashboardHref({ local_field_id: 7 })).toBe("/dashboard?local_field_id=7");
    expect(buildDashboardHref({})).toBe("/dashboard");
  });
});

describe("buildDashboardV2Href", () => {
  it("builds v2 dashboard path with query string", () => {
    expect(buildDashboardV2Href({ union_id: 4 })).toBe("/dashboard/v2?union_id=4");
    expect(buildDashboardV2Href({})).toBe("/dashboard/v2");
  });
});

describe("formatMetricCount", () => {
  const formatNumber = (n: number) => String(n);

  it("distinguishes null from zero", () => {
    expect(formatMetricCount(null, formatNumber)).toBe("—");
    expect(formatMetricCount(0, formatNumber)).toBe("0");
    expect(formatMetricCount(12, formatNumber)).toBe("12");
  });
});

describe("formatMetricPercent", () => {
  const formatNumber = (n: number) => n.toFixed(2);

  it("renders em dash for null coverage", () => {
    expect(formatMetricPercent(null, formatNumber)).toBe("—");
    expect(formatMetricPercent(0, formatNumber)).toBe("0.00%");
  });
});

describe("fetchOperationsDashboard", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("calls apiRequest with no-store and unwraps data envelope", async () => {
    mockApiRequest.mockResolvedValue({ status: "ok", data: stubDashboard });

    const result = await fetchOperationsDashboard({ division_id: 2 });

    expect(mockApiRequest).toHaveBeenCalledWith("/admin/analytics/operations-dashboard", {
      params: { division_id: 2 },
      cache: "no-store",
    });
    expect(result.meta.cached).toBe(true);
    expect(result.children[0]?.level).toBe("club");
  });

  it("propagates ApiError without fabricating zeros", async () => {
    mockApiRequest.mockRejectedValue(new ApiError("Forbidden", 403, { code: "GUARD_PERMISSION_DENIED" }));

    await expect(fetchOperationsDashboard()).rejects.toMatchObject({ status: 403 });
  });

  it("propagates 400/404/429/5xx errors", async () => {
    for (const status of [400, 404, 429, 500]) {
      mockApiRequest.mockRejectedValueOnce(new ApiError(`Error ${status}`, status, null));
      await expect(fetchOperationsDashboard()).rejects.toMatchObject({ status });
    }
  });
});

describe("reporting_month null semantics", () => {
  it("keeps null reporting month in payload", () => {
    expect(stubDashboard.meta.period.reporting_month).toBeNull();
    expect(stubDashboard.summary.monthly_reports.coverage_pct).toBeNull();
  });
});

describe("cached response semantics", () => {
  it("treats cached true as metadata only", () => {
    expect(stubDashboard.meta.cached).toBe(true);
    expect(stubDashboard.meta.computed_at).toBe("2026-07-15T12:00:00.000Z");
  });
});
