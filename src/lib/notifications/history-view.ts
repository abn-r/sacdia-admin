import type { NotificationLog } from "@/lib/api/notifications";

/**
 * Pure helpers for the "Enviadas" tab. They live outside the `"use client"`
 * modules so server components can import them.
 *
 * `GET /notifications/history` only paginates (`page`, `limit`): search, type
 * and date filters are applied here, over the rows already fetched.
 */

export type NotificationTab = "sent" | "categories";

export function parseNotificationTab(value: string | undefined | null): NotificationTab {
  return value === "categories" ? "categories" : "sent";
}

/** Who the notification went to, in the words of the compose form. */
export type NotificationAudience = "person" | "club" | "everyone" | "role";

export const NOTIFICATION_AUDIENCES: readonly NotificationAudience[] = [
  "person",
  "club",
  "everyone",
  "role",
];

export const HISTORY_RANGES = ["all", "7", "30", "90"] as const;
export type HistoryRange = (typeof HISTORY_RANGES)[number];

export type NotificationHistoryFilters = {
  q: string;
  audience: NotificationAudience | "all";
  range: HistoryRange;
};

export const MAX_FILTERED_ROWS = 100;

/** `notification_logs.type` values the backend writes -> audience. */
export function audienceOfLog(log: Pick<NotificationLog, "type" | "target_type">): NotificationAudience | null {
  switch (log.type) {
    case "USER":
      return "person";
    case "CLUB":
    case "SECTION_ROLE":
      return "club";
    case "BROADCAST":
      return "everyone";
    case "GLOBAL_ROLE":
      return "role";
    default:
      break;
  }
  switch (log.target_type) {
    case "user":
      return "person";
    case "club_section":
    case "section_role":
      return "club";
    case "all":
      return "everyone";
    case "global_role":
      return "role";
    default:
      return null;
  }
}

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.find((entry) => typeof entry === "string");
  return undefined;
}

export function parseHistoryFilters(raw: RawParams): NotificationHistoryFilters {
  const q = (first(raw.q) ?? "").trim().slice(0, 100);
  const audienceRaw = first(raw.audience);
  const audience = NOTIFICATION_AUDIENCES.find((value) => value === audienceRaw) ?? "all";
  const rangeRaw = first(raw.range);
  const range = HISTORY_RANGES.find((value) => value === rangeRaw) ?? "all";
  return { q, audience, range };
}

export function hasActiveFilters(filters: NotificationHistoryFilters): boolean {
  return filters.q !== "" || filters.audience !== "all" || filters.range !== "all";
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function filterHistoryLogs<T extends NotificationLog>(
  logs: T[],
  filters: NotificationHistoryFilters,
  now: Date = new Date(),
): T[] {
  const query = normalize(filters.q);
  const cutoff =
    filters.range === "all"
      ? null
      : now.getTime() - Number(filters.range) * 24 * 60 * 60 * 1000;

  return logs.filter((log) => {
    if (filters.audience !== "all" && audienceOfLog(log) !== filters.audience) return false;
    if (cutoff !== null) {
      const at = new Date(log.created_at).getTime();
      if (Number.isNaN(at) || at < cutoff) return false;
    }
    if (query) {
      const haystack = normalize(`${log.title} ${log.body}`);
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export type DeliverySummary =
  | { kind: "none" }
  | { kind: "all"; delivered: number }
  | { kind: "partial"; delivered: number; total: number };

/**
 * `tokens_sent` is what the push service accepted, `tokens_failed` what it
 * rejected: total devices = both. "31 de 32"; plain "64" when nothing failed;
 * "Sin dispositivos" when there was nobody to send to.
 */
export function summarizeDelivery(
  log: Pick<NotificationLog, "tokens_sent" | "tokens_failed">,
): DeliverySummary {
  const delivered = Math.max(0, log.tokens_sent);
  const failed = Math.max(0, log.tokens_failed);
  const total = delivered + failed;
  if (total === 0) return { kind: "none" };
  if (failed === 0) return { kind: "all", delivered };
  return { kind: "partial", delivered, total };
}
