"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CronRunsSummary, CronRecentRun, CronJobStats } from "@/lib/api/analytics";

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface CronRunsSectionProps {
  data: CronRunsSummary;
}

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

function formatFailureRate(rate: number | null): string {
  if (rate === null) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

type CronStatus = "completed" | "failed" | "skipped" | "running";

function statusVariant(
  status: string,
): "default" | "destructive" | "secondary" | "outline" {
  switch (status as CronStatus) {
    case "completed": return "default";
    case "failed":    return "destructive";
    case "running":   return "default";
    case "skipped":   return "secondary";
    default:          return "secondary";
  }
}

function statusLabel(status: string): string {
  switch (status as CronStatus) {
    case "completed": return "Completado";
    case "failed":    return "Fallido";
    case "running":   return "Ejecutando";
    case "skipped":   return "Omitido";
    default:          return status;
  }
}

// Running gets a blue-ish look via className override
function StatusBadge({
  status,
  errorMessage,
}: {
  status: string | null;
  errorMessage?: string | null;
}) {
  if (!status) {
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        Sin ejecuciones
      </Badge>
    );
  }

  const badge = (
    <Badge
      variant={statusVariant(status)}
      className={`text-xs ${status === "running" ? "bg-blue-500 hover:bg-blue-500/80 text-white" : ""}`}
    >
      {statusLabel(status)}
    </Badge>
  );

  if (status === "failed" && errorMessage) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default">{badge}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm break-words font-mono text-xs">
          {errorMessage}
        </TooltipContent>
      </Tooltip>
    );
  }

  return badge;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CronRunsSection({ data }: CronRunsSectionProps) {
  // Index server data by job_name for O(1) lookups
  const recentByName = new Map<string, CronRecentRun>(
    data.recent.map((r) => [r.job_name, r]),
  );
  const statsByName = new Map<string, CronJobStats>(
    data.stats.map((s) => [s.job_name, s]),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cron Jobs</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6 min-w-[200px]">Job</TableHead>
                <TableHead>Última ejecución</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead>Último éxito</TableHead>
                <TableHead>Último fallo</TableHead>
                <TableHead className="text-right">Tasa fallo 7d</TableHead>
                <TableHead className="text-right pr-6">Runs 7d</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {JOB_DEFINITIONS.map((def) => {
                const run   = recentByName.get(def.canonical_name) ?? null;
                const stats = statsByName.get(def.canonical_name) ?? null;

                return (
                  <TableRow key={def.canonical_name}>
                    {/* Job name */}
                    <TableCell className="pl-6">
                      <span className="text-sm font-medium">{def.display_name}</span>
                      <span className="block text-[11px] text-muted-foreground font-mono">
                        {def.canonical_name}
                      </span>
                    </TableCell>

                    {/* Última ejecución */}
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(run?.started_at ?? null)}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <StatusBadge
                        status={run?.status ?? null}
                        errorMessage={run?.error_message}
                      />
                    </TableCell>

                    {/* Duración */}
                    <TableCell className="tabular-nums text-sm">
                      {formatDuration(run?.duration_ms ?? null)}
                    </TableCell>

                    {/* Items procesados */}
                    <TableCell className="text-right tabular-nums text-sm">
                      {run?.items_processed !== undefined && run.items_processed !== null
                        ? run.items_processed.toLocaleString("es-MX")
                        : "—"}
                    </TableCell>

                    {/* Último éxito */}
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(stats?.last_success ?? null)}
                    </TableCell>

                    {/* Último fallo */}
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(stats?.last_failure ?? null)}
                    </TableCell>

                    {/* Tasa fallo 7d */}
                    <TableCell className="text-right tabular-nums text-sm">
                      {formatFailureRate(stats?.failure_rate_7d ?? null)}
                    </TableCell>

                    {/* Runs 7d */}
                    <TableCell className="text-right tabular-nums text-sm pr-6">
                      {stats !== null ? stats.total_runs_7d.toLocaleString("es-MX") : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
