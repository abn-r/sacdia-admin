import { describe, expect, it } from "vitest";
import { frozenNote, monthlyReportClubParts } from "./detail";

describe("monthlyReportClubParts", () => {
  it("reads the club and its type, trimmed", () => {
    expect(
      monthlyReportClubParts({
        club_enrollment: { club_section: { clubs: { name: " Club Orión " }, club_types: { name: "Aventureros" } } },
      }),
    ).toEqual({ club: "Club Orión", type: "Aventureros" });
  });

  it("answers nulls when the API names neither", () => {
    expect(monthlyReportClubParts({})).toEqual({ club: null, type: null });
  });
});

describe("frozenNote", () => {
  it("says a draft is still live", () => {
    expect(frozenNote({ status: "draft", generated_at: null, submitted_at: null })).toEqual({ kind: "live" });
  });

  it("gives the generation date once it is frozen", () => {
    expect(frozenNote({ status: "generated", generated_at: "2026-11-06T16:14:00Z", submitted_at: null })).toEqual({
      kind: "frozen",
      generatedAt: "2026-11-06T16:14:00Z",
      submittedAt: null,
    });
    expect(
      frozenNote({ status: "submitted", generated_at: "2026-11-06T16:14:00Z", submitted_at: "2026-11-07T10:00:00Z" }),
    ).toEqual({ kind: "frozen", generatedAt: "2026-11-06T16:14:00Z", submittedAt: "2026-11-07T10:00:00Z" });
  });

  it("falls back when a frozen report has no date", () => {
    expect(frozenNote({ status: "generated", generated_at: null, submitted_at: null })).toEqual({
      kind: "frozenNoDate",
    });
  });
});
