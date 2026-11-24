import { describe, expect, it } from "vitest";
import { formatDayHeading } from "./day-label";

describe("formatDayHeading", () => {
  it("uses the weekday and month names of the panel locale", () => {
    expect(formatDayHeading("2027-02-12", "es")).toBe("viernes · 12 feb 2027");
    expect(formatDayHeading("2027-02-12", "en")).toBe("Friday · 12 Feb 2027");
    expect(formatDayHeading("2027-02-12", "fr")).toBe("vendredi · 12 févr 2027");
    expect(formatDayHeading("2027-02-12", "pt-BR")).toBe("sexta-feira · 12 fev 2027");
  });

  it("reads the calendar date as is, regardless of the time part", () => {
    expect(formatDayHeading("2027-02-12T00:00:00.000Z", "es")).toBe("viernes · 12 feb 2027");
  });

  it("falls back to the calendar text for an invalid date", () => {
    expect(formatDayHeading("not-a-date", "es")).toBe("—");
  });
});
