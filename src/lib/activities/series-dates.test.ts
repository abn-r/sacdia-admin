import { describe, expect, it } from "vitest";
import {
  SERIES_MAX_OCCURRENCES,
  describeSeriesDates,
  expandSeriesDates,
  isOverSeriesCap,
  isoWeekdayOf,
} from "./series-dates";

describe("expandSeriesDates", () => {
  it("lists every Sunday from the first date up to the end date", () => {
    // 2026-11-29 is a Sunday.
    expect(
      expandSeriesDates({ start: "2026-11-29", until: "2026-12-20", rule: { kind: "weekly", weekday: 7 } }),
    ).toEqual(["2026-11-29", "2026-12-06", "2026-12-13", "2026-12-20"]);
  });

  it("starts at the first matching weekday when the first date is another day", () => {
    expect(
      expandSeriesDates({ start: "2026-11-24", until: "2026-12-09", rule: { kind: "weekly", weekday: 3 } }),
    ).toEqual(["2026-11-25", "2026-12-02", "2026-12-09"]);
  });

  it("steps every N days from the first date", () => {
    expect(
      expandSeriesDates({ start: "2026-11-01", until: "2026-11-10", rule: { kind: "interval", intervalDays: 3 } }),
    ).toEqual(["2026-11-01", "2026-11-04", "2026-11-07", "2026-11-10"]);
  });

  it("returns nothing for an inverted range or a bad rule", () => {
    expect(expandSeriesDates({ start: "2026-12-01", until: "2026-11-01", rule: { kind: "weekly", weekday: 1 } })).toEqual([]);
    expect(expandSeriesDates({ start: "2026-11-01", until: "2026-11-10", rule: { kind: "interval", intervalDays: 0 } })).toEqual([]);
    expect(expandSeriesDates({ start: "2026-11-01", until: "2026-11-10", rule: { kind: "weekly", weekday: 9 } })).toEqual([]);
    expect(expandSeriesDates({ start: "", until: "2026-11-10", rule: { kind: "weekly", weekday: 1 } })).toEqual([]);
  });

  it("stops one past the cap so the form can say it is too many", () => {
    const dates = expandSeriesDates({
      start: "2026-01-01",
      until: "2030-12-31",
      rule: { kind: "interval", intervalDays: 1 },
    });
    expect(dates).toHaveLength(SERIES_MAX_OCCURRENCES + 1);
    expect(isOverSeriesCap(dates)).toBe(true);
    expect(isOverSeriesCap(dates.slice(0, SERIES_MAX_OCCURRENCES))).toBe(false);
  });
});

describe("isoWeekdayOf", () => {
  it("numbers Monday 1 to Sunday 7", () => {
    expect(isoWeekdayOf("2026-11-23")).toBe(1);
    expect(isoWeekdayOf("2026-11-29")).toBe(7);
  });
});

describe("describeSeriesDates", () => {
  const dates = ["2026-11-29", "2026-12-06", "2026-12-13", "2026-12-20"];

  it("groups the days by month in Spanish", () => {
    expect(describeSeriesDates(dates, "es")).toBe("29 nov, 6, 13 y 20 dic");
  });

  it("uses the panel language for the list joiner", () => {
    expect(describeSeriesDates(dates, "en")).toContain("and 20");
  });

  it("is empty without dates and elides long series", () => {
    expect(describeSeriesDates([], "es")).toBe("");
    const long = ["2026-01-05", "2026-02-05", "2026-03-05", "2026-04-05", "2026-05-05"];
    expect(describeSeriesDates(long, "es", 4).endsWith("…")).toBe(true);
  });
});
