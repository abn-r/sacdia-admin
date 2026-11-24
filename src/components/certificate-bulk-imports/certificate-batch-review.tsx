"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileText, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { SplitInbox, SplitInboxItemContent } from "@/components/shared/split-inbox";
import { UrlTabs, useUrlTab } from "@/components/shared/url-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { CertificateItemTypeBadge } from "@/components/certificate-bulk-imports/certificate-bulk-import-badges";
import {
  InstructorConflictNotice,
  InstructorLine,
} from "@/components/certificate-bulk-imports/certificate-bulk-import-review-parts";
import {
  ApproveItemDialog,
  RejectItemDialog,
} from "@/components/certificate-bulk-imports/certificate-batch-item-dialogs";
import {
  CertificateBatchProof,
  type ProofViewerTarget,
} from "@/components/certificate-bulk-imports/certificate-batch-proof";
import { confidenceLevel, isInstitutionalItem } from "@/components/certificate-bulk-imports/certificate-batch-model";
import {
  applyItemDecisions,
  buildItemDecision,
  confidencePercent,
  isReviewableItem,
  itemCatalogLabel,
  itemCatalogName,
  resolveProofTarget,
  undeliveredDecisionIds,
  type ItemDecision,
} from "@/components/certificate-bulk-imports/helpers";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";
import { useFormatDate, useFormatDateTime } from "@/lib/format-locale";
import type { CertificateBulkImportBatch, CertificateBulkImportItem } from "@/lib/api/certificate-bulk-imports";

/** GM-01 substitutes the current enrollment with one INVESTIDO row. */
const GM01_CODE = "GM-01";

/** If a refresh still returns rows the reviewer already decided, re-ask this many times. */
const MAX_DECISION_REFRESH_RETRIES = 3;
const DECISION_REFRESH_RETRY_MS = 1500;

type ItemTab = "rows" | "audit";
type DialogState = { action: "approve" | "reject"; item: CertificateBulkImportItem } | null;

/**
 * Batch detail as a split inbox (pattern B): rows on the left, the voucher on
 * its page on the right. Selecting a row jumps the viewer to the row's page.
 */
export function CertificateBatchReview({ batch }: { batch: CertificateBulkImportBatch }) {
  const t = useTranslations("queues.certificates.batch");
  const tStatus = useTranslations("certificate_bulk_imports.itemStatus");
  const tType = useTranslations("certificate_bulk_imports.itemType");
  const tEvents = useTranslations("certificate_bulk_imports.eventActions");
  const tAudit = useTranslations("certificate_bulk_imports.auditTimeline");
  const router = useRouter();
  const formatDate = useFormatDate();
  const formatDateTime = useFormatDateTime();
  const { canCapability } = useScreenAccess();
  const canApprove = canCapability("certificate-bulk-imports", "approve");
  const canReject = canCapability("certificate-bulk-imports", "reject");
  const tab = useUrlTab("tab", "rows") as ItemTab;
  const [, startTransition] = useTransition();

  const [dialog, setDialog] = useState<DialogState>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fileOverride, setFileOverride] = useState<{ itemId: string; fileId: string } | null>(null);
  // Decisions taken in this session, kept until the server data reflects them.
  const [decisions, setDecisions] = useState<Record<string, ItemDecision>>({});
  const [retryTick, setRetryTick] = useState(0);
  const retryCount = useRef(0);

  const institutionalIds = useMemo(
    () => new Set((batch.items ?? []).filter(isInstitutionalItem).map((item) => item.item_id)),
    [batch.items],
  );
  const items = useMemo(
    () => applyItemDecisions(batch.items ?? [], decisions).filter((item) => !institutionalIds.has(item.item_id)),
    [batch.items, decisions, institutionalIds],
  );
  const files = useMemo(
    () => (batch.files ?? []).filter((file) => file.jurisdiction !== "INSTITUTIONAL"),
    [batch.files],
  );
  const events = useMemo(
    () => (batch.events ?? []).filter((event) => !event.item_id || !institutionalIds.has(event.item_id)),
    [batch.events, institutionalIds],
  );

  const firstOpen = items.find(isReviewableItem) ?? items[0];
  const selected = items.find((item) => item.item_id === selectedId) ?? firstOpen;
  const selectedIndex = selected ? items.findIndex((item) => item.item_id === selected.item_id) : -1;
  const memberName = batch.user
    ? [batch.user.name, batch.user.paternal_last_name].filter(Boolean).join(" ") || (batch.user.email ?? "")
    : "";

  // Reconcile local decisions with the server (same rule as the legacy detail).
  const undelivered = useMemo(
    () => undeliveredDecisionIds(batch.items ?? [], decisions),
    [batch.items, decisions],
  );
  const hasUndelivered = undelivered.length > 0;
  const [seenItems, setSeenItems] = useState(batch.items);
  if (seenItems !== batch.items) {
    setSeenItems(batch.items);
    const keep = new Set(undeliveredDecisionIds(batch.items ?? [], decisions));
    if (Object.keys(decisions).some((id) => !keep.has(id))) {
      setDecisions(Object.fromEntries(Object.entries(decisions).filter(([id]) => keep.has(id))));
    }
  }
  useEffect(() => {
    if (!hasUndelivered) {
      retryCount.current = 0;
      return;
    }
    if (retryCount.current >= MAX_DECISION_REFRESH_RETRIES) return;
    const timer = setTimeout(() => {
      retryCount.current += 1;
      startTransition(() => router.refresh());
      setRetryTick((tick) => tick + 1);
    }, DECISION_REFRESH_RETRY_MS * (retryCount.current + 1));
    return () => clearTimeout(timer);
  }, [hasUndelivered, batch, retryTick, router]);

  const proofTarget = selected ? resolveProofTarget(selected, files) : null;
  const viewerTarget: ProofViewerTarget | null =
    selected && proofTarget
      ? {
          fileId: fileOverride?.itemId === selected.item_id ? fileOverride.fileId : proofTarget.fileId,
          page: fileOverride?.itemId === selected.item_id ? 1 : proofTarget.page,
          navigationKey: selected.item_id,
        }
      : null;

  function select(id: string) {
    setSelectedId(id);
  }

  function goToNext(fromId: string) {
    const from = items.findIndex((item) => item.item_id === fromId);
    const next =
      items.slice(from + 1).find(isReviewableItem) ?? items.slice(0, Math.max(from, 0)).find(isReviewableItem);
    if (next) setSelectedId(next.item_id);
  }

  function handleDecided(action: "approve" | "reject", item: CertificateBulkImportItem, decided?: Partial<CertificateBulkImportItem>) {
    retryCount.current = 0;
    setDecisions((current) => ({ ...current, [item.item_id]: buildItemDecision(action, decided) }));
    setDialog(null);
    goToNext(item.item_id);
    startTransition(() => router.refresh());
  }

  const rowTitle = (item: CertificateBulkImportItem, index: number) =>
    t("rowTitle", { n: index + 1, name: item.detected_name ?? t("noName") });

  return (
    <div className="flex flex-col gap-4">
      <UrlTabs
        ariaLabel={t("tabsLabel")}
        defaultValue="rows"
        tabs={[
          { value: "rows", label: t("tabRows"), count: items.length },
          { value: "audit", label: t("tabAudit"), count: events.length },
        ]}
      />

      {tab === "audit" ? (
        events.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={tAudit("emptyTitle")}
            description={tAudit("emptyDescription")}
            variant="no-results"
          />
        ) : (
          <ol className="ml-2 flex flex-col gap-4 border-l pl-5">
            {events.map((event) => (
              <li key={event.event_id} className="relative">
                <span aria-hidden className="absolute top-1.5 -left-[25px] size-2 rounded-full bg-border" />
                <p className="font-medium text-sm">
                  {tEvents.has(event.action as Parameters<typeof tEvents>[0])
                    ? tEvents(event.action as Parameters<typeof tEvents>[0])
                    : event.action}
                </p>
                <p className="text-muted-foreground text-xs">{formatDateTime(event.created_at)}</p>
                {event.comment && <p className="mt-1 text-muted-foreground text-sm">{event.comment}</p>}
              </li>
            ))}
          </ol>
        )
      ) : (
        <SplitInbox
          items={items}
          getId={(item) => item.item_id}
          selectedId={selected?.item_id ?? null}
          onSelect={select}
          listLabel={t("listLabel")}
          emptyTitle={t("noRows")}
          renderItem={(item) => (
            <SplitInboxItemContent
              title={`${tType(item.item_type)} · ${itemCatalogName(item)}`}
              subtitle={t("rowMeta", {
                ocr: confidencePercent(item.ocr_confidence),
                page: item.source_page ?? 1,
              })}
              status={
                <div className="flex flex-col items-end gap-1">
                  <ExceptionStatus
                    value={item.status}
                    normal={["SUBMITTED", "RESUBMITTED", "NEEDS_REVIEW", "READY"]}
                    labels={{
                      NEEDS_REVIEW: tStatus("NEEDS_REVIEW"),
                      READY: tStatus("READY"),
                      SUBMITTED: tStatus("SUBMITTED"),
                      RESUBMITTED: tStatus("RESUBMITTED"),
                      APPROVED: tStatus("APPROVED"),
                      REJECTED: tStatus("REJECTED"),
                    }}
                    intents={{ APPROVED: "success", REJECTED: "neutral" }}
                  />
                  {item.instructor_conflict && (
                    <StatusBadge intent="warning" size="sm" label={t("conflictShort")} />
                  )}
                </div>
              }
            />
          )}
          detail={
            selected ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h2 className="font-semibold text-base">{rowTitle(selected, selectedIndex)}</h2>
                    <p className="text-muted-foreground text-sm">
                      {selected.completed_at
                        ? t(selected.item_type === "CLASS" ? "investitureDate" : "certificateDate", {
                            date: formatDate(selected.completed_at),
                          })
                        : itemCatalogLabel(selected)}
                    </p>
                    {selected.item_type === "HONOR" && <InstructorLine instructor={selected.instructor} />}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CertificateItemTypeBadge type={selected.item_type} />
                    {confidenceLevel(selected.ocr_confidence) && (
                      <Badge variant="outline">
                        {t("ocr", {
                          percent: confidencePercent(selected.ocr_confidence),
                          level: t(`confidence.${confidenceLevel(selected.ocr_confidence) ?? "low"}`),
                        })}
                      </Badge>
                    )}
                    {proofTarget && <Badge variant="outline">{t("pageChip", { page: proofTarget.page })}</Badge>}
                  </div>
                </div>

                {selected.instructor_conflict && <InstructorConflictNotice approved={selected.status === "APPROVED"} />}

                {selected.class?.asset_code === GM01_CODE && <Notice>{t("gm01Notice")}</Notice>}

                {selected.approval_blockers && selected.approval_blockers.length > 0 && (
                  <Notice>
                    <p className="font-medium">{t("blockersTitle")}</p>
                    <p className="text-muted-foreground">{t("blockersNote")}</p>
                    <ul className="mt-1 list-inside list-disc font-mono text-xs">
                      {selected.approval_blockers.map((blocker) => (
                        <li key={blocker}>{blocker}</li>
                      ))}
                    </ul>
                  </Notice>
                )}

                {selected.rejection_reason && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">{t("rejectionReason")}: </span>
                    {selected.rejection_reason}
                  </p>
                )}

                <CertificateBatchProof
                  files={files}
                  target={viewerTarget}
                  onSelectFile={(fileId) => setFileOverride({ itemId: selected.item_id, fileId })}
                />
              </div>
            ) : null
          }
          footer={
            selected ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="min-w-0 truncate text-muted-foreground text-sm">
                  {items[selectedIndex + 1]
                    ? t("next", { title: itemCatalogLabel(items[selectedIndex + 1] as CertificateBulkImportItem) })
                    : null}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={selectedIndex <= 0}
                    onClick={() => select((items[selectedIndex - 1] as CertificateBulkImportItem).item_id)}
                  >
                    {t("previous")}
                  </Button>
                  {isReviewableItem(selected) && canReject && (
                    <Button type="button" variant="outline" onClick={() => setDialog({ action: "reject", item: selected })}>
                      {t("reject")}
                    </Button>
                  )}
                  {isReviewableItem(selected) && canApprove && (
                    <Button type="button" onClick={() => setDialog({ action: "approve", item: selected })}>
                      {t("approveNext")}
                    </Button>
                  )}
                </div>
              </div>
            ) : null
          }
        />
      )}

      {dialog?.action === "approve" && (
        <ApproveItemDialog
          open
          onOpenChange={(open) => !open && setDialog(null)}
          batchId={batch.batch_id}
          item={dialog.item}
          title={t("approveDialog.title", {
            n: items.findIndex((i) => i.item_id === dialog.item.item_id) + 1,
            name: itemCatalogLabel(dialog.item),
          })}
          memberName={memberName}
          onApproved={(decided) => handleDecided("approve", dialog.item, decided)}
        />
      )}
      {dialog?.action === "reject" && (
        <RejectItemDialog
          open
          onOpenChange={(open) => !open && setDialog(null)}
          batchId={batch.batch_id}
          item={dialog.item}
          title={t("rejectDialog.title", {
            n: items.findIndex((i) => i.item_id === dialog.item.item_id) + 1,
            name: itemCatalogLabel(dialog.item),
          })}
          memberName={memberName}
          onRejected={(decided) => handleDecided("reject", dialog.item, decided)}
        />
      )}
    </div>
  );
}

/** Informative notice: system blocks and context are never red (not the member's fault). */
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div role="note" className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm">
      <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
