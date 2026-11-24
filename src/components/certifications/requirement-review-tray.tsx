"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorStateTableRow } from "@/components/shared/error-state";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { StaleDataNotice } from "@/components/shared/stale-data-notice";
import { RequirementReviewDetail } from "@/components/certifications/requirement-review-detail";
import { errorStateFromError, type ErrorStateFromError } from "@/lib/api/error-state";
import { useFormatDateTime } from "@/lib/format-locale";
import {
  getRequirementTray,
  type CertificationRequirementStatus,
  type TrayItem,
} from "@/lib/api/certification-reviews";

const STATUS_INTENT: Record<CertificationRequirementStatus, StatusIntent> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  CHANGES_REQUESTED: "warning",
  APPROVED: "success",
};

const STATUSES: CertificationRequirementStatus[] = ["SUBMITTED", "CHANGES_REQUESTED", "APPROVED", "DRAFT"];

function participantName(item: TrayItem) {
  return (
    [item.participant.name, item.participant.paternal_last_name].filter(Boolean).join(" ").trim() ||
    item.participant.user_id
  );
}

/**
 * Requirements tray (queue A): table + review sheet. A failed load shows the
 * error inside the table frame; a failed refresh keeps the rows and says so.
 */
export function RequirementReviewTray({
  onCount,
}: {
  /** Reports the number of submitted requirements (only for the default filter). */
  onCount?: (count: number) => void;
}) {
  const t = useTranslations("certification_reviews");
  const formatDateTime = useFormatDateTime();
  const [status, setStatus] = useState<CertificationRequirementStatus>("SUBMITTED");
  const [items, setItems] = useState<TrayItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<ErrorStateFromError | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [selectedProgressId, setSelectedProgressId] = useState<number | null>(null);
  const onCountRef = useRef(onCount);
  onCountRef.current = onCount;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRequirementTray(status);
      setItems(data);
      setFailure(null);
      setLoadedAt(new Date());
      if (status === "SUBMITTED") onCountRef.current?.(data.length);
    } catch (error) {
      setFailure(errorStateFromError(error));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    setItems(null);
    void load();
  }, [load]);

  const colSpan = 6;
  const hasRows = items !== null && items.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="requirement-status-filter" className="text-muted-foreground text-xs">
            {t("tray.filterStatus")}
          </Label>
          <Select value={status} onValueChange={(value) => setStatus(value as CertificationRequirementStatus)}>
            <SelectTrigger id="requirement-status-filter" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`status.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="outline" size="sm" loading={loading && items !== null} onClick={() => void load()}>
          {t("tray.refresh")}
        </Button>
      </div>

      {failure && hasRows && loadedAt && <StaleDataNotice at={loadedAt} onRetry={() => void load()} />}

      {items !== null && items.length === 0 && !failure ? (
        <EmptyState icon={ClipboardList} title={t("tray.empty")} />
      ) : (
        <DataTableShell aria-busy={loading}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("tray.colParticipant")}</TableHead>
                <TableHead>{t("tray.colCertification")}</TableHead>
                <TableHead>{t("tray.colRequirement")}</TableHead>
                <TableHead>{t("tray.colStatus")}</TableHead>
                <TableHead>{t("tray.colSubmitted")}</TableHead>
                <RowActionsHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items === null && !failure
                ? Array.from({ length: 4 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={colSpan}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : null}
              {failure && !hasRows ? (
                <ErrorStateTableRow colSpan={colSpan} {...failure} onRetry={() => void load()} />
              ) : null}
              {hasRows
                ? items.map((item) => (
                    <TableRow key={item.progress_id}>
                      <TableCell className="font-medium">{participantName(item)}</TableCell>
                      <TableCell>
                        <div>{item.certification_name}</div>
                        <div className="text-muted-foreground text-xs">{item.module_name}</div>
                      </TableCell>
                      <TableCell>{item.section_name}</TableCell>
                      <TableCell>
                        <StatusBadge
                          intent={STATUS_INTENT[item.status] ?? "neutral"}
                          label={t(`status.${item.status}`)}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-sm tabular-nums">
                        {item.submitted_at ? formatDateTime(item.submitted_at) : "—"}
                      </TableCell>
                      <TableCell>
                        <RowActions
                          label={`${participantName(item)} · ${item.section_name}`}
                          actions={[]}
                          primary={
                            <Button type="button" size="sm" onClick={() => setSelectedProgressId(item.progress_id)}>
                              {t("tray.openDetail")}
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                : null}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      <RequirementReviewDetail
        progressId={selectedProgressId}
        open={selectedProgressId != null}
        onOpenChange={(open) => {
          if (!open) setSelectedProgressId(null);
        }}
        onChanged={() => void load()}
      />
    </div>
  );
}
