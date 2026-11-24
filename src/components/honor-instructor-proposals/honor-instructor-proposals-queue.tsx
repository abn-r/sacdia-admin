"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Inbox } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorStateTableRow } from "@/components/shared/error-state";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { StaleDataNotice } from "@/components/shared/stale-data-notice";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { errorStateFromError } from "@/lib/api/error-state";
import type {
  HonorInstructorProposal,
  HonorInstructorProposalQueueStatus,
} from "@/lib/api/honor-instructor-proposals";
import { useFormatDate } from "@/lib/format-locale";
import { toast } from "sonner";
import {
  getProposalErrorKey,
  isInstructorInvalidError,
  isStaleProposalError,
} from "./honor-instructor-proposal-errors";
import { ProposalInstructorCell } from "./proposal-instructor-cell";
import { useHonorInstructorProposalMutations, useHonorInstructorProposals } from "./use-honor-instructor-proposals";

export const REASON_MIN = 3;
export const REASON_MAX = 500;

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const HISTORY_STATUSES: HonorInstructorProposalQueueStatus[] = ["APPROVED", "REJECTED"];
const STATUS_INTENT: Record<string, StatusIntent> = {
  APPROVED: "success",
  REJECTED: "destructive",
};

type Decision = { proposal: HonorInstructorProposal; action: "approve" | "reject" };

function categoryName(honor: HonorInstructorProposal["honor"]): string | null {
  const category = honor?.category;
  return typeof category === "string" ? category : (category?.name ?? null);
}

interface HonorInstructorProposalsQueueProps {
  /** `pending` = decision queue; `history` = already resolved proposals. */
  mode?: "pending" | "history";
}

/**
 * Proposals to change the instructor of an approved honor: current and proposed
 * instructor side by side. Approve confirms with the full sentence; reject asks a reason.
 */
export function HonorInstructorProposalsQueue({ mode = "pending" }: HonorInstructorProposalsQueueProps) {
  const t = useTranslations("honor_instructor_proposals");
  const tq = useTranslations("queues.classes.instructors");
  const formatDate = useFormatDate();
  const [historyStatus, setHistoryStatus] = useState<HonorInstructorProposalQueueStatus>("APPROVED");
  const status: HonorInstructorProposalQueueStatus = mode === "pending" ? "PENDING" : historyStatus;
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE_OPTIONS[0] ?? 20);
  const [decision, setDecision] = useState<Decision | null>(null);
  /** Proposal whose approval answered HONOR_INSTRUCTOR_INVALID: only "reject" remains for it. */
  const [invalidFor, setInvalidFor] = useState<string | null>(null);

  const { approve, reject, refresh } = useHonorInstructorProposalMutations();
  const query = useHonorInstructorProposals({ status, page, limit });
  const { data, isPending, isError, refetch, dataUpdatedAt } = query;

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  // Resolving the last row of a page > 1 leaves it empty: step back (render-phase adjustment).
  if (data && page > totalPages) setPage(totalPages);

  const showDecisions = mode === "pending";
  const fmt = (value?: string | null) => (value ? formatDate(value) : "—");

  function close() {
    setDecision(null);
    setInvalidFor(null);
  }

  /** Stale rows (404/409) reload the queue and close the dialog; returns true when handled. */
  function handleStale(error: unknown, message: string): boolean {
    if (!isStaleProposalError(error)) return false;
    toast.error(message);
    void refresh();
    close();
    return true;
  }

  async function confirmApprove(proposal: HonorInstructorProposal) {
    try {
      await approve.mutateAsync(proposal.proposal_id);
      toast.success(t("toast.approved"));
    } catch (error) {
      const message = t(`errors.${getProposalErrorKey(error)}`);
      if (handleStale(error, message)) return;
      if (isInstructorInvalidError(error)) {
        setInvalidFor(proposal.proposal_id);
        setDecision({ proposal, action: "reject" });
      }
      // ConfirmDialog keeps itself open (or is swapped for the reject dialog) instead of closing.
      throw new Error(message);
    }
  }

  async function confirmReject(proposal: HonorInstructorProposal, reason: string) {
    try {
      await reject.mutateAsync({ proposalId: proposal.proposal_id, reason });
      toast.success(t("toast.rejected"));
      close();
    } catch (error) {
      const message = t(`errors.${getProposalErrorKey(error)}`);
      if (!handleStale(error, message)) toast.error(message);
    }
  }

  const head = (
    <TableHeader>
      <TableRow>
        <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("columns.member")}</TableHead>
        <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("columns.honor")}</TableHead>
        <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("columns.current")}</TableHead>
        <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("columns.proposed")}</TableHead>
        <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("columns.date")}</TableHead>
        {showDecisions ? (
          <RowActionsHead className="h-9 w-56 px-3" />
        ) : (
          <TableHead className="h-9 px-3 text-right text-xs font-medium text-muted-foreground">{tq("columns.result")}</TableHead>
        )}
      </TableRow>
    </TableHeader>
  );

  if (isPending) {
    return (
      <div className="flex flex-col gap-2" role="status" aria-label={t("loading")}>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  const historyToggle =
    mode === "history" ? (
      <div className="flex flex-wrap gap-1" role="group" aria-label={t("filter.label")}>
        {HISTORY_STATUSES.map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={historyStatus === value ? "default" : "outline"}
            aria-pressed={historyStatus === value}
            onClick={() => {
              setHistoryStatus(value);
              setPage(1);
            }}
          >
            {t(`filter.${value}`)}
          </Button>
        ))}
      </div>
    ) : null;

  // The first load failed: the error lives inside the table frame and keeps the headers.
  if (isError && !data) {
    const { kind, detail } = errorStateFromError(query.error);
    return (
      <div className="space-y-4">
        {historyToggle}
        <DataTableShell>
          <Table>
            {head}
            <TableBody>
              <ErrorStateTableRow
                colSpan={6}
                kind={kind}
                {...(detail ? { detail } : {})}
                title={tq("loadErrorTitle")}
                onRetry={() => void refetch()}
              />
            </TableBody>
          </Table>
        </DataTableShell>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {historyToggle}
      {isError && <StaleDataNotice at={dataUpdatedAt} onRetry={() => void refetch()} />}

      {items.length === 0 ? (
        <EmptyState icon={Inbox} title={t(`empty.${status}.title`)} description={t(`empty.${status}.description`)} />
      ) : (
        <>
          <DataTableShell>
            <Table>
              {head}
              <TableBody>
                {items.map((proposal) => {
                  const category = categoryName(proposal.honor);
                  const approvedAt = proposal.honor_approved_at ?? proposal.honor?.approved_at;
                  const memberName = proposal.member?.display_name ?? proposal.honor?.name ?? "—";
                  return (
                    <TableRow key={proposal.proposal_id}>
                      <TableCell className="px-3 py-2.5 font-medium">{proposal.member?.display_name ?? "—"}</TableCell>
                      <TableCell className="px-3 py-2.5">
                        <div className="font-medium">{proposal.honor?.name ?? "—"}</div>
                        {category && <div className="text-xs text-muted-foreground">{category}</div>}
                        {approvedAt && (
                          <div className="text-xs text-muted-foreground">{t("approvedOn", { date: fmt(approvedAt) })}</div>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2.5"><ProposalInstructorCell instructor={proposal.current_instructor} /></TableCell>
                      <TableCell className="px-3 py-2.5"><ProposalInstructorCell instructor={proposal.proposed_instructor} /></TableCell>
                      <TableCell className="whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground tabular-nums">
                        {fmt(proposal.created_at)}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right">
                        {showDecisions ? (
                          <RowActions
                            label={memberName}
                            actions={[]}
                            primary={
                              <>
                                <Button size="sm" variant="outline" onClick={() => setDecision({ proposal, action: "reject" })}>
                                  {t("actions.reject")}
                                </Button>
                                <Button size="sm" onClick={() => setDecision({ proposal, action: "approve" })}>
                                  {t("actions.approve")}
                                </Button>
                              </>
                            }
                          />
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <StatusBadge intent={STATUS_INTENT[proposal.status] ?? "neutral"} label={t(`status.${proposal.status}`)} />
                            {proposal.reviewed_at && (
                              <span className="text-xs text-muted-foreground tabular-nums">{fmt(proposal.reviewed_at)}</span>
                            )}
                            {proposal.rejection_reason && (
                              <p className="max-w-64 text-xs text-muted-foreground">{proposal.rejection_reason}</p>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </DataTableShell>
          <DataTablePagination
            page={page}
            totalPages={totalPages}
            total={total}
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

      {decision && decision.action === "approve" && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && close()}
          title={tq("confirm.title")}
          description={
            decision.proposal.current_instructor?.display_name
              ? tq("confirm.replace", {
                  proposed: decision.proposal.proposed_instructor.display_name ?? t("instructor.unnamed"),
                  current: decision.proposal.current_instructor.display_name,
                  honor: decision.proposal.honor?.name ?? "",
                  member: decision.proposal.member?.display_name ?? "",
                })
              : tq("confirm.assign", {
                  proposed: decision.proposal.proposed_instructor.display_name ?? t("instructor.unnamed"),
                  honor: decision.proposal.honor?.name ?? "",
                  member: decision.proposal.member?.display_name ?? "",
                })
          }
          confirmLabel={tq("confirm.confirm")}
          pending={approve.isPending}
          onConfirm={() => confirmApprove(decision.proposal)}
        />
      )}

      {decision && decision.action === "reject" && (
        <ReasonDialog
          open
          onOpenChange={(open) => !open && close()}
          title={t("reject.title")}
          description={
            invalidFor === decision.proposal.proposal_id ? (
              <p role="alert" className="text-destructive">{t("errors.invalid")}</p>
            ) : (
              t("reject.description", {
                member: decision.proposal.member?.display_name ?? "",
                proposed: decision.proposal.proposed_instructor.display_name ?? t("instructor.unnamed"),
              })
            )
          }
          label={t("reject.reasonLabel")}
          placeholder={t("reject.reasonPlaceholder")}
          min={REASON_MIN}
          max={REASON_MAX}
          confirmLabel={t("reject.confirm")}
          pending={reject.isPending}
          onConfirm={(reason) => confirmReject(decision.proposal, reason)}
        />
      )}
    </div>
  );
}
