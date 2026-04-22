"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { RefreshCw, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { JobsOverview, JobCounts, FailedJob } from "@/lib/api/analytics";
import { retryJob } from "@/lib/api/analytics";

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobsOverviewClientProps {
  data: JobsOverview;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(timestamp: string | null): string {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  return isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

// ─── Queue Card ───────────────────────────────────────────────────────────────

type QueueStatRowProps = {
  label: string;
  value: number;
  destructive?: boolean;
};

function QueueStatRow({ label, value, destructive }: QueueStatRowProps) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Badge
        variant={destructive && value > 0 ? "destructive" : "secondary"}
        className="text-xs tabular-nums"
      >
        {value.toLocaleString("es-MX")}
      </Badge>
    </div>
  );
}

function QueueCard({ queue }: { queue: JobCounts }) {
  const hasActive = queue.active > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold truncate">{queue.name}</CardTitle>
        {hasActive && (
          <Badge variant="default" className="text-[10px] px-1.5 py-0 shrink-0">
            activo
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-0.5">
        <QueueStatRow label="Pendientes" value={queue.waiting} />
        <QueueStatRow label="Activos" value={queue.active} />
        <QueueStatRow label="Completados" value={queue.completed} />
        <QueueStatRow label="Fallidos" value={queue.failed} destructive />
        <QueueStatRow label="Diferidos" value={queue.delayed} />
        {queue.paused !== undefined && (
          <QueueStatRow label="Pausados" value={queue.paused} />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Retry Button with AlertDialog ────────────────────────────────────────────

interface RetryButtonProps {
  job: FailedJob;
  isPendingRow: boolean;
  onConfirm: () => void;
}

function RetryActionButton({ job, isPendingRow, onConfirm }: RetryButtonProps) {
  const isDisabled = job.job_id === null || isPendingRow;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="xs"
          disabled={isDisabled}
          className="gap-1.5"
        >
          {isPendingRow ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <RotateCcw className="size-3" />
          )}
          {isPendingRow ? "Reintentando..." : "Retry"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Reintentar este job?</AlertDialogTitle>
          <AlertDialogDescription>
            Se volverá a encolar el job{" "}
            <span className="font-semibold text-foreground">{job.name}</span> de
            la cola{" "}
            <span className="font-mono text-foreground">{job.queue}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Reintentar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Failed Jobs Table ────────────────────────────────────────────────────────

function FailedJobsTable({ jobs }: { jobs: FailedJob[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingRowId, setPendingRowId] = useState<string | number | null>(null);

  function handleRetry(job: FailedJob) {
    if (job.job_id === null) return;
    setPendingRowId(job.job_id);
    startTransition(async () => {
      try {
        await retryJob(job.queue, job.job_id as string | number);
        toast.success("Job reintentado", {
          description: `El job "${job.name}" fue reencolado correctamente.`,
        });
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error desconocido al reintentar el job.";
        toast.error("Error al reintentar", { description: message });
      } finally {
        setPendingRowId(null);
      }
    });
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos fallos</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Sin fallos recientes</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Últimos fallos</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Cola</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Razón</TableHead>
                <TableHead className="text-center">Intentos</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="pr-6 text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job, index) => (
                <TableRow key={`${job.queue}-${job.job_id ?? index}`}>
                  <TableCell className="pl-6">
                    <Badge variant="outline" className="text-xs font-mono">
                      {job.queue}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{job.name}</TableCell>
                  <TableCell className="max-w-[280px]">
                    {job.failed_reason ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block truncate text-sm text-destructive cursor-default">
                            {job.failed_reason}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="max-w-sm break-words font-mono text-xs"
                        >
                          {job.failed_reason}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-sm">
                    {job.attempts}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(job.timestamp)}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <RetryActionButton
                      job={job}
                      isPendingRow={isPending && pendingRowId === job.job_id}
                      onConfirm={() => handleRetry(job)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

// ─── Refresh Button ───────────────────────────────────────────────────────────

function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isPending}
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Actualizando..." : "Actualizar"}
    </Button>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function JobsOverviewClient({ data }: JobsOverviewClientProps) {
  const { queues, recent_failed } = data;

  return (
    <div className="space-y-6">
      {/* Header row with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Colas</h2>
          <p className="text-xs text-muted-foreground">
            {queues.length} {queues.length === 1 ? "cola registrada" : "colas registradas"}
          </p>
        </div>
        <RefreshButton />
      </div>

      {/* Queue cards grid */}
      {queues.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No se encontraron colas activas.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {queues.map((queue) => (
            <QueueCard key={queue.name} queue={queue} />
          ))}
        </div>
      )}

      {/* Failed jobs */}
      <FailedJobsTable jobs={recent_failed} />
    </div>
  );
}
