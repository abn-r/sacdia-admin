import Link from "next/link";
import { Bell } from "lucide-react";
import { getTranslations } from "next-intl/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorStateTableRow } from "@/components/shared/error-state";
import { getNotificationHistory, type NotificationLog } from "@/lib/api/notifications";
import { errorStateFromError } from "@/lib/api/error-state";
import {
  formatNotificationTargetUser,
  resolveNotificationTargetUsers,
} from "@/lib/notifications/history-targets";
import {
  MAX_FILTERED_ROWS,
  filterHistoryLogs,
  hasActiveFilters,
  summarizeDelivery,
  type NotificationHistoryFilters,
} from "@/lib/notifications/history-view";
import { getFormatDateTime } from "@/lib/format-locale";

interface NotificationHistoryTableProps {
  page: number;
  limit: number;
  filters?: NotificationHistoryFilters;
}

const NO_FILTERS: NotificationHistoryFilters = { q: "", audience: "all", range: "all" };

function senderName(log: NotificationLog, systemLabel: string): string {
  const parts = [log.users?.name, log.users?.paternal_last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return log.users?.email ?? log.sent_by ?? systemLabel;
}

// Every `target_type` value the backend writes to notification_logs
// (sacdia-backend/src/notifications/notifications.processor.ts).
const TARGET_TYPE_LABEL_KEYS = {
  all: "target_all",
  user: "target_user",
  club_section: "target_club_section",
  section_role: "target_section_role",
  global_role: "target_global_role",
} as const;

function labelKeyFor<T extends Record<string, string>>(
  map: T,
  value: string,
): T[keyof T] | undefined {
  return Object.prototype.hasOwnProperty.call(map, value)
    ? (map[value as keyof T] as T[keyof T])
    : undefined;
}

const COLUMN_COUNT = 5;

export async function NotificationHistoryTable({
  page,
  limit,
  filters = NO_FILTERS,
}: NotificationHistoryTableProps) {
  const t = await getTranslations("notifications.history");
  const tc = await getTranslations("people.community.notifications.history");
  const formatDate = await getFormatDateTime();
  const filtering = hasActiveFilters(filters);

  let rows: NotificationLog[] = [];
  let meta = { page, limit, total: 0, totalPages: 1 };
  let failure: ReturnType<typeof errorStateFromError> | null = null;

  try {
    // The API only paginates: with a filter on, look at the latest 100 sends.
    const result = await getNotificationHistory(filtering ? 1 : page, filtering ? MAX_FILTERED_ROWS : limit);
    rows = filtering ? filterHistoryLogs(result.data, filters) : result.data;
    meta = {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    };
  } catch (error) {
    failure = errorStateFromError(error);
  }

  const headers = (
    <TableHeader>
      <TableRow>
        <TableHead className="min-w-[220px]">{tc("colNotification")}</TableHead>
        <TableHead>{tc("colFor")}</TableHead>
        <TableHead className="text-right">{tc("colDelivered")}</TableHead>
        <TableHead>{t("col_sent_by")}</TableHead>
        <TableHead>{t("col_date")}</TableHead>
      </TableRow>
    </TableHeader>
  );

  if (failure) {
    return (
      <DataTableShell>
        <Table>
          {headers}
          <TableBody>
            <ErrorStateTableRow
              colSpan={COLUMN_COUNT}
              kind={failure.kind}
              detail={failure.detail}
              icon={Bell}
              title={tc("loadError")}
              retry
            />
          </TableBody>
        </Table>
      </DataTableShell>
    );
  }

  if (rows.length === 0) {
    return filtering ? (
      <EmptyState
        icon={Bell}
        variant="no-results"
        title={tc("noResultsTitle")}
        description={tc("noResultsDescription", { count: MAX_FILTERED_ROWS })}
      >
        <Link
          href="/dashboard/notifications"
          className="text-primary text-sm underline-offset-4 hover:underline"
        >
          {tc("clearFilters")}
        </Link>
      </EmptyState>
    ) : (
      <EmptyState icon={Bell} title={t("empty_title")} description={t("empty_description")} />
    );
  }

  const targetUsers = await resolveNotificationTargetUsers(
    rows
      .filter((log) => log.target_type === "user" && log.target_id)
      .map((log) => log.target_id as string),
  );

  function targetText(log: NotificationLog): { primary: string; secondary?: string } {
    if (log.target_type === "user" && log.target_id) {
      const user = targetUsers.get(log.target_id);
      return user
        ? formatNotificationTargetUser(user, log.target_id)
        : { primary: t("target_user_unknown") };
    }
    const key = labelKeyFor(TARGET_TYPE_LABEL_KEYS, log.target_type);
    return {
      primary: key ? t(key) : log.target_type,
      ...(log.target_id && log.target_type !== "all" ? { secondary: `#${log.target_id}` } : {}),
    };
  }

  function delivery(log: NotificationLog) {
    const summary = summarizeDelivery(log);
    if (summary.kind === "none") {
      return <span className="text-muted-foreground">{tc("noDevices")}</span>;
    }
    if (summary.kind === "all") return <>{summary.delivered}</>;
    return <>{tc("deliveredOf", { delivered: summary.delivered, total: summary.total })}</>;
  }

  const systemLabel = t("sender_system");

  return (
    <div className="space-y-4">
      {filtering ? (
        <p className="text-muted-foreground text-sm">
          {tc("filteredNote", { count: MAX_FILTERED_ROWS })}
        </p>
      ) : null}

      <DataTableShell className="hidden md:block">
        <Table>
          {headers}
          <TableBody>
            {rows.map((log) => {
              const target = targetText(log);
              return (
                <TableRow key={log.log_id}>
                  <TableCell className="whitespace-normal">
                    <div className="max-w-[320px]">
                      <p className="truncate font-medium text-sm">{log.title}</p>
                      <p className="truncate text-[13px] text-muted-foreground">{log.body}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0 max-w-[220px]">
                      <p className="truncate text-sm">{target.primary}</p>
                      {target.secondary ? (
                        <p className="truncate text-muted-foreground text-xs">{target.secondary}</p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{delivery(log)}</TableCell>
                  <TableCell className="text-sm">{senderName(log, systemLabel)}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                    {formatDate(log.created_at)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      <ul className="divide-y rounded-xl bg-card shadow-card md:hidden">
        {rows.map((log) => {
          const target = targetText(log);
          return (
            <li key={log.log_id} className="space-y-1 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate font-medium text-sm">{log.title}</p>
                <span className="shrink-0 text-sm tabular-nums">{delivery(log)}</span>
              </div>
              <p className="flex flex-wrap gap-x-3 text-[13px] text-muted-foreground tabular-nums">
                <span>{target.primary}</span>
                <span>{senderName(log, systemLabel)}</span>
                <span>{formatDate(log.created_at)}</span>
              </p>
            </li>
          );
        })}
      </ul>

      {filtering ? null : (
        <DataTablePagination
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          limit={meta.limit}
        />
      )}
    </div>
  );
}
