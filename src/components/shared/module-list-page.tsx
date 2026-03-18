import { type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { apiRequest, ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

export type ColumnDef = {
  key: string;
  label: string;
  format?: (value: unknown, item: Record<string, unknown>) => React.ReactNode;
};

interface ModuleListPageProps {
  title: string;
  description: string;
  endpoint: string;
  icon: LucideIcon;
  columns: ColumnDef[];
  idKey?: string;
  children?: React.ReactNode;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function extractItems(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === "object") {
    const res = payload as Record<string, unknown>;
    if (Array.isArray(res.data)) return res.data as Record<string, unknown>[];
    if (res.data && typeof res.data === "object" && Array.isArray((res.data as Record<string, unknown>).data)) {
      return (res.data as Record<string, unknown>).data as Record<string, unknown>[];
    }
  }
  return [];
}

export async function ModuleListPage({
  title,
  description,
  endpoint,
  icon: Icon,
  columns,
  idKey = "id",
  children,
}: ModuleListPageProps) {
  await requireAdminUser();

  let items: Record<string, unknown>[] = [];
  let available = true;
  let errorMsg = "";

  try {
    const payload = await apiRequest<unknown>(endpoint);
    items = extractItems(payload);
  } catch (error) {
    available = false;
    errorMsg = error instanceof ApiError ? error.message : "Error inesperado";
  }

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description}>
        {children}
      </PageHeader>

      {!available && (
        <EndpointErrorBanner state="missing" detail={errorMsg} />
      )}

      {!available && (
        <EmptyState
          icon={Icon}
          title={`No se pudo cargar ${title.toLowerCase()}`}
          description={errorMsg}
        />
      )}

      {available && items.length === 0 && (
        <EmptyState
          icon={Icon}
          title={`No hay ${title.toLowerCase()}`}
          description="No se encontraron registros."
        />
      )}

      {available && items.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => {
                const key = String(item[idKey] ?? idx);
                return (
                  <TableRow key={key}>
                    {columns.map((col) => {
                      const renderedValue = col.format
                        ? col.format(item[col.key], item)
                        : col.key.includes("date") || col.key.includes("_at")
                          ? formatDate(item[col.key] as string)
                          : String(item[col.key] ?? "—");

                      return (
                        <TableCell key={col.key} className="text-sm">
                          {renderedValue}
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      <Badge
                        variant={item.active !== false ? "default" : "outline"}
                        className="text-xs"
                      >
                        {item.active !== false ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
