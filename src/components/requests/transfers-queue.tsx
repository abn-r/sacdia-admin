"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { ErrorStateTableRow } from "@/components/shared/error-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { StaleDataNotice } from "@/components/shared/stale-data-notice";
import { UrlTabs } from "@/components/shared/url-tabs";
import { useToastError } from "@/lib/feedback/toast-retry";
import { ReviewSheet } from "@/components/requests/review-sheet";
import {
  ALL_FILTER,
  QUEUE_PAGE_SIZE,
  WaitingTime,
  personName,
  useQueueTabs,
  waitingDays,
  type QueueTab,
} from "@/components/requests/queue-kit";
import {
  QueueEmpty,
  QueueFilterRow,
  QueueSearch,
  QueueSelect,
  usePagedSlice,
  useQueueData,
  type QueueLoadFailure,
} from "@/components/requests/queue-parts";
import {
  getTransferRequests,
  reviewTransferRequest,
  type RequestStatus,
  type TransferRequest,
  type TransferRequestDetail,
} from "@/lib/api/requests";
import { ApiError } from "@/lib/api/client";
import { useFormatDate } from "@/lib/format-locale";

const HEAD = "h-9 px-3 text-xs font-medium text-muted-foreground";
const STATUS_INTENTS = { PENDING: "warning", REJECTED: "destructive", APPROVED: "success" } as const;

interface TransfersQueueProps {
  /** `null` when the server fetch failed. */
  initialRequests: TransferRequest[] | null;
  initialFailure?: QueueLoadFailure | null;
  /** requests:review — without it the sheet is read-only. */
  canReview: boolean;
}

type BulkFailure = { id: string; name: string; message: string };

export function TransfersQueue({ initialRequests, initialFailure, canReview }: TransfersQueueProps) {
  const t = useTranslations("queues.requests.transfers");
  const tc = useTranslations("queues.requests.common");
  const tStatus = useTranslations("requests.status");
  const formatDate = useFormatDate();
  const toastError = useToastError();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const data = useQueueData<TransferRequest>(
    ["requests", "transfers"],
    () => getTransferRequests(),
    initialRequests,
    initialFailure,
  );
  const { active, items, inTab } = useQueueTabs(data.rows);

  const [search, setSearch] = useState("");
  const [destination, setDestination] = useState(ALL_FILTER);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [sheet, setSheet] = useState<{ request: TransferRequest; rejecting: boolean } | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkFailures, setBulkFailures] = useState<BulkFailure[]>([]);

  const destinations = useMemo(() => {
    const names = new Set<string>();
    for (const row of data.rows ?? []) if (row.to_section?.name) names.add(row.to_section.name);
    return [...names].sort((a, b) => a.localeCompare(b)).map((name) => ({ value: name, label: name }));
  }, [data.rows]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return inTab
      .filter((row) => destination === ALL_FILTER || row.to_section?.name === destination)
      .filter((row) => {
        if (!needle) return true;
        return [personName(row.requester), row.from_section?.name, row.to_section?.name, row.reason]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      })
      .sort((a, b) =>
        active === "pending"
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.reviewed_at ?? b.created_at).getTime() -
            new Date(a.reviewed_at ?? a.created_at).getTime(),
      );
  }, [inTab, destination, search, active]);

  const paged = usePagedSlice(filtered, QUEUE_PAGE_SIZE, `${active}|${search}|${destination}`);
  const isFiltered = search.trim().length > 0 || destination !== ALL_FILTER;
  const pendingTab = active === "pending";
  const selectable = pendingTab && canReview;
  const showStatus = active === "all";
  const showReviewed = active === "approved" || active === "rejected" || active === "all";

  const selectedRows = (data.rows ?? []).filter(
    (row) => row.status === "PENDING" && selected.has(String(row.request_id)),
  );
  const pageIds = paged.slice.map((row) => String(row.request_id));
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  function toggle(id: string, on: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function togglePage(on: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of pageIds) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function goTo(tab: QueueTab) {
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    if (tab === "pending") next.delete("tab");
    else next.set("tab", tab);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function clearFilters() {
    setSearch("");
    setDestination(ALL_FILTER);
  }

  async function approveSelected() {
    const targets = selectedRows;
    const failures: BulkFailure[] = [];
    const done = new Set<string>();
    setBulkFailures([]);
    setBulkProgress(0);
    // The API has no batch endpoint: one review per request, in order, each isolated.
    for (const [index, row] of targets.entries()) {
      const id = String(row.request_id);
      try {
        await reviewTransferRequest(row.request_id, { action: "approved" });
        done.add(id);
      } catch (error) {
        failures.push({
          id,
          name: personName(row.requester),
          message: error instanceof ApiError ? error.message : tc("unexpected"),
        });
      }
      setBulkProgress(index + 1);
    }
    setSelected((current) => new Set([...current].filter((id) => !done.has(id))));
    setBulkFailures(failures);
    if (done.size > 0) toast.success(t("bulk.done", { count: done.size }));
    if (failures.length > 0) toastError({ title: t("bulk.failed", { count: failures.length }) });
    data.refetch();
  }

  async function review(request: TransferRequest, payload: { action: "approved" | "rejected"; comment?: string }) {
    await reviewTransferRequest(request.request_id, payload);
    toast.success(payload.action === "approved" ? t("toasts.approved") : t("toasts.rejected"));
    setSelected((current) => {
      const next = new Set(current);
      next.delete(String(request.request_id));
      return next;
    });
    data.refetch();
  }

  function statusOf(status: RequestStatus) {
    return (
      <ExceptionStatus
        value={status}
        normal={["APPROVED"]}
        labels={{ PENDING: tStatus("PENDING"), APPROVED: tStatus("APPROVED"), REJECTED: tStatus("REJECTED") }}
        intents={STATUS_INTENTS}
      />
    );
  }

  const reviewedAt = (row: TransferRequest) => (row.reviewed_at ? formatDate(row.reviewed_at) : "—");

  return (
    <div className="space-y-4">
      {data.stale && data.updatedAt ? <StaleDataNotice at={data.updatedAt} onRetry={data.refetch} /> : null}

      <UrlTabs tabs={items} defaultValue="pending" ariaLabel={tc("tabsLabel")} />

      <QueueFilterRow>
        <QueueSearch
          id="transfers-search"
          label={tc("search.label")}
          placeholder={t("search.placeholder")}
          value={search}
          onChange={setSearch}
        />
        <QueueSelect
          id="transfers-destination"
          label={t("filters.destination")}
          value={destination}
          onChange={setDestination}
          allLabel={t("filters.allDestinations")}
          options={destinations}
        />
      </QueueFilterRow>

      {selectable && selectedRows.length > 0 ? (
        <div
          role="region"
          aria-label={t("bulk.label")}
          className="flex flex-wrap items-center gap-3 rounded-lg bg-primary-soft px-3 py-2 text-sm"
        >
          <span className="font-medium">{t("bulk.selected", { count: selectedRows.length })}</span>
          <Button
            size="sm"
            onClick={() => {
              setBulkProgress(0);
              setConfirmBulk(true);
            }}
          >
            {t("bulk.approve", { count: selectedRows.length })}
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>
            {t("bulk.clear")}
          </Button>
        </div>
      ) : null}

      {bulkFailures.length > 0 ? (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p className="font-medium">{t("bulk.failed", { count: bulkFailures.length })}</p>
          <ul className="mt-1 list-disc pl-5">
            {bulkFailures.map((failure) => (
              <li key={failure.id}>
                {failure.name}: {failure.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.failure ? (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={HEAD}>{t("columns.person")}</TableHead>
                <TableHead className={HEAD}>{t("columns.move")}</TableHead>
                <TableHead className={`${HEAD} text-right`}>{tc("columns.wait")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <ErrorStateTableRow
                colSpan={3}
                kind={data.failure.kind}
                icon={ArrowRightLeft}
                title={t("error.title")}
                description={t("error.description")}
                {...(data.failure.detail ? { detail: data.failure.detail } : {})}
                onRetry={data.refetch}
              />
            </TableBody>
          </Table>
        </DataTableShell>
      ) : paged.total === 0 ? (
        <QueueEmpty
          icon={ArrowRightLeft}
          tab={active}
          filtered={isFiltered}
          onClear={clearFilters}
          onGoTo={goTo}
          copy={{
            title: t(`empty.${active}.title`),
            description: t(`empty.${active}.description`),
            viewApproved: tc("empty.viewApproved"),
          }}
        />
      ) : (
        <>
          <DataTableShell aria-busy={data.refreshing} className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {selectable ? (
                    <TableHead className={`${HEAD} w-8`}>
                      <Checkbox
                        checked={allPageSelected}
                        aria-label={t("selectPage")}
                        onCheckedChange={(checked) => togglePage(checked === true)}
                      />
                    </TableHead>
                  ) : null}
                  <TableHead className={HEAD}>{t("columns.person")}</TableHead>
                  <TableHead className={HEAD}>{t("columns.move")}</TableHead>
                  <TableHead className={HEAD}>{t("columns.reason")}</TableHead>
                  {pendingTab ? <TableHead className={`${HEAD} text-right`}>{tc("columns.wait")}</TableHead> : null}
                  {showReviewed ? <TableHead className={HEAD}>{tc("columns.reviewed")}</TableHead> : null}
                  {showStatus ? <TableHead className={HEAD}>{tc("columns.status")}</TableHead> : null}
                  <TableHead className={`${HEAD} text-right`}>
                    <span className="sr-only">{tc("columns.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.slice.map((row) => {
                  const id = String(row.request_id);
                  const name = personName(row.requester);
                  return (
                    <TableRow key={id} className="hover:bg-muted/30" data-state={selected.has(id) ? "selected" : undefined}>
                      {selectable ? (
                        <TableCell className="px-3 py-2.5 align-middle">
                          <Checkbox
                            checked={selected.has(id)}
                            aria-label={t("selectRow", { name })}
                            onCheckedChange={(checked) => toggle(id, checked === true)}
                          />
                        </TableCell>
                      ) : null}
                      <TableCell className="px-3 py-2.5 align-middle">
                        <button
                          type="button"
                          onClick={() => setSheet({ request: row, rejecting: false })}
                          className="rounded-sm text-left text-sm font-medium hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          {name}
                        </button>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 align-middle text-sm">
                        <span className="block">{row.from_section?.name ?? "—"}</span>
                        <span className="block text-muted-foreground">→ {row.to_section?.name ?? "—"}</span>
                      </TableCell>
                      <TableCell className="max-w-56 px-3 py-2.5 align-middle">
                        <span className="line-clamp-2 text-sm text-muted-foreground">{row.reason ?? "—"}</span>
                      </TableCell>
                      {pendingTab ? (
                        <TableCell className="px-3 py-2.5 text-right align-middle text-sm">
                          <WaitingTime createdAt={row.created_at} />
                        </TableCell>
                      ) : null}
                      {showReviewed ? (
                        <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                          {reviewedAt(row)}
                        </TableCell>
                      ) : null}
                      {showStatus ? <TableCell className="px-3 py-2.5 align-middle">{statusOf(row.status)}</TableCell> : null}
                      <TableCell className="px-3 py-2.5 text-right align-middle">
                        <Button
                          size="sm"
                          variant={row.status === "PENDING" && canReview ? "soft" : "outline"}
                          aria-label={`${row.status === "PENDING" && canReview ? tc("review") : tc("view")}: ${name}`}
                          onClick={() => setSheet({ request: row, rejecting: false })}
                        >
                          {row.status === "PENDING" && canReview ? tc("review") : tc("view")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </DataTableShell>

          <ul className="divide-y md:hidden" aria-label={t("listLabel")}>
            {paged.slice.map((row) => {
              const id = String(row.request_id);
              const name = personName(row.requester);
              return (
                <li key={id} className="flex items-start gap-3 py-3">
                  {selectable ? (
                    <Checkbox
                      className="mt-0.5"
                      checked={selected.has(id)}
                      aria-label={t("selectRow", { name })}
                      onCheckedChange={(checked) => toggle(id, checked === true)}
                    />
                  ) : null}
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setSheet({ request: row, rejecting: false })}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium">{name}</span>
                      {pendingTab ? (
                        <span className="shrink-0 text-[13px]">
                          <WaitingTime createdAt={row.created_at} />
                        </span>
                      ) : (
                        statusOf(row.status)
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                      {row.from_section?.name ?? "—"} → {row.to_section?.name ?? "—"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <DataTablePagination
            page={paged.page}
            totalPages={paged.totalPages}
            total={paged.total}
            limit={paged.limit}
            onPageChange={paged.setPage}
            onPageSizeChange={paged.setLimit}
          />
        </>
      )}

      {sheet ? (
        <TransferSheet
          key={String(sheet.request.request_id)}
          request={sheet.request}
          canReview={canReview}
          onOpenChange={(open) => {
            if (!open) setSheet(null);
          }}
          onReview={(payload) => review(sheet.request, payload)}
        />
      ) : null}

      <ConfirmDialog
        open={confirmBulk}
        onOpenChange={setConfirmBulk}
        title={t("bulk.confirmTitle", { count: selectedRows.length })}
        description={
          bulkProgress > 0 && bulkProgress < selectedRows.length
            ? t("bulk.progress", { done: bulkProgress, total: selectedRows.length })
            : t("bulk.confirmDescription", { count: selectedRows.length })
        }
        confirmLabel={t("bulk.approve", { count: selectedRows.length })}
        onConfirm={approveSelected}
      />
    </div>
  );
}

function TransferSheet({
  request,
  canReview,
  onOpenChange,
  onReview,
}: {
  request: TransferRequest;
  canReview: boolean;
  onOpenChange: (open: boolean) => void;
  onReview: (payload: { action: "approved" | "rejected"; comment?: string }) => Promise<void>;
}) {
  const t = useTranslations("queues.requests.transfers.sheet");
  const tc = useTranslations("queues.requests.common");
  const tStatus = useTranslations("requests.status");
  const formatDate = useFormatDate();
  const name = personName(request.requester);
  const pending = request.status === "PENDING";
  const days = waitingDays(request.created_at);
  const reviewable = pending && canReview;
  const reviewer = (request as TransferRequestDetail).reviewed_by ?? null;

  return (
    <ReviewSheet
      open
      onOpenChange={onOpenChange}
      title={t("title", { name })}
      description={
        pending
          ? t("sent", { date: formatDate(request.created_at), wait: tc("waiting", { count: days }) })
          : t("sentOnly", { date: formatDate(request.created_at) })
      }
      {...(reviewable
        ? {
            approve: {
              label: t("approve"),
              comment: { label: t("commentLabel"), hint: t("commentHint") },
              onConfirm: (comment: string | undefined) =>
                onReview({ action: "approved", ...(comment ? { comment } : {}) }),
            },
            reject: {
              label: tc("rejectAction"),
              confirmLabel: t("rejectConfirm"),
              audience: t("rejectAudience"),
              onConfirm: (reason: string) => onReview({ action: "rejected", comment: reason }),
            },
          }
        : {})}
    >
      <div className="space-y-2">
        <div>
          <p className="text-xs text-muted-foreground">{t("from")}</p>
          <p className="text-sm font-medium">{request.from_section?.name ?? "—"}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowDown className="size-3.5" aria-hidden="true" />
          {t("changesTo")}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("to")}</p>
          <p className="text-sm font-medium">{request.to_section?.name ?? "—"}</p>
        </div>
      </div>

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">{t("reason")}</dt>
          <dd className="mt-0.5 whitespace-pre-wrap">{request.reason ?? "—"}</dd>
        </div>
        {!pending ? (
          <>
            <div>
              <dt className="text-xs text-muted-foreground">{t("outcome")}</dt>
              <dd className="mt-0.5">
                {tStatus(request.status)}
                {request.reviewed_at ? ` · ${formatDate(request.reviewed_at)}` : ""}
              </dd>
            </div>
            {reviewer ? (
              <div>
                <dt className="text-xs text-muted-foreground">{t("reviewedBy")}</dt>
                <dd className="mt-0.5">{personName(reviewer)}</dd>
              </div>
            ) : null}
            {request.comment ? (
              <div>
                <dt className="text-xs text-muted-foreground">{t("comment")}</dt>
                <dd className="mt-0.5 whitespace-pre-wrap">{request.comment}</dd>
              </div>
            ) : null}
          </>
        ) : null}
      </dl>
    </ReviewSheet>
  );
}
