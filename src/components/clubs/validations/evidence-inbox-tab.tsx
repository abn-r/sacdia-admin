"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ClipboardCheck } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { SplitInbox, SplitInboxItemContent } from "@/components/shared/split-inbox";
import { StaleDataNotice } from "@/components/shared/stale-data-notice";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import {
  approveEvidence,
  bulkApproveEvidence,
  bulkRejectEvidence,
  getEvidencePending,
  rejectEvidence,
  type EvidenceItem,
  type EvidenceType,
  type PaginatedEvidenceItems,
} from "@/lib/api/evidence-review";
import { getEvidenceContextLabel } from "@/lib/evidence-review/display";
import { toast } from "sonner";
import { useToastError } from "@/lib/feedback/toast-retry";
import { EvidencePreview } from "./evidence-preview";
import type { Loaded } from "./loaded";
import { daysWaiting, isOverdue } from "./queue-age";
import {
  EVIDENCE_TYPE_FILTERS,
  resolveEvidenceTypeFilter,
  type EvidenceTypeFilter,
} from "./validation-tabs";

const PAGE_LIMIT = 50;

type WaitState = "ok" | "overdue";

export const evidenceKey = (item: Pick<EvidenceItem, "type" | "id">) => `${item.type}:${item.id}`;

interface EvidenceInboxTabProps {
  result: Loaded<PaginatedEvidenceItems>;
  typeFilter: EvidenceTypeFilter;
}

/**
 * Queue B: evidence of honors and class sections in one split inbox.
 * Mount with `key={typeFilter}` so a filter change starts from the new server list.
 */
export function EvidenceInboxTab({ result, typeFilter }: EvidenceInboxTabProps) {
  const t = useTranslations("queues.classes.evidence");
  const tType = useTranslations("evidence_review.typeBadge");
  const tAge = useTranslations("queues.classes");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toastError = useToastError();

  const [items, setItems] = useState<EvidenceItem[]>(result.ok ? result.data.data : []);
  const [total, setTotal] = useState(result.ok ? result.data.total : 0);
  const [page, setPage] = useState(result.ok ? result.data.page : 1);
  const [selectedKey, setSelectedKey] = useState<string | null>(
    result.ok && result.data.data[0] ? evidenceKey(result.data.data[0]) : null,
  );
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState<EvidenceItem | null>(null);
  const [bulkDialog, setBulkDialog] = useState<"approve" | "reject" | null>(null);
  const [staleAt, setStaleAt] = useState<Date | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState(() => new Date());
  const [loadingMore, setLoadingMore] = useState(false);

  const selected = items.find((item) => evidenceKey(item) === selectedKey) ?? null;
  const selectedIndex = selected ? items.indexOf(selected) : -1;
  const checkedItems = useMemo(() => items.filter((item) => checked.has(evidenceKey(item))), [items, checked]);
  const checkedTypes = new Set(checkedItems.map((item) => item.type));
  const sameType = checkedTypes.size === 1;
  const batchType: EvidenceType | null = sameType ? (checkedItems[0]?.type ?? null) : null;

  function setFilter(next: EvidenceTypeFilter) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next === "all") params.delete("type");
    else params.set("type", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  /** Drops resolved items, moves the selection to the next one and refreshes the counters. */
  function removeItems(resolved: EvidenceItem[]) {
    const keys = new Set(resolved.map(evidenceKey));
    const next = items.filter((item) => !keys.has(evidenceKey(item)));
    if (selectedKey === null || keys.has(selectedKey)) {
      const anchor = Math.max(0, items.findIndex((item) => keys.has(evidenceKey(item))));
      const fallback = next[Math.min(anchor, next.length - 1)];
      setSelectedKey(fallback ? evidenceKey(fallback) : null);
    }
    setItems(next);
    setTotal((current) => Math.max(0, current - resolved.length));
    setChecked((current) => {
      const rest = new Set(current);
      for (const key of keys) rest.delete(key);
      return rest;
    });
    router.refresh();
  }

  function failure(error: unknown, retry: () => void) {
    toastError({
      title: error instanceof ApiError && error.message ? error.message : t("actionError"),
      onRetry: retry,
    });
  }

  async function approveSelected() {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await approveEvidence(selected.type, selected.id);
      toast.success(t("approvedToast", { name: selected.member_name }));
      removeItems([selected]);
    } catch (error) {
      failure(error, () => void approveSelected());
    } finally {
      setBusy(false);
    }
  }

  async function rejectOne(item: EvidenceItem, reason: string) {
    setBusy(true);
    try {
      await rejectEvidence(item.type, item.id, reason);
      toast.success(t("rejectedToast", { name: item.member_name }));
      setRejecting(null);
      removeItems([item]);
    } catch (error) {
      failure(error, () => void rejectOne(item, reason));
    } finally {
      setBusy(false);
    }
  }

  function reportBulk(done: number[], failed: { id: number; reason: string }[], type: EvidenceType, kind: "approved" | "rejected") {
    const resolved = items.filter((item) => item.type === type && done.includes(item.id));
    if (resolved.length > 0) removeItems(resolved);
    if (failed.length === 0) {
      toast.success(t(kind === "approved" ? "bulkApprovedToast" : "bulkRejectedToast", { count: done.length }));
    } else {
      toastError({
        title: t("bulkPartial", { done: done.length, failed: failed.length }),
        description: failed[0]?.reason,
      });
    }
  }

  async function bulkApprove() {
    if (!batchType) return;
    const ids = checkedItems.map((item) => item.id);
    setBusy(true);
    try {
      const outcome = await bulkApproveEvidence({ ids, type: batchType });
      reportBulk(outcome.succeeded, outcome.failed, batchType, "approved");
    } finally {
      setBusy(false);
    }
  }

  async function bulkReject(reason: string) {
    if (!batchType) return;
    const ids = checkedItems.map((item) => item.id);
    setBusy(true);
    try {
      const outcome = await bulkRejectEvidence({ ids, type: batchType, reason });
      setBulkDialog(null);
      reportBulk(outcome.succeeded, outcome.failed, batchType, "rejected");
    } catch (error) {
      failure(error, () => void bulkReject(reason));
    } finally {
      setBusy(false);
    }
  }

  async function reload(nextPage: number, append: boolean) {
    setLoadingMore(true);
    try {
      const response = await getEvidencePending(typeFilter === "all" ? undefined : typeFilter, nextPage, PAGE_LIMIT);
      setItems((current) => {
        if (!append) return response.data;
        const known = new Set(current.map(evidenceKey));
        return [...current, ...response.data.filter((item) => !known.has(evidenceKey(item)))];
      });
      setTotal(response.total);
      setPage(response.page);
      setStaleAt(null);
      setLastLoadedAt(new Date());
      if (!append) setChecked(new Set());
    } catch {
      setStaleAt(lastLoadedAt);
    } finally {
      setLoadingMore(false);
    }
  }

  const filterControl = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="evidence-type-filter">{t("typeFilterLabel")}</Label>
        <Select value={typeFilter} onValueChange={(value) => setFilter(resolveEvidenceTypeFilter(value))}>
          <SelectTrigger id="evidence-type-filter" className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EVIDENCE_TYPE_FILTERS.map((value) => (
              <SelectItem key={value} value={value}>
                {value === "all" ? t("types.all") : tType(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="button" variant="outline" size="sm" loading={loadingMore} onClick={() => void reload(1, false)}>
        {t("refresh")}
      </Button>
    </div>
  );

  if (!result.ok) {
    return (
      <div className="space-y-4">
        {filterControl}
        <ErrorState
          kind={result.error.kind}
          {...(result.error.detail ? { detail: result.error.detail } : {})}
          title={t("loadErrorTitle")}
          retry
        />
      </div>
    );
  }

  if (items.length === 0 && total === 0) {
    return (
      <div className="space-y-4">
        {filterControl}
        <EmptyState
          icon={ClipboardCheck}
          title={t(typeFilter === "all" ? "emptyTitle" : "emptyFilteredTitle")}
          description={t(typeFilter === "all" ? "emptyDescription" : "emptyFilteredDescription")}
        >
          {typeFilter !== "all" && (
            <Button type="button" variant="outline" size="sm" onClick={() => setFilter("all")}>
              {t("clearFilter")}
            </Button>
          )}
        </EmptyState>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        {filterControl}
        <EmptyState icon={ClipboardCheck} title={t("pageDoneTitle")} description={t("pageDoneDescription", { total })}>
          <Button type="button" variant="outline" size="sm" loading={loadingMore} onClick={() => void reload(1, false)}>
            {t("refresh")}
          </Button>
        </EmptyState>
      </div>
    );
  }

  const nextItem = selectedIndex >= 0 ? items[selectedIndex + 1] : undefined;

  return (
    <div className="space-y-4">
      {filterControl}
      {staleAt && <StaleDataNotice at={staleAt} onRetry={() => void reload(1, false)} />}

      {checkedItems.length > 0 && (
        <div
          role="region"
          aria-label={t("bulk.label")}
          className="flex flex-wrap items-center gap-3 rounded-lg bg-primary-soft px-4 py-2 text-primary-soft-foreground text-sm"
        >
          <b className="font-medium">{t("bulk.selected", { count: checkedItems.length })}</b>
          <Button type="button" size="sm" disabled={!sameType || busy} onClick={() => setBulkDialog("approve")}>
            {t("bulk.approve", { count: checkedItems.length })}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={!sameType || busy} onClick={() => setBulkDialog("reject")}>
            {t("bulk.reject", { count: checkedItems.length })}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setChecked(new Set())}>
            {t("bulk.clear")}
          </Button>
          {!sameType && <span role="status">{t("bulk.mixed")}</span>}
        </div>
      )}

      <SplitInbox
        items={items}
        getId={evidenceKey}
        selectedId={selectedKey}
        onSelect={setSelectedKey}
        listLabel={t("listLabel")}
        emptyTitle={t("emptyTitle")}
        renderItem={(item) => {
          const key = evidenceKey(item);
          const days = daysWaiting(item.submitted_at);
          const state: WaitState = isOverdue(days) ? "overdue" : "ok";
          return (
            <div className="flex items-start gap-3">
              <Checkbox
                checked={checked.has(key)}
                aria-label={t("selectItem", { name: item.member_name })}
                onClick={(event) => event.stopPropagation()}
                onCheckedChange={(value) =>
                  setChecked((current) => {
                    const next = new Set(current);
                    if (value === true) next.add(key);
                    else next.delete(key);
                    return next;
                  })
                }
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <SplitInboxItemContent
                  title={item.member_name}
                  subtitle={`${tType(item.type)} · ${getEvidenceContextLabel(item)}`}
                  status={
                    <ExceptionStatus<WaitState>
                      value={state}
                      normal={["ok"]}
                      labels={{ ok: "", overdue: tAge("overdue") }}
                      intents={{ overdue: "warning" }}
                    />
                  }
                />
                <p className="text-muted-foreground text-xs tabular-nums">
                  {t("fileCount", { count: item.file_count })}
                  {days !== null ? ` · ${tAge("age", { days })}` : ""}
                </p>
              </div>
            </div>
          );
        }}
        detail={selected ? <EvidencePreview key={evidenceKey(selected)} item={selected} /> : null}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 truncate text-muted-foreground text-sm">
              {total > items.length ? (
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  className="h-auto p-0"
                  loading={loadingMore}
                  onClick={() => void reload(page + 1, true)}
                >
                  {t("loadMore", { loaded: items.length, total })}
                </Button>
              ) : nextItem ? (
                t("next", { title: nextItem.member_name })
              ) : null}
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" disabled={!selected || busy} onClick={() => selected && setRejecting(selected)}>
                {t("reject")}
              </Button>
              <Button type="button" disabled={!selected || busy} loading={busy && !rejecting && bulkDialog === null} onClick={() => void approveSelected()}>
                {nextItem ? t("approveNext") : t("approve")}
              </Button>
            </div>
          </div>
        }
      />

      <ReasonDialog
        open={rejecting !== null}
        onOpenChange={(open) => !open && setRejecting(null)}
        title={t("rejectDialog.title")}
        description={rejecting ? t("rejectDialog.description", { name: rejecting.member_name }) : undefined}
        confirmLabel={t("rejectDialog.confirm")}
        pending={busy}
        onConfirm={(reason) => (rejecting ? rejectOne(rejecting, reason) : undefined)}
      />

      <ReasonDialog
        open={bulkDialog === "reject"}
        onOpenChange={(open) => !open && setBulkDialog(null)}
        title={t("bulk.rejectDialog.title", { count: checkedItems.length })}
        description={t("bulk.rejectDialog.description", { count: checkedItems.length })}
        confirmLabel={t("bulk.rejectDialog.confirm", { count: checkedItems.length })}
        pending={busy}
        onConfirm={bulkReject}
      />

      <ConfirmDialog
        open={bulkDialog === "approve"}
        onOpenChange={(open) => !open && setBulkDialog(null)}
        title={t("bulk.approveDialog.title", { count: checkedItems.length })}
        description={t("bulk.approveDialog.description", {
          count: checkedItems.length,
          type: batchType ? tType(batchType) : "",
        })}
        confirmLabel={t("bulk.approveDialog.confirm", { count: checkedItems.length })}
        pending={busy}
        onConfirm={bulkApprove}
      />
    </div>
  );
}
