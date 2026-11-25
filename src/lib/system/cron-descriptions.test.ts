import { describe, expect, it } from "vitest";
import { CRON_JOB_NAMES } from "./cron-jobs";
import {
  cronRunNotifiesPeople,
  getCronRunDescriptionKey,
  previousMonthName,
} from "./cron-descriptions";
import { failureRatePercent, formatCronDuration } from "./cron-format";

describe("getCronRunDescriptionKey", () => {
  it("has a specific description for every job the admin knows", () => {
    for (const name of CRON_JOB_NAMES) {
      expect(getCronRunDescriptionKey(name)).not.toBe("generic");
    }
  });

  it("maps member of the month and falls back to generic for unknown jobs", () => {
    expect(getCronRunDescriptionKey("member-of-month-auto-evaluate")).toBe("memberOfMonth");
    expect(getCronRunDescriptionKey("brand-new-job")).toBe("generic");
    expect(getCronRunDescriptionKey("constructor")).toBe("generic");
  });
});

describe("cronRunNotifiesPeople", () => {
  it("flags jobs that notify real people", () => {
    expect(cronRunNotifiesPeople("member-of-month-auto-evaluate")).toBe(true);
    expect(cronRunNotifiesPeople("data-export-cleanup")).toBe(false);
  });
});

describe("previousMonthName", () => {
  it("names the month before now in the locale, across a year boundary", () => {
    expect(previousMonthName(new Date("2026-11-24T10:00:00Z"), "es")).toBe("octubre");
    expect(previousMonthName(new Date("2027-01-02T10:00:00Z"), "en")).toBe("December");
  });
});

describe("formatCronDuration / failureRatePercent", () => {
  it("formats compact durations", () => {
    expect(formatCronDuration(null)).toBe("—");
    expect(formatCronDuration(350)).toBe("350 ms");
    expect(formatCronDuration(2000, (v, o) => v.toFixed(o?.minimumFractionDigits ?? 0))).toBe("2.0 s");
    expect(formatCronDuration(125_000)).toBe("2 min 5 s");
  });

  it("rounds the failure rate and reports no data as null", () => {
    expect(failureRatePercent(0.1428)).toBe(14);
    expect(failureRatePercent(0)).toBe(0);
    expect(failureRatePercent(null)).toBeNull();
  });
});
