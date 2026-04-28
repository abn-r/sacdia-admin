"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CronHistoryItem, CronHistoryPage } from "@/lib/api/analytics";

// ─── Constants ────────────────────────────────────────────────────────────────

type JobDefinition = {
  canonical_name: string;
  display_name: string;
};

const JOB_DEFINITIONS: JobDefinition[] = [
  { canonical_name: "monthly-reports-auto-generate",  display_name: "Reportes mensuales (auto-generar)" },
  { canonical_name: "rankings-recalculate",           display_name: "Rankings anuales (recalcular)" },
  { canonical_name: "data-export-cleanup",            display_name: "Cleanup exportes vencidos" },
  { canonical_name: "member-of-month-auto-evaluate",  display_name: "Miembro del mes (auto-evaluar)" },
  { canonical_name: "finance-period-closing",         display_name: "Cierre de periodo financiero" },
  { canonical_name: "activities-reminder",            display_name: "Recordatorios de actividades" },
  { canonical_name: "membership-requests-expiry",     display_name: "Expirar solicitudes de membresía" },
  { canonical_name: "cleanup-expired-records",        display_name: "Cleanup sesiones/tokens vencidos" },
  { canonical_name: "fcm-tokens-cleanup",             display_name: "Cleanup FCM tokens huérfanos" },
];

const STATUS_OPTIONS = [
  { value: "all",       label: "Todos los estados" },
  { value: "completed", label: "Completado" },
  { value: "failed",    label: "Fallido" },
  { value: "skipped",   label: "Omitido" },
  { value: "running",   label: "Ejecutando" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : dateFormatter.format(d);
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${minutes}min ${seconds}s`;
}

function statusVariant(
  status: string,
): "default" | "destructive" | "secondary" | "outline" {
  switch (status) {
    case "completed": return "default";
    case "failed":    return "destructive";
    case "running":   return "default";
    case "skipped":   return "secondary";
    default:          return "secondary";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "completed": return "Completado";
    case "failed":    return "Fallido";
    case "running":   return "Ejecutando";
    case "skipped":   return "Omitido";
    default:          return status;
  }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={statusVariant(status)}
      className={`text-xs ${status === "running" ? "bg-blue-500 hover:bg-blue-500/80 text-white" : status === "completed" ? "bg-green-600 hover:bg-green-600/80 text-white" : ""}`}
    >
      {statusLabel(status)}
    </Badge>
  );
}

function jobDisplayName(canonicalName: string): string {
  return (
    JOB_DEFINITIONS.find((d) => d.canonical_name === canonicalName)
      ?.display_name ?? canonicalName
  );
}

// ─── Detail Dialog ────────────────────────────────────────────────────────────

interface DetailDialogProps {
  item: CronHistoryItem | null;
  onClose: () => void;
}

function DetailDialog({ item, onClose }: DetailDialogProps) {
  return (
    <Dialog open={item !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            Detalles del run #{item?.run_id}
          </DialogTitle>
        </DialogHeader>
        {item && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Job</p>
                <p className="font-medium">{jobDisplayName(item.job_name)}</p>
                <p className="text-xs text-muted-foreground font-mono">{item.job_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                <StatusBadge status={item.status} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Inicio</p>
                <p>{formatDate(item.started_at)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Fin</p>
                <p>{formatDate(item.ended_at)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Duración</p>
                <p>{formatDuration(item.duration_ms)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Items procesados</p>
                <p>{item.items_processed !== null ? item.items_processed.toLocaleString("es-MX") : "—"}</p>
              </div>
            </div>
            {item.error_message && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Mensaje de error</p>
                <pre className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-mono whitespace-pre-wrap break-all">
                  {item.error_message}
                </pre>
              </div>
            )}
            {item.metadata && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Metadata</p>
                <pre className="rounded-md bg-muted border p-3 text-xs font-mono whitespace-pre-wrap break-all overflow-x-auto">
                  {JSON.stringify(item.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CronHistorySearchParams {
  job_name?: string;
  status?: string;
  since?: string;
  until?: string;
  page?: string;
}

interface CronHistoryClientProps {
  initialData: CronHistoryPage;
  searchParams: CronHistorySearchParams;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CronHistoryClient({
  initialData,
  searchParams,
}: CronHistoryClientProps) {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<CronHistoryItem | null>(null);

  const currentPage = initialData.page;
  const totalPages = Math.ceil(initialData.total / initialData.limit);

  // ── Filter helpers ─────────────────────────────────────────────────────────

  function buildUrl(overrides: Partial<CronHistorySearchParams>): string {
    const merged: Record<string, string> = {};
    const base: CronHistorySearchParams = { ...searchParams, ...overrides };
    if (base.job_name && base.job_name !== "all") merged.job_name = base.job_name;
    if (base.status && base.status !== "all") merged.status = base.status;
    if (base.since) merged.since = base.since;
    if (base.until) merged.until = base.until;
    if (base.page && base.page !== "1") merged.page = base.page;
    const qs = new URLSearchParams(merged);
    return `/dashboard/system/jobs/history${qs.toString() ? `?${qs}` : ""}`;
  }

  function handleFilterChange(key: keyof CronHistorySearchParams, value: string) {
    router.push(buildUrl({ [key]: value, page: "1" }));
  }

  function handlePageChange(newPage: number) {
    router.push(buildUrl({ page: String(newPage) }));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <DetailDialog item={selectedItem} onClose={() => setSelectedItem(null)} />

      <div className="space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-3 items-end">
              {/* Job name filter */}
              <div className="flex flex-col gap-1.5 min-w-[220px]">
                <span className="text-xs text-muted-foreground font-medium">Job</span>
                <Select
                  value={searchParams.job_name ?? "all"}
                  onValueChange={(v) => handleFilterChange("job_name", v)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Todos los jobs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los jobs</SelectItem>
                    {JOB_DEFINITIONS.map((def) => (
                      <SelectItem key={def.canonical_name} value={def.canonical_name}>
                        {def.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status filter */}
              <div className="flex flex-col gap-1.5 min-w-[180px]">
                <span className="text-xs text-muted-foreground font-medium">Estado</span>
                <Select
                  value={searchParams.status ?? "all"}
                  onValueChange={(v) => handleFilterChange("status", v)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Since */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground font-medium">Desde</span>
                <Input
                  type="date"
                  className="h-8 text-sm w-[150px]"
                  value={searchParams.since ?? ""}
                  onChange={(e) => handleFilterChange("since", e.target.value)}
                />
              </div>

              {/* Until */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground font-medium">Hasta</span>
                <Input
                  type="date"
                  className="h-8 text-sm w-[150px]"
                  value={searchParams.until ?? ""}
                  onChange={(e) => handleFilterChange("until", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {initialData.total.toLocaleString("es-MX")} registros
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {initialData.items.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-muted-foreground">
                  No se encontraron ejecuciones con los filtros aplicados.
                </p>
              </div>
            ) : (
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Job</TableHead>
                      <TableHead>Inicio</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Duración</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="max-w-[200px]">Error</TableHead>
                      <TableHead className="pr-6 text-right">Detalles</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {initialData.items.map((item) => (
                      <TableRow key={item.run_id}>
                        {/* Job */}
                        <TableCell className="pl-6">
                          <span className="text-sm font-medium">
                            {jobDisplayName(item.job_name)}
                          </span>
                          <span className="block text-[11px] text-muted-foreground font-mono">
                            {item.job_name}
                          </span>
                        </TableCell>

                        {/* Inicio */}
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(item.started_at)}
                        </TableCell>

                        {/* Estado */}
                        <TableCell>
                          <StatusBadge status={item.status} />
                        </TableCell>

                        {/* Duración */}
                        <TableCell className="tabular-nums text-sm">
                          {formatDuration(item.duration_ms)}
                        </TableCell>

                        {/* Items */}
                        <TableCell className="text-right tabular-nums text-sm">
                          {item.items_processed !== null
                            ? item.items_processed.toLocaleString("es-MX")
                            : "—"}
                        </TableCell>

                        {/* Error truncado */}
                        <TableCell className="max-w-[200px]">
                          {item.error_message ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block truncate text-xs text-destructive cursor-default font-mono">
                                  {item.error_message}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-sm break-words font-mono text-xs"
                              >
                                {item.error_message}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* Detalles */}
                        <TableCell className="pr-6 text-right">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setSelectedItem(item)}
                            className="gap-1.5"
                          >
                            <Info className="size-3" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-muted-foreground">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                <ChevronLeft className="size-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Siguiente
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
