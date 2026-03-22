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
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { getNotificationHistory, type NotificationLog } from "@/lib/api/notifications";
import { ApiError } from "@/lib/api/client";

interface NotificationHistoryTableProps {
  page: number;
  limit: number;
}

const TYPE_LABELS: Record<string, string> = {
  BROADCAST: "Broadcast",
  USER: "Usuario",
  CLUB: "Club",
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  all: "Todos",
  user: "Usuario",
  club_section: "Sección de club",
};

function typeVariant(type: string): "default" | "secondary" | "outline" {
  if (type === "BROADCAST") return "default";
  if (type === "USER") return "secondary";
  return "outline";
}

function formatDate(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat("es-AR", {
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

export async function NotificationHistoryTable({
  page,
  limit,
}: NotificationHistoryTableProps) {
  let result: Awaited<ReturnType<typeof getNotificationHistory>> | null = null;
  let errorMessage: string | null = null;

  try {
    result = await getNotificationHistory(page, limit);
  } catch (error) {
    errorMessage =
      error instanceof ApiError
        ? error.message
        : "No se pudo cargar el historial de notificaciones.";
  }

  if (errorMessage) {
    return <EndpointErrorBanner state="missing" detail={errorMessage} />;
  }

  if (!result || result.data.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="Sin historial"
        description="Aún no se han enviado notificaciones."
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
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead className="text-center">Enviados</TableHead>
                <TableHead className="text-center">Fallidos</TableHead>
                <TableHead>Enviado por</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((log) => (
                <TableRow key={log.log_id}>
                  <TableCell>
                    <div className="max-w-[200px]">
                      <p className="truncate font-medium text-sm">{log.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{log.body}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={typeVariant(log.type)}>
                      {TYPE_LABELS[log.type] ?? log.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {TARGET_TYPE_LABELS[log.target_type] ?? log.target_type}
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
              ))}
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
