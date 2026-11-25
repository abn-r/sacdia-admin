import { describe, expect, it } from "vitest";
import {
  buildSystemHref,
  legacyHistoryHref,
  parseCronHistoryFilters,
  parseSystemTab,
} from "./system-view";

describe("parseSystemTab", () => {
  it("accepts the three tabs and defaults to queues", () => {
    expect(parseSystemTab("cron")).toBe("cron");
    expect(parseSystemTab("history")).toBe("history");
    expect(parseSystemTab(undefined)).toBe("queues");
    expect(parseSystemTab("nope")).toBe("queues");
    expect(parseSystemTab(["history", "cron"])).toBe("history");
  });
});

describe("parseCronHistoryFilters", () => {
  it("reads valid filters and defaults the page to 1", () => {
    expect(
      parseCronHistoryFilters({
        job_name: "member-of-month-auto-evaluate",
        status: "failed",
        since: "2026-11-01",
        until: "2026-11-24",
        page: "3",
      }),
    ).toEqual({
      job_name: "member-of-month-auto-evaluate",
      status: "failed",
      since: "2026-11-01",
      until: "2026-11-24",
      page: 3,
    });
    expect(parseCronHistoryFilters({})).toEqual({ page: 1 });
  });

  it("drops invalid values and the legacy 'all' marker", () => {
    expect(
      parseCronHistoryFilters({
        job_name: "all",
        status: "weird",
        since: "yesterday",
        until: "2026-13",
        page: "-2",
      }),
    ).toEqual({ page: 1 });
  });
});

describe("buildSystemHref / legacyHistoryHref", () => {
  it("omits the default tab and carries history filters only on history", () => {
    expect(buildSystemHref("queues")).toBe("/dashboard/system/jobs");
    expect(buildSystemHref("cron", { status: "failed", page: 1 })).toBe(
      "/dashboard/system/jobs?tab=cron",
    );
    expect(buildSystemHref("history", { status: "failed", page: 2 })).toBe(
      "/dashboard/system/jobs?tab=history&status=failed&page=2",
    );
  });

  it("redirects the old history URL with its filters to the History tab", () => {
    expect(legacyHistoryHref({ status: "failed", since: "2026-11-01" })).toBe(
      "/dashboard/system/jobs?tab=history&status=failed&since=2026-11-01",
    );
    expect(legacyHistoryHref({})).toBe("/dashboard/system/jobs?tab=history");
  });
});
