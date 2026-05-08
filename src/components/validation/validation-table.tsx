"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, XCircle, History, ClipboardList } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/shared/empty-state";
import { ValidationStatusBadge } from "@/components/validation/validation-status-badge";
import { ValidationReviewDialog } from "@/components/validation/validation-review-dialog";
import { ValidationHistoryDialog } from "@/components/validation/validation-history-dialog";
import type {
  PendingValidation,
  ValidationAction,
  ValidationEntityType,
} from "@/lib/api/validation";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMemberName(v: PendingValidation): string {
  const u = v.user;
  if (!u) return `Validación #${String(v.validation_id)}`;
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return full || u.email || `Validación #${String(v.validation_id)}`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DialogState =
  | { type: "review"; validation: PendingValidation; action: ValidationAction }
  | { type: "history"; validation: PendingValidation }
  | null;

interface ValidationTableProps {
  validations: PendingValidation[];
  entityType: ValidationEntityType;
  onRefresh: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ValidationTable({
  validations,
  entityType,
  onRefresh,
}: ValidationTableProps) {
  const t = useTranslations("validation_admin");
  const [dialog, setDialog] = useState<DialogState>(null);

  function closeDialog() {
    setDialog(null);
  }

  if (validations.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title={t("table.empty.title")}
        description={t("table.empty.description")}
      />
    );
  }

  const activeValidation = dialog?.validation ?? null;
  const memberName = activeValidation ? getMemberName(activeValidation) : "";
  const entityName = activeValidation?.entity?.name ?? "—";

  const entityColumnHeader =
    entityType === "class"
      ? t("table.columns.class")
      : t("table.columns.honor");

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("table.columns.member")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {entityColumnHeader}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("table.columns.section")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("table.columns.submitted")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("table.columns.status")}
              </TableHead>
              <TableHead className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("table.columns.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validations.map((v) => {
              const name = getMemberName(v);
              const isPending = v.status === "PENDING";

              return (
                <TableRow key={String(v.validation_id)} className="hover:bg-muted/30">
                  <TableCell className="px-3 py-2.5 align-middle">
                    <span className="font-medium">{name}</span>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {v.entity?.name ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {v.section?.name ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                    {formatDate(v.submitted_at)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <ValidationStatusBadge status={v.status} />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <div className="flex items-center justify-end gap-1">
                      {/* History */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDialog({ type: "history", validation: v })}
                            aria-label={t("table.actions.viewHistory")}
                          >
                            <History className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("table.actions.viewHistory")}</TooltipContent>
                      </Tooltip>

                      {/* Approve — only for PENDING */}
                      {isPending && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-success hover:bg-success/10 hover:text-success"
                              onClick={() =>
                                setDialog({ type: "review", validation: v, action: "APPROVED" })
                              }
                              aria-label={t("table.actions.approve")}
                            >
                              <CheckCircle2 className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("table.actions.approve")}</TooltipContent>
                        </Tooltip>
                      )}

                      {/* Reject — only for PENDING */}
                      {isPending && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() =>
                                setDialog({ type: "review", validation: v, action: "REJECTED" })
                              }
                              aria-label={t("table.actions.reject")}
                            >
                              <XCircle className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("table.actions.reject")}</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Review dialog (approve / reject) */}
      {dialog?.type === "review" && (
        <ValidationReviewDialog
          open
          entityType={entityType}
          entityId={dialog.validation.entity_id}
          memberName={memberName}
          entityName={entityName}
          action={dialog.action}
          onOpenChange={(open) => { if (!open) closeDialog(); }}
          onSuccess={() => { closeDialog(); onRefresh(); }}
        />
      )}

      {/* History dialog */}
      {dialog?.type === "history" && (
        <ValidationHistoryDialog
          open
          entityType={entityType}
          entityId={dialog.validation.entity_id}
          title={`${entityName} — ${memberName}`}
          onOpenChange={(open) => { if (!open) closeDialog(); }}
        />
      )}
    </>
  );
}
