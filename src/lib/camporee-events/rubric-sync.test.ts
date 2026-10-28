import { describe, expect, it } from "vitest";
import { RUBRICS_INITIALLY_CONFIGURED_FIELD, shouldSyncRubrics } from "./rubric-sync";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.append(key, value);
  return fd;
}

const ITEM = JSON.stringify([{ title: "Orden", description: null, max_points: 10, display_order: 1 }]);

describe("shouldSyncRubrics", () => {
  it("skips forms that carry no rubric fields at all", () => {
    expect(shouldSyncRubrics(form({ title: "x" }))).toBe(false);
  });

  it("skips when scoring is off, there are no items and the event had none", () => {
    expect(
      shouldSyncRubrics(
        form({ scoring_enabled: "", rubrics: "[]", [RUBRICS_INITIALLY_CONFIGURED_FIELD]: "false" }),
      ),
    ).toBe(false);
  });

  it("skips when the initial flag is missing too", () => {
    expect(shouldSyncRubrics(form({ scoring_enabled: "", rubrics: "[]" }))).toBe(false);
  });

  it("syncs when scoring is enabled", () => {
    expect(shouldSyncRubrics(form({ scoring_enabled: "on", rubrics: ITEM }))).toBe(true);
  });

  it("syncs when items are present even with scoring off", () => {
    expect(shouldSyncRubrics(form({ scoring_enabled: "", rubrics: ITEM }))).toBe(true);
  });

  it("syncs when the event had rubrics and scoring is being turned off", () => {
    expect(
      shouldSyncRubrics(
        form({ scoring_enabled: "", rubrics: "[]", [RUBRICS_INITIALLY_CONFIGURED_FIELD]: "true" }),
      ),
    ).toBe(true);
  });

  it("tolerates malformed rubric JSON", () => {
    expect(shouldSyncRubrics(form({ scoring_enabled: "", rubrics: "{oops" }))).toBe(false);
  });
});
