import { describe, expect, it } from "vitest";
import type { FolderSectionWithEvidences, SectionEvaluation } from "@/lib/api/annual-folders";
import {
  canReopenState,
  defaultSectionId,
  mergeSectionEvaluation,
  nextSectionId,
  resolveSectionState,
  validatePoints,
  type SectionItem,
} from "./section-state";

describe("resolveSectionState", () => {
  it("yields exactly one state per evaluation status", () => {
    expect(resolveSectionState(undefined, false)).toBe("notSent");
    expect(resolveSectionState("PENDING", false)).toBe("notSent");
    expect(resolveSectionState("SUBMITTED", false)).toBe("toEvaluate");
    expect(resolveSectionState("VALIDATED", false)).toBe("validated");
    expect(resolveSectionState("REJECTED", true)).toBe("rejected");
  });
  it("waits for the union only when the folder requires its confirmation", () => {
    expect(resolveSectionState("PREAPPROVED_LF", true)).toBe("awaitingUnion");
    expect(resolveSectionState("PREAPPROVED_LF", false)).toBe("preapproved");
  });
});

describe("canReopenState", () => {
  it("only decided sections can be reopened", () => {
    expect(canReopenState("toEvaluate")).toBe(false);
    expect(canReopenState("notSent")).toBe(false);
    expect(canReopenState("validated")).toBe(true);
    expect(canReopenState("awaitingUnion")).toBe(true);
  });
});

const items: SectionItem[] = [
  { id: "a", state: "validated" },
  { id: "b", state: "toEvaluate" },
  { id: "c", state: "notSent" },
  { id: "d", state: "toEvaluate" },
  { id: "e", state: "awaitingUnion" },
];

describe("nextSectionId", () => {
  it("moves to the next section that still needs a decision", () => {
    expect(nextSectionId(items, "b")).toBe("d");
  });
  it("wraps around and returns null when nothing else is left", () => {
    expect(nextSectionId(items, "d")).toBe("b");
    expect(nextSectionId([{ id: "a", state: "toEvaluate" }], "a")).toBeNull();
  });
});

describe("defaultSectionId", () => {
  it("opens on the first section to evaluate", () => {
    expect(defaultSectionId(items)).toBe("b");
  });
  it("opens on the union section when focusing the union", () => {
    expect(defaultSectionId(items, { focusUnion: true, canConfirmUnion: true })).toBe("e");
  });
  it("falls back to the first section when there is nothing to decide", () => {
    expect(defaultSectionId([{ id: "z", state: "validated" }])).toBe("z");
    expect(defaultSectionId([])).toBeNull();
  });
});

describe("validatePoints", () => {
  it("accepts integers from 0 to the maximum", () => {
    expect(validatePoints("360", 400)).toEqual({ ok: true, value: 360 });
    expect(validatePoints("0", 400)).toEqual({ ok: true, value: 0 });
  });
  it("reports each failure", () => {
    expect(validatePoints(" ", 400)).toEqual({ ok: false, error: "required" });
    expect(validatePoints("1.5", 400)).toEqual({ ok: false, error: "integer" });
    expect(validatePoints("-1", 400)).toEqual({ ok: false, error: "negative" });
    expect(validatePoints("401", 400)).toEqual({ ok: false, error: "max" });
  });
});

describe("mergeSectionEvaluation", () => {
  const section = {
    section_id: "s1",
    name: "Evangelismo",
    description: null,
    order: 4,
    required: true,
    evidences: [],
    evaluation: { evaluation_id: "e1", status: "PREAPPROVED_LF", earned_points: 360, max_points: 400, notes: null },
  } as FolderSectionWithEvidences;
  const api = [
    {
      section_id: "s1",
      status: "PENDING",
      earned_points: 0,
      lf_approver: { id: "u1", name: "Paola Núñez", email: "p@example.org" },
      lf_approved_at: "2026-11-12T10:00:00Z",
    },
  ] as unknown as SectionEvaluation[];

  it("keeps the embedded status and points and takes the actors from the API", () => {
    const merged = mergeSectionEvaluation(section, api);
    expect(merged?.status).toBe("PREAPPROVED_LF");
    expect(merged?.earned_points).toBe(360);
    expect(merged?.lf_approver?.name).toBe("Paola Núñez");
  });
  it("is undefined when nobody has evaluated the section", () => {
    expect(mergeSectionEvaluation({ ...section, evaluation: null }, [])).toBeUndefined();
  });
});
