import { describe, expect, it } from "vitest";
import { firstEventDraftIssue, validateTimes } from "./event-draft";

describe("validateTimes", () => {
  it("accepts empty values and a valid range", () => {
    expect(validateTimes("", "")).toBeNull();
    expect(validateTimes("08:00", "")).toBeNull();
    expect(validateTimes("08:00", "10:30")).toBeNull();
  });

  it("flags a bad format and an inverted range", () => {
    expect(validateTimes("8am", "")).toBe("format");
    expect(validateTimes("08:00", "25:00")).toBe("format");
    expect(validateTimes("10:00", "10:00")).toBe("order");
    expect(validateTimes("11:00", "10:00")).toBe("order");
  });
});

describe("firstEventDraftIssue", () => {
  const ok = { title: "Nudos", timeIssue: null, scoringEnabled: false, rubricsValid: true } as const;

  it("returns null for a valid draft", () => {
    expect(firstEventDraftIssue(ok)).toBeNull();
  });

  it("reports problems in page order", () => {
    expect(firstEventDraftIssue({ ...ok, title: "  ", timeIssue: "order", scoringEnabled: true, rubricsValid: false }))
      .toEqual({ section: "data", field: "title" });
    expect(firstEventDraftIssue({ ...ok, timeIssue: "order", scoringEnabled: true, rubricsValid: false }))
      .toEqual({ section: "schedule", field: "times" });
    expect(firstEventDraftIssue({ ...ok, scoringEnabled: true, rubricsValid: false }))
      .toEqual({ section: "points", field: "rubrics" });
  });

  it("ignores the rubrics when scoring is off", () => {
    expect(firstEventDraftIssue({ ...ok, rubricsValid: false })).toBeNull();
  });
});
