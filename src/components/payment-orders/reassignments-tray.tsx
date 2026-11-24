"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowRightLeft, Info } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type StatusIntent } from "@/components/ui/status-badge";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorStateTableRow } from "@/components/shared/error-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { StaleDataNotice } from "@/components/shared/stale-data-notice";
import { errorStateFromError } from "@/lib/api/error-state";
import {
  listReassignments,
  type ReassignmentRequest,
  type ReassignmentStatus,
} from "@/lib/api/field-payment-orders";
import { SACDIA_DISPLAY_TIMEZONE } from "@/lib/format-locale";
import { paginate } from "@/lib/payment-orders/queue";

const REASSIGNMENT_INTENT: Partial<Record<ReassignmentStatus, StatusIntent>> = {
  PENDING: "warning",
  REJECTED: "destructive",
};

const PAGE_SIZE_OPTIONS = [20, 50, 100];

/**
 * History only: clubs reassign coverage from the app without the Campo's
 * approval, so there is nothing to approve or reject here.
 */
export function ReassignmentsTray() {
  const t = useTranslations("payment_orders");
  const format = useFormatter();
  const [items, setItems] = useState<ReassignmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [stale, setStale] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE_OPTIONS[0] ?? 20);

  const load = useCallback(async () => {
    try {
      setItems(await listReassignments());
      setError(null);
      setStale(false);
      setUpdatedAt(new Date());
    } catch (err) {
      // Keep older rows on screen when a reload fails; otherwise show the error.
      setItems((current) => {
        if (current.length > 0) setStale(true);
        else setError(err);
        return current;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const view = paginate(items, page, limit);
  const labels = {
    PENDING: t("reassignments.PENDING"),
    APPROVED: t("reassignments.APPROVED"),
    REJECTED: t("reassignments.REJECTED"),
  } satisfies Record<ReassignmentStatus, string>;
  const date = (value: string) =>
    format.dateTime(new Date(value), {
      dateStyle: "medium",
      timeZone: SACDIA_DISPLAY_TIMEZONE,
    });

  const note = (
    <p className="flex items-start gap-2 text-muted-foreground text-sm">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      {t("reassignments.historyNote")}
    </p>
  );

  if (loading) {
    return (
      <p className="text-muted-foreground text-sm" role="status">
        {t("tray.loading")}
      </p>
    );
  }

  if (error) {
    const state = errorStateFromError(error);
    return (
      <div className="space-y-4">
        {note}
        <DataTableShell>
          <Table>
            <TableBody>
              <ErrorStateTableRow
                colSpan={6}
                kind={state.kind}
                {...(state.detail ? { detail: state.detail } : {})}
                onRetry={() => {
                  setError(null);
                  setLoading(true);
                  void load();
                }}
              />
            </TableBody>
          </Table>
        </DataTableShell>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {note}
      {stale && updatedAt ? (
        <StaleDataNotice at={updatedAt} onRetry={() => void load()} />
      ) : null}
      {items.length === 0 ? (
        <EmptyState icon={ArrowRightLeft} title={t("reassignments.empty")} />
      ) : (
        <>
          <DataTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("reassignments.colFrom")}</TableHead>
                  <TableHead>{t("reassignments.colTo")}</TableHead>
                  <TableHead>{t("reassignments.colReason")}</TableHead>
                  <TableHead>{t("reassignments.colDoneBy")}</TableHead>
                  <TableHead>{t("reassignments.colDate")}</TableHead>
                  <TableHead>{t("tray.colStatus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {view.items.map((item) => (
                  <TableRow key={item.insurance_reassignment_request_id}>
                    <TableCell>{item.from_user_name ?? "—"}</TableCell>
                    <TableCell className="font-medium">
                      {item.to_user_name ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-normal text-muted-foreground">
                      {item.reason ?? "—"}
                    </TableCell>
                    <TableCell>
                      {item.reviewed_by_name ?? item.requested_by_name ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {date(item.created_at)}
                    </TableCell>
                    <TableCell>
                      <ExceptionStatus
                        value={item.status}
                        normal={["APPROVED"]}
                        labels={labels}
                        intents={REASSIGNMENT_INTENT}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>
          <DataTablePagination
            page={view.page}
            totalPages={view.totalPages}
            total={view.total}
            limit={limit}
            limitOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setLimit(next);
              setPage(1);
            }}
          />
        </>
      )}
    </div>
  );
}
