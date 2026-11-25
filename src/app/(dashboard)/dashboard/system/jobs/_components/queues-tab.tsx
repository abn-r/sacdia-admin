"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListChecks } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { EmptyState } from "@/components/shared/empty-state";
import type { FailedJob, JobCounts, JobsOverview, KnownQueueName } from "@/lib/api/analytics";
import { retryJob } from "@/lib/api/analytics";
import { useFormatDateTime, useFormatNumber } from "@/lib/format-locale";

type OverviewT = ReturnType<typeof useTranslations<"system_jobs.overview">>;
const QUEUE_I18N_KEYS: Record<
  KnownQueueName,
  { labelKey: Parameters<OverviewT>[0]; descKey: Parameters<OverviewT>[0] }
> = {
  notifications: { labelKey: "queueNotifications", descKey: "queueNotificationsDesc" },
  email: { labelKey: "queueEmail", descKey: "queueEmailDesc" },
  // The backend registers the mail queue as "emails" (EMAIL_QUEUE).
  emails: { labelKey: "queueEmail", descKey: "queueEmailDesc" },
  achievements: { labelKey: "queueAchievements", descKey: "queueAchievementsDesc" },
  "background-jobs": { labelKey: "queueBackgroundJobs", descKey: "queueBackgroundJobsDesc" },
};

function isKnownQueue(name: string): name is KnownQueueName {
  return Object.hasOwn(QUEUE_I18N_KEYS, name);
}

function QueueRow({ queue }: { queue: JobCounts }) {
  const t = useTranslations("system_jobs.overview");
  const formatNumber = useFormatNumber();
  const keys = isKnownQueue(queue.name) ? QUEUE_I18N_KEYS[queue.name] : undefined;
  const label = keys ? t(keys.labelKey) : queue.name;
  const description = keys ? t(keys.descKey) : null;

  return (
    <TableRow>
      <TableCell className="whitespace-normal">
        <span className="block text-sm font-medium">{label}</span>
        {description ? (
          <span className="block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatNumber(queue.waiting)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatNumber(queue.active)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatNumber(queue.completed)}</TableCell>
      <TableCell className="text-right tabular-nums">
        {queue.failed > 0 ? (
          <span data-testid="queue-failed" className="font-medium text-destructive">
            {formatNumber(queue.failed)}
          </span>
        ) : (
          <span className="text-muted-foreground">{formatNumber(0)}</span>
        )}
      </TableCell>
    </TableRow>
  );
}

function FailedJobsSection({ jobs }: { jobs: FailedJob[] }) {
  const t = useTranslations("system_jobs.overview");
  const tSys = useTranslations("admin.system");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | number | null>(null);
  const [target, setTarget] = useState<FailedJob | null>(null);
  const formatDateTime = useFormatDateTime();

  function formatDate(timestamp: string | null): string {
    if (!timestamp) return "—";
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime())
      ? "—"
      : formatDateTime(date, { dateStyle: "medium", timeStyle: "short" });
  }

  function handleRetry(job: FailedJob) {
    if (job.job_id === null) return;
    setPendingId(job.job_id);
    startTransition(async () => {
      try {
        await retryJob(job.queue, job.job_id as string | number);
        toast.success(t("retrySuccess"), {
          description: t("retrySuccessDescription", { name: job.name }),
        });
        router.refresh();
      } catch (err) {
        toast.error(t("retryErrorTitle"), {
          description: err instanceof Error ? err.message : t("retryErrorFallback"),
        });
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold tracking-tight">{t("failedJobsTitle")}</h2>
      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tSys("queues.noFailures")}</p>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colJob")}</TableHead>
                  <TableHead>{t("colQueue")}</TableHead>
                  <TableHead>{t("colReason")}</TableHead>
                  <TableHead className="text-right">{t("colAttempts")}</TableHead>
                  <TableHead>{tSys("queues.colWhen")}</TableHead>
                  <TableHead className="w-px" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job, index) => {
                  const busy = isPending && pendingId === job.job_id;
                  return (
                    <TableRow key={`${job.queue}-${job.job_id ?? index}`}>
                      <TableCell className="font-mono text-sm">{job.name}</TableCell>
                      <TableCell className="text-sm">{job.queue}</TableCell>
                      <TableCell className="max-w-[280px]">
                        {job.failed_reason ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="block cursor-default truncate text-sm">
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
                      <TableCell className="text-right tabular-nums">{job.attempts}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(job.timestamp)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          disabled={job.job_id === null || busy}
                          aria-label={`${t("retryButton")}: ${job.name}`}
                          onClick={() => setTarget(job)}
                        >
                          {busy ? t("retryLoading") : t("retryButton")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TooltipProvider>
        </div>
      )}

      <AlertDialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("retryDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {target
                ? t("retryDialogDescription", { jobName: target.name, queue: target.queue })
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("retryDialogCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const job = target;
                setTarget(null);
                if (job) handleRetry(job);
              }}
            >
              {t("retryDialogConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

export function QueuesTab({ data }: { data: JobsOverview }) {
  const t = useTranslations("system_jobs.overview");
  const tSys = useTranslations("admin.system");

  return (
    <div className="space-y-8">
      {data.queues.length === 0 ? (
        <EmptyState icon={ListChecks} title={t("noQueues")} />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tSys("queues.colQueue")}</TableHead>
                <TableHead className="text-right">{tSys("queues.colWaiting")}</TableHead>
                <TableHead className="text-right">{tSys("queues.colActive")}</TableHead>
                <TableHead className="text-right">{tSys("queues.colCompleted")}</TableHead>
                <TableHead className="text-right">{tSys("queues.colFailed")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.queues.map((queue) => (
                <QueueRow key={queue.name} queue={queue} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <FailedJobsSection jobs={data.recent_failed} />
    </div>
  );
}
