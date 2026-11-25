"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import type { CronHistoryItem, CronHistoryPage } from "@/lib/api/analytics";
import { isManualCronRun } from "@/lib/api/analytics";
import { CRON_JOB_NAMES, getCronJobLabelKey } from "@/lib/system/cron-jobs";
import { formatCronDuration } from "@/lib/system/cron-format";
import {
  buildSystemHref,
  CRON_HISTORY_STATUSES,
  type CronHistoryFilters,
} from "@/lib/system/system-view";
import { useFormatDateTime, useFormatNumber } from "@/lib/format-locale";
import { CronRunStatus } from "./cron-run-status";

const ALL = "all";

function useJobName() {
  const tJobs = useTranslations("system_jobs.cronRuns");
  return (canonical: string): string => {
    const key = getCronJobLabelKey(canonical);
    return key ? tJobs(key) : canonical;
  };
}

function useFormatRunDate() {
  const formatDateTime = useFormatDateTime();
  return (iso: string | null): string => {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? "—"
      : formatDateTime(d, { dateStyle: "medium", timeStyle: "short" });
  };
}

function RunDetail({ item, onClose }: { item: CronHistoryItem | null; onClose: () => void }) {
  const t = useTranslations("system_jobs.history");
  const tSys = useTranslations("admin.system");
  const jobName = useJobName();
  const formatRunDate = useFormatRunDate();
  const formatNumber = useFormatNumber();
  const [showTechnical, setShowTechnical] = useState(false);

  return (
    <Dialog
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) {
          setShowTechnical(false);
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {item ? jobName(item.job_name) : ""}
          </DialogTitle>
          <DialogDescription>{item ? formatRunDate(item.started_at) : ""}</DialogDescription>
        </DialogHeader>
        {item ? (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2">
              <dt className="text-muted-foreground">{t("detailLabelStatus")}</dt>
              <dd>
                <CronRunStatus status={item.status} errorMessage={item.error_message} />
              </dd>
              <dt className="text-muted-foreground">{t("detailLabelEnd")}</dt>
              <dd>{formatRunDate(item.ended_at)}</dd>
              <dt className="text-muted-foreground">{t("detailLabelDuration")}</dt>
              <dd className="tabular-nums">{formatCronDuration(item.duration_ms, formatNumber)}</dd>
              <dt className="text-muted-foreground">{t("detailLabelItems")}</dt>
              <dd className="tabular-nums">
                {item.items_processed !== null ? formatNumber(item.items_processed) : "—"}
              </dd>
            </dl>
            {item.error_message ? (
              <div>
                <p className="mb-1 text-muted-foreground">{t("detailLabelError")}</p>
                <pre className="whitespace-pre-wrap break-all rounded-md border bg-muted p-3 font-mono text-xs">
                  {item.error_message}
                </pre>
              </div>
            ) : null}
            {item.metadata ? (
              <div>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={() => setShowTechnical((v) => !v)}
                >
                  {tSys("history.technicalData")}
                </Button>
                {showTechnical ? (
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-md border bg-muted p-3 font-mono text-xs">
                    {JSON.stringify(item.metadata, null, 2)}
                  </pre>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function CronHistoryTab({
  data,
  filters,
}: {
  data: CronHistoryPage;
  filters: CronHistoryFilters;
}) {
  const t = useTranslations("system_jobs.history");
  const tSys = useTranslations("admin.system");
  const router = useRouter();
  const jobName = useJobName();
  const formatRunDate = useFormatRunDate();
  const formatNumber = useFormatNumber();
  const [selected, setSelected] = useState<CronHistoryItem | null>(null);

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  function go(next: Partial<CronHistoryFilters>) {
    router.replace(buildSystemHref("history", { ...filters, ...next }), { scroll: false });
  }

  function setFilter(key: "job_name" | "status" | "since" | "until", value: string) {
    go({ [key]: value && value !== ALL ? value : undefined, page: 1 } as Partial<CronHistoryFilters>);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-[240px] space-y-1 max-sm:w-full">
          <Label>{t("filterLabelJob")}</Label>
          <Select value={filters.job_name ?? ALL} onValueChange={(v) => setFilter("job_name", v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("filterAllJobs")}</SelectItem>
              {CRON_JOB_NAMES.map((name) => (
                <SelectItem key={name} value={name}>
                  {jobName(name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[180px] space-y-1 max-sm:w-full">
          <Label>{t("filterLabelStatus")}</Label>
          <Select value={filters.status ?? ALL} onValueChange={(v) => setFilter("status", v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("filterAllStatuses")}</SelectItem>
              {CRON_HISTORY_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {tSys(`status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cron-since">{t("filterLabelSince")}</Label>
          <Input
            id="cron-since"
            type="date"
            className="w-[160px]"
            value={filters.since ?? ""}
            onChange={(e) => setFilter("since", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cron-until">{t("filterLabelUntil")}</Label>
          <Input
            id="cron-until"
            type="date"
            className="w-[160px]"
            value={filters.until ?? ""}
            onChange={(e) => setFilter("until", e.target.value)}
          />
        </div>
      </div>

      {data.items.length === 0 ? (
        <EmptyState icon={History} variant="no-results" title={t("noResults")} />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colJob")}</TableHead>
                <TableHead>{t("colStart")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead>{t("colDuration")}</TableHead>
                <TableHead className="text-right">{t("colItems")}</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.run_id}>
                  <TableCell className="text-sm font-medium">{jobName(item.job_name)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatRunDate(item.started_at)}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <CronRunStatus status={item.status} errorMessage={item.error_message} />
                      {isManualCronRun(item.metadata) ? (
                        <span className="text-xs text-muted-foreground">{t("manualBadge")}</span>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm tabular-nums">
                    {formatCronDuration(item.duration_ms, formatNumber)}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {item.items_processed !== null ? formatNumber(item.items_processed) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      aria-label={`${t("viewButton")}: ${jobName(item.job_name)} · ${formatRunDate(item.started_at)}`}
                      onClick={() => setSelected(item)}
                    >
                      {t("viewButton")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            {t("pagination", { page: data.page, totalPages })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.page <= 1}
              onClick={() => go({ page: data.page - 1 })}
            >
              {t("paginationPrev")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.page >= totalPages}
              onClick={() => go({ page: data.page + 1 })}
            >
              {t("paginationNext")}
            </Button>
          </div>
        </div>
      ) : null}

      <RunDetail item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
