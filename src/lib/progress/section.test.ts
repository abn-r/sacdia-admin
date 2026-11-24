import { describe, expect, it } from "vitest";
import { sectionMemberName, sectionSheetErrorKind, sortMembersByScore } from "./section";

describe("sectionMemberName", () => {
  it("joins the name parts, then falls back to the email", () => {
    expect(sectionMemberName({ first_name: "Camila", paternal_last_name: "Ibarra" })).toBe("Camila Ibarra");
    expect(sectionMemberName({ email: "camila@example.org" })).toBe("camila@example.org");
    expect(sectionMemberName(null)).toBe("");
  });
});

describe("sortMembersByScore", () => {
  it("highest first, no score last", () => {
    const rows = [
      { composite_score_pct: null, user: { name: "Ana" } },
      { composite_score_pct: 60, user: { name: "Beto" } },
      { composite_score_pct: 78.5, user: { name: "Camila" } },
    ];
    expect(sortMembersByScore(rows).map((r) => r.user.name)).toEqual(["Camila", "Beto", "Ana"]);
  });
});

describe("sectionSheetErrorKind", () => {
  it("never shows a 403 as a 404", () => {
    expect(sectionSheetErrorKind(403)).toBe("forbidden");
    expect(sectionSheetErrorKind(404)).toBe("notFound");
    expect(sectionSheetErrorKind(500)).toBe("error");
    expect(sectionSheetErrorKind(null)).toBe("error");
  });
});
