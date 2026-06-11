"use client";

import { FormEvent, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  Clock3,
  HelpCircle,
  Loader2,
  Mail,
  Search,
  User,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  updateSupportReportStatus,
  type SupportReport,
  type SupportReportCategory,
  type SupportReportStatus,
  type SupportReportsPage,
} from "@/lib/api/support-reports";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<SupportReportStatus, string> = {
  open: "Abierto",
  in_progress: "En atención",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const CATEGORY_LABELS: Record<SupportReportCategory, string> = {
  bug: "Error",
  feature_request: "Sugerencia",
  account: "Cuenta",
  data_issue: "Datos",
  performance: "Rendimiento",
  other: "Otro",
};

const STATUS_STYLES: Record<SupportReportStatus, string> = {
  open: "border-red-200 bg-red-50 text-red-700",
  in_progress: "border-amber-200 bg-amber-50 text-amber-700",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  closed: "border-slate-200 bg-slate-50 text-slate-700",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function safeJson(value: unknown) {
  if (value == null) return "Sin datos";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "No se pudo mostrar el contenido";
  }
}

interface SupportReportsClientProps {
  pageData: SupportReportsPage;
  filters: {
    search?: string;
    status?: SupportReportStatus;
    category?: SupportReportCategory;
    page: number;
    limit: number;
  };
}

export function SupportReportsClient({
  pageData,
  filters,
}: SupportReportsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.search ?? "");
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null);

  function updateFilters(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(next)) {
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    params.set("page", "1");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateFilters({ search: search.trim() || undefined });
  }

  async function handleStatusChange(report: SupportReport, value: string) {
    const status = value as SupportReportStatus;
    setLoadingReportId(report.id);
    try {
      await updateSupportReportStatus(report.id, status);
      toast.success(
        `Reporte marcado como ${STATUS_LABELS[status].toLowerCase()}.`,
      );
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el reporte.";
      toast.error(message);
    } finally {
      setLoadingReportId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(pageData.total / pageData.limit));
  const openCount = pageData.items.filter(
    (item) => item.status === "open",
  ).length;
  const activeCount = pageData.items.filter(
    (item) => item.status === "in_progress",
  ).length;
  const resolvedCount = pageData.items.filter(
    (item) => item.status === "resolved",
  ).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard
          label="Abiertos en esta página"
          value={openCount}
          icon={AlertCircle}
        />
        <SummaryCard label="En atención" value={activeCount} icon={Clock3} />
        <SummaryCard
          label="Resueltos"
          value={resolvedCount}
          icon={CheckCircle2}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por título, descripción, nombre o correo"
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline" disabled={isPending}>
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Buscar"
              )}
            </Button>
          </form>

          <Select
            value={filters.status ?? "all"}
            onValueChange={(value) => updateFilters({ status: value })}
          >
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.category ?? "all"}
            onValueChange={(value) => updateFilters({ category: value })}
          >
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {pageData.items.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="Sin reportes de soporte"
          description="No hay reportes que coincidan con los filtros actuales."
          variant="no-results"
        />
      ) : (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reporte</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="w-[190px]">Atención</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.items.map((report) => (
                <TableRow key={report.id} className="align-top">
                  <TableCell className="min-w-[320px] space-y-2">
                    <div>
                      <p className="font-medium text-foreground">
                        {report.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {report.description}
                      </p>
                    </div>
                    <details className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                      <summary className="cursor-pointer font-medium text-foreground">
                        Contexto técnico
                      </summary>
                      <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words">
                        {safeJson({
                          deviceInfo: report.deviceInfo,
                          userContext: report.userContext,
                        })}
                      </pre>
                    </details>
                  </TableCell>
                  <TableCell className="min-w-[220px]">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-muted">
                        <User className="size-4 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">
                          {report.user.name ?? "Sin nombre"}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="size-3" />
                          {report.user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      <Bug className="size-3" />
                      {CATEGORY_LABELS[report.category]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("border", STATUS_STYLES[report.status])}
                    >
                      {STATUS_LABELS[report.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-[150px] text-sm text-muted-foreground">
                    {formatDate(report.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={report.status}
                      disabled={loadingReportId === report.id}
                      onValueChange={(value) =>
                        handleStatusChange(report, value)
                      }
                    >
                      <SelectTrigger className="w-[170px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      <DataTablePagination
        page={pageData.page}
        totalPages={totalPages}
        total={pageData.total}
        limit={pageData.limit}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
