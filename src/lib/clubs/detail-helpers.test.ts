import { describe, expect, it, vi } from "vitest";
import type { ClubHistoryItem } from "@/lib/api/club-detail";
import type { ContinuationListItem } from "@/lib/api/annual-continuations";
import { buildClubDetail } from "@/components/clubs/detail/detail-test-data";
import { suggestedClassView } from "./detail-continuations";
import { eligibilityForRole, mapWithConcurrency } from "./detail-eligibility";
import { filterHistoryItems } from "./detail-history";
import {
  DEFAULT_MEMBER_FILTERS,
  buildMemberRows,
  filterMemberRows,
  memberClassOptions,
  memberRoleOptions,
  paginateRows,
  summarizeClubFacts,
  uniqueMemberCount,
} from "./detail-members";
import {
  buildPositionRows,
  counselorHolders,
  findRoleForPosition,
  pickInitialSectionId,
} from "./detail-positions";
import { resolveClubDetailTab, visibleClubDetailTabs } from "./detail-tabs";
import { resolveYearLabel } from "./detail-year";

const detail = buildClubDetail();

describe("detail tabs", () => {
  it("maps the old roles tab to sections and falls back to general", () => {
    expect(resolveClubDetailTab("roles")).toBe("sections");
    expect(resolveClubDetailTab("members")).toBe("members");
    expect(resolveClubDetailTab("nope")).toBe("general");
    expect(resolveClubDetailTab(undefined)).toBe("general");
  });

  it("hides the reports tab without the periodic reports capability", () => {
    expect(visibleClubDetailTabs(false)).not.toContain("reports");
    expect(visibleClubDetailTabs(true)).toContain("reports");
  });
});

describe("member rows", () => {
  const rows = buildMemberRows(detail.sectionMemberGroups);

  it("folds a person's position and class into one row per section", () => {
    const valeria = rows.filter((row) => row.userId === "u-valeria");
    expect(valeria).toHaveLength(1);
    expect(valeria[0]?.roles).toEqual(["counselor"]);
    expect(valeria[0]?.className).toBe("Compañero");
  });

  it("filters by section, role (including plain members), class and name", () => {
    const names = (filters: Partial<typeof DEFAULT_MEMBER_FILTERS>) =>
      filterMemberRows(rows, { ...DEFAULT_MEMBER_FILTERS, ...filters }).map((row) => row.name);

    expect(names({ section: "12" })).toEqual(["Lucía Gómez", "Tomás Vega"]);
    expect(names({ role: "member", section: "11" })).toEqual(["Iker Montes"]);
    expect(names({ role: "counselor" })).toEqual(["Valeria Ortiz"]);
    expect(names({ className: "Amigo" })).toEqual(["Iker Montes"]);
    expect(names({ search: "nunez" })).toEqual(["Paola Núñez"]);
  });

  it("lists the roles and classes that exist and paginates", () => {
    expect(memberRoleOptions(rows)).toEqual(["counselor", "director", "secretary"]);
    expect(memberClassOptions(rows)).toContain("Amigo");
    const page = paginateRows(rows, 2, 3);
    expect(page.items).toHaveLength(3);
    expect(page.totalPages).toBe(2);
  });

  it("counts people, not rows", () => {
    expect(uniqueMemberCount(detail.sectionMemberGroups[0]?.members ?? [])).toBe(4);
    expect(summarizeClubFacts(detail.sectionMemberGroups)).toMatchObject({
      members: 6,
      sectionsActive: 2,
      souls: 3,
    });
  });
});

describe("position rows", () => {
  it("gives one row per position with who holds it", () => {
    const members = detail.sectionMemberGroups[0]?.members ?? [];
    const rows = buildPositionRows(members, detail.leadership, "Conquistadores");
    expect(rows.map((row) => row.key)).toEqual([
      "director",
      "deputy-director",
      "secretary",
      "treasurer",
      "secretary-treasurer",
      "counselor",
    ]);
    expect(rows[0]?.holders[0]).toMatchObject({ name: "Mateo Herrera", assignmentId: "as-1" });
    expect(rows[1]?.holders).toEqual([]);
  });

  it("puts the class next to the counselor", () => {
    const [holder] = counselorHolders([
      {
        assignment_id: "c-1",
        user_id: "u-valeria",
        class_id: 5,
        classes: { name: "Amigo" },
        users: { name: "Valeria", paternal_last_name: "Ortiz" },
      },
    ]);
    expect(holder).toMatchObject({ name: "Valeria Ortiz", className: "Amigo", assignmentId: "c-1" });
  });

  it("finds the catalog role of a position and picks the initial section", () => {
    expect(findRoleForPosition(detail.clubRoles, "treasurer")?.role_id).toBe("r-tre");
    expect(findRoleForPosition([], "treasurer")).toBeNull();
    const groups = [
      { sectionId: 1, active: false },
      { sectionId: 2, active: true },
    ];
    expect(pickInitialSectionId(groups, null)).toBe(2);
    expect(pickInitialSectionId(groups, "1")).toBe(1);
    expect(pickInitialSectionId(groups, "99")).toBe(2);
  });
});

describe("year label", () => {
  it("names the year instead of exposing its id", () => {
    const years = [
      { ecclesiastical_year_id: 12, start_date: "2027-01-01", end_date: "2027-12-31" },
      { ecclesiastical_year_id: 11, start_date: "2026-01-01", end_date: "2026-12-31" },
    ];
    expect(resolveYearLabel(years, 12)).toBe("2027");
    expect(resolveYearLabel(years, 99)).toBeNull();
    expect(resolveYearLabel(years, null)).toBeNull();
  });
});

describe("continuations and eligibility", () => {
  const item = (suggested: ContinuationListItem["suggested_class"]): ContinuationListItem => ({
    user_id: "u",
    name: "Iker Montes",
    base_section_id: 11,
    ecclesiastical_year_id: 12,
    annual_status: "not_enrolled",
    current_role: null,
    eligibility: "eligible",
    blocked_reason: null,
    suggested_class: suggested,
  });

  it("shows the suggested class by name", () => {
    const classes = [{ class_id: 5, name: "Amigo" }];
    expect(suggestedClassView(item({ status: "resolved", class_id: 5 }), classes)).toEqual({
      kind: "named",
      name: "Amigo",
    });
    expect(suggestedClassView(item({ status: "resolved", class_id: 9 }), classes)).toEqual({ kind: "pending" });
    expect(suggestedClassView(item({ status: "complete" }), classes)).toEqual({ kind: "complete" });
  });

  it("reads eligibility for one role and limits concurrency", async () => {
    const roles = [
      { role_id: "a", role_name: "x", allowed: true, violation_rule: null, violation_code: null },
      { role_id: "b", role_name: "y", allowed: false, violation_rule: "r", violation_code: "CODE" },
    ];
    expect(eligibilityForRole(roles, "a")).toEqual({ status: "ok" });
    expect(eligibilityForRole(roles, "b")).toEqual({ status: "blocked", code: "CODE" });
    expect(eligibilityForRole(roles, "zzz")).toEqual({ status: "unknown" });

    let inFlight = 0;
    let peak = 0;
    const worker = vi.fn(async (n: number) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return n * 2;
    });
    const result = await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, worker);
    expect(result).toEqual([2, 4, 6, 8, 10, 12]);
    expect(peak).toBeLessThanOrEqual(2);
  });
});

describe("history filter", () => {
  const event = (id: string, type: string, entityId: string): ClubHistoryItem => ({
    audit_log_id: id,
    entity_type: type,
    entity_id: entityId,
    action: "UPDATED",
    summary: null,
    actor: null,
    created_at: "2026-11-21T18:40:00.000Z",
  });

  it("keeps everything unfiltered and only section events when filtered", () => {
    const items = [event("1", "club_section", "11"), event("2", "role_assignment", "11"), event("3", "club_section", "12")];
    expect(filterHistoryItems(items, "all")).toHaveLength(3);
    expect(filterHistoryItems(items, "11").map((row) => row.audit_log_id)).toEqual(["1"]);
  });
});
