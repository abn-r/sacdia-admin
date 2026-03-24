"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Eye,
  Pencil,
  Zap,
  Send,
  Download,
  Plus,
  RefreshCw,
  Filter,
  Loader2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import {
  listMonthlyReports,
  createOrGetDraftReport,
  generateReport,
  submitReport,
  getReportPdfUrl,
  type MonthlyReport,
  type ReportStatus,
} from "@/lib/api/monthly-reports";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES: Record<number, string> = {
  1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
  5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
  9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
};

const STATUS_CONFIG: Record<ReportStatus, { label: string; variant: "warning" | "default" | "success" }> = {
  draft: { label: "Borrador", variant: "warning" },
  generated: { label: "Generado", variant: "default" },
  submitted: { label: "Enviado", variant: "success" },
};

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

const MONTHS = Object.entries(MONTH_NAMES).map(([value, label]) => ({
  value: Number(value),
  label,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ReportsTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {["Mes", "Año", "Estado", "Generado", "Enviado", "Acciones"].map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 4 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-8 w-32" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReportsListClientProps {
  enrollmentId: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReportsListClient({ enrollmentId }: ReportsListClientProps) {
  const router = useRouter();

  // Filters
  const [filterYear, setFilterYear] = useState<number | undefined>(currentYear);
  const [filterStatus, setFilterStatus] = useState<ReportStatus | "all">("all");

  // Data
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Action loading per report
  const [actionLoading, setActionLoading] = useState<Record<number, string>>({});

  // New report creation state
  const [createMonth, setCreateMonth] = useState<number>(new Date().getMonth() + 1);
  const [createYear, setCreateYear] = useState<number>(currentYear);
  const [creating, setCreating] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      let data = await listMonthlyReports(
        enrollmentId,
        filterStatus !== "all" ? filterStatus : undefined,
      );
      if (filterYear) {
        data = data.filter((r) => r.year === filterYear);
      }
      setReports(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al cargar los reportes.";
      toast.error(message);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [enrollmentId, filterYear, filterStatus]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // ─── Action handlers ──────────────────────────────────────────────────────

  async function handleCreateReport() {
    setCreating(true);
    try {
      const report = await createOrGetDraftReport(enrollmentId, createMonth, createYear);
      toast.success(`Reporte para ${MONTH_NAMES[createMonth]} ${createYear} creado/abierto.`);
      router.push(`/dashboard/reports/${report.report_id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al crear el reporte.";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }

  async function handleGenerate(report: MonthlyReport) {
    setActionLoading((prev) => ({ ...prev, [report.report_id]: "generate" }));
    try {
      const updated = await generateReport(report.report_id);
      setReports((prev) =>
        prev.map((r) => (r.report_id === updated.report_id ? updated : r)),
      );
      toast.success(`Reporte de ${MONTH_NAMES[report.month]} ${report.year} generado.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al generar el reporte.";
      toast.error(message);
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[report.report_id];
        return next;
      });
    }
  }

  async function handleSubmit(report: MonthlyReport) {
    setActionLoading((prev) => ({ ...prev, [report.report_id]: "submit" }));
    try {
      const updated = await submitReport(report.report_id);
      setReports((prev) =>
        prev.map((r) => (r.report_id === updated.report_id ? updated : r)),
      );
      toast.success(`Reporte de ${MONTH_NAMES[report.month]} ${report.year} enviado al campo.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al enviar el reporte.";
      toast.error(message);
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[report.report_id];
        return next;
      });
    }
  }

  function handleDownloadPdf(report: MonthlyReport) {
    const url = getReportPdfUrl(report.report_id);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Filters and new report bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="size-4" />
          <span>Filtros:</span>
        </div>

        {/* Year filter */}
        <Select
          value={filterYear?.toString() ?? "all"}
          onValueChange={(v) => setFilterYear(v === "all" ? undefined : Number(v))}
        >
          <SelectTrigger className="h-8 w-[110px]">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los años</SelectItem>
            {YEARS.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v as ReportStatus | "all")}
        >
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="generated">Generado</SelectItem>
            <SelectItem value="submitted">Enviado</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchReports}
          disabled={loading}
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>

        {/* Spacer */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Month selector for new report */}
          <Select
            value={createMonth.toString()}
            onValueChange={(v) => setCreateMonth(Number(v))}
          >
            <SelectTrigger className="h-8 w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value.toString()}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={createYear.toString()}
            onValueChange={(v) => setCreateYear(Number(v))}
          >
            <SelectTrigger className="h-8 w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size="sm" onClick={handleCreateReport} disabled={creating}>
            {creating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Nuevo reporte
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <ReportsTableSkeleton />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin reportes"
          description="No se encontraron reportes mensuales para los filtros seleccionados."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead>Año</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden md:table-cell">Generado</TableHead>
                <TableHead className="hidden md:table-cell">Enviado</TableHead>
                <TableHead className="w-[200px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => {
                const statusConfig = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.draft;
                const loadingAction = actionLoading[report.report_id];
                const isDisabled = Boolean(loadingAction);
                const isSubmitted = report.status === "submitted";
                const isGenerated = report.status === "generated";

                return (
                  <TableRow key={report.report_id}>
                    <TableCell className="font-medium">
                      {MONTH_NAMES[report.month] ?? report.month}
                    </TableCell>
                    <TableCell className="tabular-nums">{report.year}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig.variant} className="text-xs">
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {formatDate(report.generated_at)}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {formatDate(report.submitted_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {/* View / Edit */}
                        <Button variant="ghost" size="xs" asChild>
                          <Link href={`/dashboard/reports/${report.report_id}`}>
                            {isSubmitted ? (
                              <Eye className="size-3" />
                            ) : (
                              <Pencil className="size-3" />
                            )}
                            {isSubmitted ? "Ver" : "Editar"}
                          </Link>
                        </Button>

                        {/* Generate */}
                        {!isSubmitted && (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleGenerate(report)}
                            disabled={isDisabled}
                          >
                            {loadingAction === "generate" ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Zap className="size-3" />
                            )}
                            Generar
                          </Button>
                        )}

                        {/* Submit */}
                        {isGenerated && (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleSubmit(report)}
                            disabled={isDisabled}
                          >
                            {loadingAction === "submit" ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Send className="size-3" />
                            )}
                            Enviar
                          </Button>
                        )}

                        {/* PDF */}
                        {(isGenerated || isSubmitted) && (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleDownloadPdf(report)}
                          >
                            <Download className="size-3" />
                            PDF
                          </Button>
                        )}
                      </div>
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
