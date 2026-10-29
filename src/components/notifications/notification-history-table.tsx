import { Bell, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTranslations } from "next-intl/server";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { getNotificationHistory, type NotificationLog } from "@/lib/api/notifications";
import {
  formatNotificationTargetUser,
  resolveNotificationTargetUsers,
} from "@/lib/notifications/history-targets";
import { ApiError } from "@/lib/api/client";
import { getFormatDateTime } from "@/lib/format-locale";

interface NotificationHistoryTableProps {
  page: number;
  limit: number;
}

function typeVariant(type: string): "default" | "secondary" | "outline" {
  if (type === "BROADCAST") return "default";
  if (type === "USER") return "secondary";
  return "outline";
}

function senderName(log: NotificationLog, systemLabel: string): string {
  const parts = [log.users?.name, log.users?.paternal_last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return log.users?.email ?? log.sent_by ?? systemLabel;
}

// Every `type` value the backend writes to notification_logs
// (sacdia-backend/src/notifications/notifications.processor.ts).
const TYPE_LABEL_KEYS = {
  BROADCAST: "type_broadcast",
  USER: "type_user",
  CLUB: "type_club",
  SECTION_ROLE: "type_section_role",
  GLOBAL_ROLE: "type_global_role",
} as const;

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

export async function NotificationHistoryTable({
  page,
  limit,
}: NotificationHistoryTableProps) {
  const t = await getTranslations("notifications.history");
  const formatDate = await getFormatDateTime();

  let result: Awaited<ReturnType<typeof getNotificationHistory>> | null = null;
  let errorMessage: string | null = null;

  try {
    result = await getNotificationHistory(page, limit);
  } catch (error) {
    errorMessage =
      error instanceof ApiError
        ? error.message
        : t("error_load");
  }

  if (errorMessage) {
    return <EndpointErrorBanner state="missing" detail={errorMessage} />;
  }

  if (!result || result.data.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title={t("empty_title")}
        description={t("empty_description")}
      />
    );
  }

  const targetUserIds = result.data
    .filter((log) => log.target_type === "user" && log.target_id)
    .map((log) => log.target_id as string);

  const targetUsers = await resolveNotificationTargetUsers(targetUserIds);

  function renderTargetCell(log: NotificationLog) {
    const targetLabelKey = labelKeyFor(TARGET_TYPE_LABEL_KEYS, log.target_type);

    if (log.target_type === "user" && log.target_id) {
      const user = targetUsers.get(log.target_id);
      const display = user
        ? formatNotificationTargetUser(user, log.target_id)
        : { primary: t("target_user_unknown") };

      return (
        <div className="min-w-0 max-w-[220px]">
          <p className="truncate font-medium text-sm">{display.primary}</p>
          {display.secondary ? (
            <p className="truncate text-muted-foreground text-xs">
              {display.secondary}
            </p>
          ) : null}
        </div>
      );
    }

    if (log.target_type === "all") {
      return (
        <span className="text-muted-foreground text-sm">{t("target_all")}</span>
      );
    }

    return (
      <span className="text-muted-foreground text-sm">
        {targetLabelKey ? t(targetLabelKey) : log.target_type}
        {log.target_id ? (
          <span className="ml-1 font-mono text-xs">({log.target_id})</span>
        ) : null}
      </span>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">{t("col_title")}</TableHead>
                <TableHead>{t("col_type")}</TableHead>
                <TableHead className="hidden xl:table-cell">{t("col_target")}</TableHead>
                <TableHead className="text-center">{t("col_sent")}</TableHead>
                <TableHead className="text-center">{t("col_failed")}</TableHead>
                <TableHead className="hidden xl:table-cell">{t("col_sent_by")}</TableHead>
                <TableHead>{t("col_date")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((log) => {
                const typeLabelKey = labelKeyFor(TYPE_LABEL_KEYS, log.type);
                return (
                  <TableRow key={log.log_id}>
                    <TableCell>
                      <div className="max-w-[260px]">
                        <p className="truncate font-medium text-sm">{log.title}</p>
                        <p className="truncate text-muted-foreground text-xs">{log.body}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={typeVariant(log.type)}>
                        {typeLabelKey ? t(typeLabelKey) : log.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">{renderTargetCell(log)}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-sm text-success">
                        <CheckCircle2 className="size-3.5" />
                        {log.tokens_sent}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-sm text-destructive">
                        <XCircle className="size-3.5" />
                        {log.tokens_failed}
                      </span>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <span className="text-sm">{senderName(log, t("sender_system"))}</span>
                    </TableCell>
                    <TableCell>
                      <span className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(log.created_at)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DataTablePagination
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        limit={result.limit}
      />
    </div>
  );
}
