"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { RefreshCw, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
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
import type { JobsOverview, JobCounts, FailedJob, KnownQueueName } from "@/lib/api/analytics";
import { retryJob } from "@/lib/api/analytics";
import { useFormatDateTime, useFormatNumber } from "@/lib/format-locale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobsOverviewClientProps {
  data: JobsOverview;
}

// ─── Queue Metadata ───────────────────────────────────────────────────────────

type OverviewT = ReturnType<typeof useTranslations<"system_jobs.overview">>;
const QUEUE_I18N_KEYS: Record<KnownQueueName, { labelKey: Parameters<OverviewT>[0]; descKey: Parameters<OverviewT>[0] }> = {
  'notifications':   { labelKey: 'queueNotifications',    descKey: 'queueNotificationsDesc' },
  'email':           { labelKey: 'queueEmail',            descKey: 'queueEmailDesc' },
  'achievements':    { labelKey: 'queueAchievements',     descKey: 'queueAchievementsDesc' },
  'background-jobs': { labelKey: 'queueBackgroundJobs',   descKey: 'queueBackgroundJobsDesc' },
};

// ─── Queue Card ───────────────────────────────────────────────────────────────

type QueueStatRowProps = {
  label: string;
  value: number;
  destructive?: boolean;
};

function QueueStatRow({ label, value, destructive }: QueueStatRowProps) {
  const formatNumber = useFormatNumber();
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Badge
        variant={destructive && value > 0 ? "destructive" : "secondary"}
        className="text-xs tabular-nums"
      >
        {formatNumber(value)}
      </Badge>
    </div>
  );
}

function QueueCard({ queue }: { queue: JobCounts }) {
  const t = useTranslations("system_jobs.overview");
  const hasActive = queue.active > 0;
  const queueKeys = QUEUE_I18N_KEYS[queue.name as KnownQueueName];
  const label = queueKeys ? t(queueKeys.labelKey) : queue.name;
  const description = queueKeys ? t(queueKeys.descKey) : "";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm font-semibold truncate">{label}</CardTitle>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {hasActive && (
          <Badge variant="default" className="text-[10px] px-1.5 py-0 shrink-0 ml-2">
            {t("activeLabel")}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-0.5">
        <QueueStatRow label={t("statWaiting")} value={queue.waiting} />
        <QueueStatRow label={t("statActive")} value={queue.active} />
        <QueueStatRow label={t("statCompleted")} value={queue.completed} />
        <QueueStatRow label={t("statFailed")} value={queue.failed} destructive />
        <QueueStatRow label={t("statDelayed")} value={queue.delayed} />
        {queue.paused !== undefined && (
          <QueueStatRow label={t("statPaused")} value={queue.paused} />
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
  const t = useTranslations("system_jobs.overview");
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
          {isPendingRow ? t("retryLoading") : t("retryButton")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("retryDialogTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("retryDialogDescription", { jobName: job.name, queue: job.queue })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("retryDialogCancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t("retryDialogConfirm")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Failed Jobs Table ────────────────────────────────────────────────────────

function FailedJobsTable({ jobs }: { jobs: FailedJob[] }) {
  const t = useTranslations("system_jobs.overview");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingRowId, setPendingRowId] = useState<string | number | null>(null);
  const formatDateTime = useFormatDateTime();

  function formatDate(timestamp: string | null): string {
    if (!timestamp) return "—";
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? "—" : formatDateTime(date);
  }

  function handleRetry(job: FailedJob) {
    if (job.job_id === null) return;
    setPendingRowId(job.job_id);
    startTransition(async () => {
      try {
        await retryJob(job.queue, job.job_id as string | number);
        toast.success(t("retrySuccess"), {
          description: t("retrySuccessDescription", { name: job.name }),
        });
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("retryErrorFallback");
        toast.error(t("retryErrorTitle"), { description: message });
      } finally {
        setPendingRowId(null);
      }
    });
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("failedJobsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">{t("failedJobsEmpty")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("failedJobsTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">{t("colQueue")}</TableHead>
                <TableHead>{t("colJob")}</TableHead>
                <TableHead>{t("colReason")}</TableHead>
                <TableHead className="text-center">{t("colAttempts")}</TableHead>
                <TableHead>{t("colDate")}</TableHead>
                <TableHead className="pr-6 text-right">{t("colAction")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job, index) => (
                <TableRow key={`${job.queue}-${job.job_id ?? index}`}>
                  <TableCell className="pl-6">
                    {job.queue === 'background-jobs' ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-xs font-mono cursor-default">
                            {job.queue}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="font-mono text-xs">
                          {job.name}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Badge variant="outline" className="text-xs font-mono">
                        {job.queue}
                      </Badge>
                    )}
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
  const t = useTranslations("system_jobs.overview");
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
      {isPending ? t("refreshLoading") : t("refreshButton")}
    </Button>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function JobsOverviewClient({ data }: JobsOverviewClientProps) {
  const t = useTranslations("system_jobs.overview");
  const { queues, recent_failed } = data;

  return (
    <div className="space-y-6">
      {/* Header row with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">{t("queuesTitle")}</h2>
          <p className="text-xs text-muted-foreground">
            {queues.length === 1
              ? t("queuesCountSingular", { count: queues.length })
              : t("queuesCountPlural", { count: queues.length })}
          </p>
        </div>
        <RefreshButton />
      </div>

      {/* Queue cards grid */}
      {queues.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">{t("noQueues")}</p>
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
