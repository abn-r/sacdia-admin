import { describe, expect, it } from "vitest";
import type { AnnualFolderEvaluationQueueItem } from "@/lib/api/annual-folders";
import {
  EMPTY_QUEUE_FILTERS,
  buildQueueParams,
  folderPathWithFocus,
  hasActiveQueueFilters,
  parseQueueTab,
  queueTotalPages,
  tabSectionCounts,
} from "./queue";

const item: AnnualFolderEvaluationQueueItem = {
  annual_folder_id: "f1",
  display_name: "Club Orión · Conquistadores · 2026",
  club_name: "Club Orión",
  club_section_name: "Conquistadores",
  club_type_name: "Conquistadores",
  local_field_name: "Campo Valle Norte",
  union_name: "Asociación Valle Alto",
  template_name: "Carpeta Conquistadores 2026",
  year_label: "2026",
  folder_status: "submitted",
  total_sections: 6,
  total_evidences: 9,
  submitted_sections_count: 3,
  preapproved_sections_count: 2,
  validated_sections_count: 1,
  rejected_sections_count: 1,
  pending_section_names: [],
  latest_submitted_at: null,
  created_at: null,
};

describe("parseQueueTab", () => {
  it("falls back to the first tab", () => {
    expect(parseQueueTab(null)).toBe("evaluate");
    expect(parseQueueTab("nope")).toBe("evaluate");
    expect(parseQueueTab("union")).toBe("union");
  });
});

describe("buildQueueParams", () => {
  it("maps each tab to the API queue status and sends only set filters", () => {
    expect(buildQueueParams("evaluate", EMPTY_QUEUE_FILTERS, 1, 20)).toEqual({
      status: "submitted",
      page: 1,
      limit: 20,
    });
    expect(buildQueueParams("union", EMPTY_QUEUE_FILTERS, 2, 50).status).toBe("preapproved");
    expect(buildQueueParams("evaluated", EMPTY_QUEUE_FILTERS, 1, 20).status).toBe("evaluated");
  });

  it("serializes filters and clamps the page size to the API cap", () => {
    const params = buildQueueParams(
      "evaluate",
      { search: " Orión ", clubTypeId: "2", yearId: "9", unionId: "all", localFieldId: "4" },
      0,
      500,
    );
    expect(params).toEqual({
      status: "submitted",
      page: 1,
      limit: 100,
      search: "Orión",
      club_type_id: 2,
      year_id: 9,
      local_field_id: 4,
    });
  });
});

describe("hasActiveQueueFilters", () => {
  it("is false for the defaults and true once anything is set", () => {
    expect(hasActiveQueueFilters(EMPTY_QUEUE_FILTERS)).toBe(false);
    expect(hasActiveQueueFilters({ ...EMPTY_QUEUE_FILTERS, search: "x" })).toBe(true);
    expect(hasActiveQueueFilters({ ...EMPTY_QUEUE_FILTERS, yearId: "3" })).toBe(true);
  });
});

describe("tabSectionCounts", () => {
  it("counts the sections of the tab out of all sections", () => {
    expect(tabSectionCounts(item, "evaluate")).toEqual({ count: 3, total: 6, rejected: 0 });
    expect(tabSectionCounts(item, "union")).toEqual({ count: 2, total: 6, rejected: 0 });
    expect(tabSectionCounts(item, "evaluated")).toEqual({ count: 1, total: 6, rejected: 1 });
  });
});

describe("queueTotalPages / folderPathWithFocus", () => {
  it("never returns less than one page", () => {
    expect(queueTotalPages(0, 20)).toBe(1);
    expect(queueTotalPages(41, 20)).toBe(3);
  });
  it("adds the union focus only on the union tab", () => {
    expect(folderPathWithFocus("/x/1", "union")).toBe("/x/1?focus=union");
    expect(folderPathWithFocus("/x/1", "evaluate")).toBe("/x/1");
  });
});
