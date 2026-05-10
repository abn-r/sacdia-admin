"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle, Award, History, ClipboardList } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/shared/empty-state";
import { InvestitureStatusBadge } from "@/components/investiture/investiture-status-badge";
import { ValidateDialog } from "@/components/investiture/validate-dialog";
import { InvestidoDialog } from "@/components/investiture/investido-dialog";
import { HistoryTimeline } from "@/components/investiture/history-timeline";
import {
  getInvestitureHistory,
  type PendingEnrollment,
  type InvestitureHistoryEntry,
  type ValidateAction,
} from "@/lib/api/investiture";
import { ApiError } from "@/lib/api/client";
import { useFormatDate } from "@/lib/format-locale";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMemberName(enrollment: PendingEnrollment, fallback: string): string {
  const u = enrollment.user;
  if (!u) return fallback;
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return full || u.email || fallback;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingTableProps {
  enrollments: PendingEnrollment[];
  onRefresh: () => void;
}

// ─── State tracker for dialogs ────────────────────────────────────────────────

type DialogState =
  | { type: "validate"; enrollment: PendingEnrollment; action: ValidateAction }
  | { type: "investido"; enrollment: PendingEnrollment }
  | { type: "history"; enrollment: PendingEnrollment }
  | null;

// ─── Component ────────────────────────────────────────────────────────────────

export function PendingTable({ enrollments, onRefresh }: PendingTableProps) {
  const t = useTranslations("investiture");
  const formatDate = useFormatDate();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [historyEntries, setHistoryEntries] = useState<InvestitureHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  async function openHistory(enrollment: PendingEnrollment) {
    setDialog({ type: "history", enrollment });
    setLoadingHistory(true);
    setHistoryEntries([]);
    try {
      const entries = await getInvestitureHistory(enrollment.enrollment_id);
      setHistoryEntries(Array.isArray(entries) ? entries : []);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : t("pendingTable.errorLoadHistory");
      toast.error(message);
    } finally {
      setLoadingHistory(false);
    }
  }

  function closeDialog() {
    setDialog(null);
    setHistoryEntries([]);
  }

  if (enrollments.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title={t("pendingTable.emptyTitle")}
        description={t("pendingTable.emptyDescription")}
      />
    );
  }

  const activeEnrollment = dialog?.enrollment ?? null;
  const memberName = activeEnrollment
    ? getMemberName(
        activeEnrollment,
        t("pendingTable.enrollmentFallback", { id: activeEnrollment.enrollment_id }),
      )
    : "";

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("pendingTable.colMember")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("pendingTable.colClass")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("pendingTable.colClub")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("pendingTable.colSubmitted")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("pendingTable.colStatus")}
              </TableHead>
              <TableHead className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("pendingTable.colActions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((enrollment) => {
              const name = getMemberName(
                enrollment,
                t("pendingTable.enrollmentFallback", { id: enrollment.enrollment_id }),
              );
              const isSubmitted =
                enrollment.investiture_status === "SUBMITTED_FOR_VALIDATION";
              const isApproved = enrollment.investiture_status === "APPROVED";

              return (
                <TableRow
                  key={enrollment.enrollment_id}
                  className="hover:bg-muted/30"
                >
                  <TableCell className="px-3 py-2.5 align-middle">
                    <span className="font-medium">{name}</span>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {enrollment.class?.name ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {enrollment.club?.name ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                    {enrollment.submitted_at ? formatDate(enrollment.submitted_at) : "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <InvestitureStatusBadge
                      status={enrollment.investiture_status}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <div className="flex items-center justify-end gap-1">
                      {/* History button — always visible */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openHistory(enrollment)}
                            aria-label={t("pendingTable.ariaHistory")}
                          >
                            <History className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("pendingTable.tooltipHistory")}</TooltipContent>
                      </Tooltip>

                      {/* Approve — only for SUBMITTED */}
                      {isSubmitted && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-success hover:bg-success/10 hover:text-success"
                              onClick={() =>
                                setDialog({
                                  type: "validate",
                                  enrollment,
                                  action: "APPROVED",
                                })
                              }
                              aria-label={t("pendingTable.ariaApprove")}
                            >
                              <CheckCircle2 className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("pendingTable.tooltipApprove")}</TooltipContent>
                        </Tooltip>
                      )}

                      {/* Reject — only for SUBMITTED */}
                      {isSubmitted && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() =>
                                setDialog({
                                  type: "validate",
                                  enrollment,
                                  action: "REJECTED",
                                })
                              }
                              aria-label={t("pendingTable.ariaReject")}
                            >
                              <XCircle className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("pendingTable.tooltipReject")}</TooltipContent>
                        </Tooltip>
                      )}

                      {/* Mark as Investido — only for APPROVED */}
                      {isApproved && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-primary hover:bg-primary/10 hover:text-primary"
                              onClick={() =>
                                setDialog({ type: "investido", enrollment })
                              }
                              aria-label={t("pendingTable.ariaMarkInvested")}
                            >
                              <Award className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("pendingTable.tooltipMarkInvested")}</TooltipContent>
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

      {/* Validate dialog (approve / reject) */}
      {dialog?.type === "validate" && (
        <ValidateDialog
          open
          enrollmentId={dialog.enrollment.enrollment_id}
          memberName={memberName}
          action={dialog.action}
          onOpenChange={(open) => {
            if (!open) closeDialog();
          }}
          onSuccess={() => {
            closeDialog();
            onRefresh();
          }}
        />
      )}

      {/* Investido dialog */}
      {dialog?.type === "investido" && (
        <InvestidoDialog
          open
          enrollmentId={dialog.enrollment.enrollment_id}
          memberName={memberName}
          onOpenChange={(open) => {
            if (!open) closeDialog();
          }}
          onSuccess={() => {
            closeDialog();
            onRefresh();
          }}
        />
      )}

      {/* History dialog */}
      <Dialog
        open={dialog?.type === "history"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("pendingTable.historyTitle")}</DialogTitle>
            {activeEnrollment && (
              <DialogDescription>
                {memberName} &middot;{" "}
                <InvestitureStatusBadge
                  status={activeEnrollment.investiture_status}
                  className="align-middle"
                />
              </DialogDescription>
            )}
          </DialogHeader>
          <ScrollArea className="max-h-96 pr-2">
            {loadingHistory ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-lg bg-muted"
                  />
                ))}
              </div>
            ) : (
              <HistoryTimeline entries={historyEntries} />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
