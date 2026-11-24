import { describe, expect, it } from "vitest";
import type { NotificationLog } from "@/lib/api/notifications";
import {
  audienceOfLog,
  filterHistoryLogs,
  hasActiveFilters,
  parseHistoryFilters,
  parseNotificationTab,
  summarizeDelivery,
} from "./history-view";

function log(overrides: Partial<NotificationLog>): NotificationLog {
  return {
    log_id: 1,
    title: "Aviso",
    body: "Cuerpo",
    type: "USER",
    target_type: "user",
    target_id: null,
    sent_by: null,
    tokens_sent: 1,
    tokens_failed: 0,
    created_at: "2026-11-20T10:00:00Z",
    users: null,
    ...overrides,
  };
}

const NOW = new Date("2026-11-24T12:00:00Z");

describe("summarizeDelivery", () => {
  it("reads 'N of M' only when some devices failed", () => {
    expect(summarizeDelivery({ tokens_sent: 31, tokens_failed: 1 })).toEqual({
      kind: "partial",
      delivered: 31,
      total: 32,
    });
    expect(summarizeDelivery({ tokens_sent: 64, tokens_failed: 0 })).toEqual({
      kind: "all",
      delivered: 64,
    });
  });

  it("reports nobody to send to as its own state, not as 0 delivered", () => {
    expect(summarizeDelivery({ tokens_sent: 0, tokens_failed: 0 })).toEqual({ kind: "none" });
  });

  it("keeps a send where every device failed visible as 0 of N", () => {
    expect(summarizeDelivery({ tokens_sent: 0, tokens_failed: 3 })).toEqual({
      kind: "partial",
      delivered: 0,
      total: 3,
    });
  });
});

describe("audienceOfLog", () => {
  it("maps every type the backend writes", () => {
    expect(audienceOfLog(log({ type: "USER" }))).toBe("person");
    expect(audienceOfLog(log({ type: "CLUB", target_type: "club_section" }))).toBe("club");
    expect(audienceOfLog(log({ type: "SECTION_ROLE", target_type: "section_role" }))).toBe("club");
    expect(audienceOfLog(log({ type: "BROADCAST", target_type: "all" }))).toBe("everyone");
    expect(audienceOfLog(log({ type: "GLOBAL_ROLE", target_type: "global_role" }))).toBe("role");
    expect(audienceOfLog(log({ type: "OTHER", target_type: "mystery" }))).toBeNull();
  });
});

describe("parseHistoryFilters / filterHistoryLogs", () => {
  it("ignores unknown values", () => {
    expect(parseHistoryFilters({ audience: "x", range: "5", q: ["  hola  "] })).toEqual({
      q: "hola",
      audience: "all",
      range: "all",
    });
    expect(hasActiveFilters(parseHistoryFilters({}))).toBe(false);
    expect(hasActiveFilters(parseHistoryFilters({ range: "30" }))).toBe(true);
  });

  it("searches title and body without caring for accents or case", () => {
    const rows = [log({ log_id: 1, title: "Inscripción abierta" }), log({ log_id: 2, title: "Otro" })];
    const filters = parseHistoryFilters({ q: "INSCRIPCION" });
    expect(filterHistoryLogs(rows, filters, NOW).map((r) => r.log_id)).toEqual([1]);
  });

  it("filters by audience and by age", () => {
    const rows = [
      log({ log_id: 1, type: "BROADCAST", target_type: "all", created_at: "2026-11-23T10:00:00Z" }),
      log({ log_id: 2, type: "USER", created_at: "2026-11-23T10:00:00Z" }),
      log({ log_id: 3, type: "BROADCAST", target_type: "all", created_at: "2026-09-01T10:00:00Z" }),
    ];
    const filters = parseHistoryFilters({ audience: "everyone", range: "30" });
    expect(filterHistoryLogs(rows, filters, NOW).map((r) => r.log_id)).toEqual([1]);
  });
});

describe("parseNotificationTab", () => {
  it("defaults to the sent history", () => {
    expect(parseNotificationTab(undefined)).toBe("sent");
    expect(parseNotificationTab("categories")).toBe("categories");
    expect(parseNotificationTab("x")).toBe("sent");
  });
});
