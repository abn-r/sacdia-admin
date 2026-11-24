import { describe, expect, it } from "vitest";
import {
  activitiesInPeriod,
  activityPhase,
  formatPeriodLabel,
  periodRange,
  readAnchor,
  readView,
  shiftAnchorKey,
  todayKey,
  weekdayLabels,
} from "./view";
import type { Activity } from "@/lib/api/activities";

function activity(partial: Partial<Activity>): Activity {
  return {
    activity_id: 1,
    name: "Clase de nudos",
    club_id: 1,
    club_type_id: 2,
    club_section_id: 3,
    lat: 0,
    long: 0,
    activity_place: "",
    activity_type_id: 1,
    active: true,
    ...partial,
  };
}

describe("readView", () => {
  it("defaults to month and keeps week and list", () => {
    expect(readView(undefined)).toBe("month");
    expect(readView("week")).toBe("week");
    expect(readView("list")).toBe("list");
  });

  it("maps the retired day view to week", () => {
    expect(readView("day")).toBe("week");
  });
});

describe("readAnchor", () => {
  it("accepts a real date and falls back otherwise", () => {
    expect(readAnchor("2026-11-24", "2026-01-01")).toBe("2026-11-24");
    expect(readAnchor("2026-02-31", "2026-01-01")).toBe("2026-01-01");
    expect(readAnchor("hoy", "2026-01-01")).toBe("2026-01-01");
    expect(readAnchor(null, "2026-01-01")).toBe("2026-01-01");
  });
});

describe("todayKey", () => {
  it("reads the calendar date in the panel zone, not in UTC", () => {
    // 03:00 UTC on the 25th is still the 24th in Mexico City.
    expect(todayKey(new Date("2026-11-25T03:00:00Z"))).toBe("2026-11-24");
    expect(todayKey(new Date("2026-11-25T18:00:00Z"))).toBe("2026-11-25");
  });
});

describe("activityPhase", () => {
  const today = "2026-11-24";

  it("mutes what already happened", () => {
    expect(activityPhase(activity({ activity_date: "2026-11-23" }), today)).toBe("past");
  });

  it("marks today and keeps a multi-day activity current until its last day", () => {
    expect(activityPhase(activity({ activity_date: "2026-11-24" }), today)).toBe("today");
    expect(
      activityPhase(activity({ activity_date: "2026-11-22", activity_end_date: "2026-11-24" }), today),
    ).toBe("today");
    expect(
      activityPhase(activity({ activity_date: "2026-11-20", activity_end_date: "2026-11-22" }), today),
    ).toBe("past");
  });

  it("treats future and undated activities as upcoming", () => {
    expect(activityPhase(activity({ activity_date: "2026-11-25" }), today)).toBe("upcoming");
    expect(activityPhase(activity({ activity_date: null }), today)).toBe("upcoming");
  });
});

describe("period", () => {
  it("moves a month or a week", () => {
    expect(shiftAnchorKey("month", "2026-11-24", 1)).toBe("2026-12-01");
    expect(shiftAnchorKey("list", "2026-01-15", -1)).toBe("2025-12-01");
    expect(shiftAnchorKey("week", "2026-11-24", -1)).toBe("2026-11-17");
  });

  it("bounds a week from Sunday and a month by its days", () => {
    expect(periodRange("week", "2026-11-24")).toEqual({ start: "2026-11-22", end: "2026-11-28" });
    expect(periodRange("month", "2026-02-10")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
  });

  it("lists the activities that touch the period, in order", () => {
    const items = [
      activity({ activity_id: 3, activity_date: "2026-12-01" }),
      activity({ activity_id: 2, activity_date: "2026-11-28", activity_time: "19:00" }),
      activity({ activity_id: 1, activity_date: "2026-10-30", activity_end_date: "2026-11-02" }),
      activity({ activity_id: 4, activity_date: "2026-11-28", activity_time: "16:00" }),
    ];
    expect(activitiesInPeriod(items, "month", "2026-11-10").map((a) => a.activity_id)).toEqual([1, 4, 2]);
  });
});

describe("labels follow the panel language", () => {
  it("names the month in each locale", () => {
    expect(formatPeriodLabel("month", "2026-11-24", "es")).toBe("Noviembre de 2026");
    expect(formatPeriodLabel("month", "2026-11-24", "en")).toBe("November 2026");
    expect(formatPeriodLabel("month", "2026-11-24", "fr")).toBe("Novembre 2026");
  });

  it("starts the weekday header on Sunday", () => {
    expect(weekdayLabels("es")[0]).toBe("dom");
    expect(weekdayLabels("en")[0]).toBe("Sun");
    expect(weekdayLabels("en")).toHaveLength(7);
  });
});
