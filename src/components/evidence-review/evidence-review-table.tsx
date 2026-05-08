"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  XCircle,
  History,
  Eye,
  Loader2,
  FileSearch,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/shared/empty-state";
import { EvidenceStatusBadge } from "@/components/evidence-review/evidence-status-badge";
import { EvidenceTypeBadge } from "@/components/evidence-review/evidence-type-badge";
import { EvidenceApproveDialog } from "@/components/evidence-review/evidence-approve-dialog";
import { EvidenceRejectDialog } from "@/components/evidence-review/evidence-reject-dialog";
import { EvidenceDetailDialog } from "@/components/evidence-review/evidence-detail-dialog";
import { EvidenceHistoryDialog } from "@/components/evidence-review/evidence-history-dialog";
import { EvidenceBulkActionBar } from "@/components/evidence-review/evidence-bulk-action-bar";
import type { EvidenceItem, EvidenceType } from "@/lib/api/evidence-review";
import { useFormatDate } from "@/lib/format-locale";

function isPending(status: string, type: EvidenceType): boolean {
  if (status === "SUBMITTED") return true;
  if (type === "honor") return status === "in_progress";
  return status === "pendiente";
}

// ─── Dialog state ─────────────────────────────────────────────────────────────

type DialogState =
  | { kind: "approve"; item: EvidenceItem }
  | { kind: "reject"; item: EvidenceItem }
  | { kind: "detail"; item: EvidenceItem }
  | { kind: "history"; item: EvidenceItem }
  | null;

// ─── Row actions ──────────────────────────────────────────────────────────────

interface RowActionsProps {
  item: EvidenceItem;
  onApprove: () => void;
  onReject: () => void;
  onDetail: () => void;
  onHistory: () => void;
}

function RowActions({
  item,
  onApprove,
  onReject,
  onDetail,
  onHistory,
}: RowActionsProps) {
  const t = useTranslations("evidence_review.table");
  const [isApproving, setIsApproving] = useState(false);
  const pending = isPending(item.status, item.type);

  void setIsApproving;

  return (
    <div className="flex items-center justify-end gap-1">
      {/* Detail */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDetail}
            aria-label={t("action_view_files")}
          >
            <Eye className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("action_view_files")}</TooltipContent>
      </Tooltip>

      {/* History */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onHistory}
            aria-label={t("action_view_history")}
          >
            <History className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("action_view_history")}</TooltipContent>
      </Tooltip>

      {/* Approve — only when pending */}
      {pending && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-success hover:bg-success/10 hover:text-success"
              onClick={onApprove}
              disabled={isApproving}
              aria-label={t("action_approve")}
            >
              {isApproving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("action_approve")}</TooltipContent>
        </Tooltip>
      )}

      {/* Reject — only when pending */}
      {pending && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onReject}
              aria-label={t("action_reject")}
            >
              <XCircle className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("action_reject")}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface EvidenceReviewTableProps {
  items: EvidenceItem[];
  onRefresh: () => void;
}

export function EvidenceReviewTable({ items, onRefresh }: EvidenceReviewTableProps) {
  const t = useTranslations("evidence_review.table");
  const formatDate = useFormatDate();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  function closeDialog() {
    setDialog(null);
  }

  // ── Selection ──────────────────────────────────────────────────────────────

  const selectableItems = items.filter((item) =>
    isPending(item.status, item.type),
  );

  const allSelected =
    selectableItems.length > 0 &&
    selectableItems.every((item) => selectedIds.has(item.id));

  const someSelected =
    !allSelected &&
    selectableItems.some((item) => selectedIds.has(item.id));

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(selectableItems.map((item) => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  function toggleRow(id: number, selectable: boolean) {
    if (!selectable) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // Derive the type of the selection — bulk operations require all items be the
  // same type. If selection is mixed, selectedType is null and bulk approve is hidden.
  const selectedItems = items.filter((item) => selectedIds.has(item.id));
  const uniqueTypes = new Set(selectedItems.map((item) => item.type));
  const selectedType: EvidenceType | null =
    uniqueTypes.size === 1 ? ([...uniqueTypes][0] as EvidenceType) : null;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={FileSearch}
        title={t("empty_title")}
        description={t("empty_description")}
      />
    );
  }

  const activeItem = dialog?.item ?? null;

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Bulk-select all */}
              <TableHead className="h-9 w-10 px-3">
                {selectableItems.length > 0 && (
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                    aria-label={t("select_all")}
                  />
                )}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("col_member")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("col_type")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("col_section")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("col_files")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("col_submitted")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("col_status")}
              </TableHead>
              <TableHead className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("col_actions")}
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {items.map((item) => {
              const isSelected = selectedIds.has(item.id);
              const selectable = isPending(item.status, item.type);

              return (
                <TableRow
                  key={`${item.type}-${item.id}`}
                  className={`hover:bg-muted/30 ${isSelected ? "bg-muted/50" : ""}`}
                >
                  {/* Checkbox */}
                  <TableCell className="px-3 py-2.5 align-middle">
                    {selectable ? (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(item.id, selectable)}
                        aria-label={t("select_row", { name: item.member_name })}
                      />
                    ) : (
                      <span className="inline-block size-4" />
                    )}
                  </TableCell>

                  <TableCell className="px-3 py-2.5 align-middle">
                    <span className="font-medium">{item.member_name}</span>
                  </TableCell>

                  <TableCell className="px-3 py-2.5 align-middle">
                    <EvidenceTypeBadge type={item.type} />
                  </TableCell>

                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {item.section_name}
                  </TableCell>

                  <TableCell className="px-3 py-2.5 align-middle tabular-nums text-sm text-muted-foreground">
                    {item.file_count}
                  </TableCell>

                  <TableCell className="px-3 py-2.5 align-middle tabular-nums text-sm text-muted-foreground">
                    {item.submitted_at ? formatDate(item.submitted_at) : "—"}
                  </TableCell>

                  <TableCell className="px-3 py-2.5 align-middle">
                    <EvidenceStatusBadge status={item.status} type={item.type} />
                  </TableCell>

                  <TableCell className="px-3 py-2.5 align-middle">
                    <RowActions
                      item={item}
                      onApprove={() => setDialog({ kind: "approve", item })}
                      onReject={() => setDialog({ kind: "reject", item })}
                      onDetail={() => setDialog({ kind: "detail", item })}
                      onHistory={() => setDialog({ kind: "history", item })}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ─── Dialogs ──────────────────────────────────────────────────────────── */}

      {dialog?.kind === "approve" && activeItem && (
        <EvidenceApproveDialog
          open
          type={activeItem.type}
          id={activeItem.id}
          memberName={activeItem.member_name}
          sectionName={activeItem.section_name}
          onOpenChange={(open) => { if (!open) closeDialog(); }}
          onSuccess={() => { closeDialog(); onRefresh(); }}
        />
      )}

      {dialog?.kind === "reject" && activeItem && (
        <EvidenceRejectDialog
          open
          type={activeItem.type}
          id={activeItem.id}
          memberName={activeItem.member_name}
          sectionName={activeItem.section_name}
          onOpenChange={(open) => { if (!open) closeDialog(); }}
          onSuccess={() => { closeDialog(); onRefresh(); }}
        />
      )}

      {dialog?.kind === "detail" && activeItem && (
        <EvidenceDetailDialog
          open
          type={activeItem.type}
          id={activeItem.id}
          onOpenChange={(open) => { if (!open) closeDialog(); }}
        />
      )}

      {dialog?.kind === "history" && activeItem && (
        <EvidenceHistoryDialog
          open
          type={activeItem.type}
          id={activeItem.id}
          memberName={activeItem.member_name}
          onOpenChange={(open) => { if (!open) closeDialog(); }}
        />
      )}

      {/* ─── Bulk action bar ──────────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <EvidenceBulkActionBar
          selectedIds={[...selectedIds]}
          selectedType={selectedType}
          onClearSelection={clearSelection}
          onSuccess={() => {
            clearSelection();
            onRefresh();
          }}
        />
      )}
    </>
  );
}
