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
import { ApiError } from "@/lib/api/client";

interface NotificationHistoryTableProps {
  page: number;
  limit: number;
}

function typeVariant(type: string): "default" | "secondary" | "outline" {
  if (type === "BROADCAST") return "default";
  if (type === "USER") return "secondary";
  return "outline";
}

function formatDate(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

function senderName(log: NotificationLog): string {
  const parts = [log.users?.name, log.users?.paternal_last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return log.users?.email ?? log.sent_by;
}

const TYPE_LABEL_KEYS: Record<string, string> = {
  BROADCAST: "type_broadcast",
  USER: "type_user",
  CLUB: "type_club",
};

const TARGET_TYPE_LABEL_KEYS: Record<string, string> = {
  all: "target_all",
  user: "target_user",
  club_section: "target_club_section",
};

export async function NotificationHistoryTable({
  page,
  limit,
}: NotificationHistoryTableProps) {
  const t = await getTranslations("notifications.history");

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

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("col_title")}</TableHead>
                <TableHead>{t("col_type")}</TableHead>
                <TableHead>{t("col_target")}</TableHead>
                <TableHead className="text-center">{t("col_sent")}</TableHead>
                <TableHead className="text-center">{t("col_failed")}</TableHead>
                <TableHead>{t("col_sent_by")}</TableHead>
                <TableHead>{t("col_date")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((log) => {
                const typeLabelKey = TYPE_LABEL_KEYS[log.type];
                const targetLabelKey = TARGET_TYPE_LABEL_KEYS[log.target_type];
                return (
                  <TableRow key={log.log_id}>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="truncate font-medium text-sm">{log.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{log.body}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={typeVariant(log.type)}>
                        {typeLabelKey ? t(typeLabelKey as Parameters<typeof t>[0]) : log.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {targetLabelKey ? t(targetLabelKey as Parameters<typeof t>[0]) : log.target_type}
                        {log.target_id && (
                          <span className="ml-1 font-mono text-xs">({log.target_id})</span>
                        )}
                      </span>
                    </TableCell>
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
                    <TableCell>
                      <span className="text-sm">{senderName(log)}</span>
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
