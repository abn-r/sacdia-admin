"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { EmptyState } from "@/components/shared/empty-state";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { useFormatDate } from "@/lib/format-locale";
import type {
  HonorInstructorProposal,
  HonorInstructorProposalQueueStatus,
} from "@/lib/api/honor-instructor-proposals";
import { ProposalInstructorCell } from "./proposal-instructor-cell";
import { ProposalDecisionDialog, type ProposalDecision } from "./proposal-decision-dialog";
import { useHonorInstructorProposals } from "./use-honor-instructor-proposals";

const PAGE_SIZE = 20;
const STATUSES: HonorInstructorProposalQueueStatus[] = ["PENDING", "APPROVED", "REJECTED"];
const STATUS_INTENT: Record<string, StatusIntent> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
};

function categoryName(honor: HonorInstructorProposal["honor"]): string | null {
  const category = honor?.category;
  return typeof category === "string" ? category : (category?.name ?? null);
}

export function HonorInstructorProposalsQueue() {
  const t = useTranslations("honor_instructor_proposals");
  const formatDateValue = useFormatDate();
  const [status, setStatus] = useState<HonorInstructorProposalQueueStatus>("PENDING");
  const [page, setPage] = useState(1);
  const [decision, setDecision] = useState<{
    proposal: HonorInstructorProposal;
    action: ProposalDecision;
  } | null>(null);

  const { data, isPending, isError, isFetching, refetch } = useHonorInstructorProposals({
    status,
    page,
    limit: PAGE_SIZE,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Resolving the last row of a page > 1 leaves it empty: step back (render-phase adjustment).
  if (data && page > totalPages) setPage(totalPages);

  const formatDate = (value?: string | null) =>
    value ? formatDateValue(value) : "—";

  function selectStatus(next: HonorInstructorProposalQueueStatus) {
    setStatus(next);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1" role="group" aria-label={t("filter.label")}>
          {STATUSES.map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={status === value ? "default" : "outline"}
              aria-pressed={status === value}
              onClick={() => selectStatus(value)}
            >
              {t(`filter.${value}`)}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {!isPending && !isError && (
            <p className="text-sm text-muted-foreground">{t("count", { count: total })}</p>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? "animate-spin" : undefined} aria-hidden="true" />
            {t("refresh")}
          </Button>
        </div>
      </div>

      {isPending && (
        <div className="flex flex-col gap-2" role="status" aria-label={t("loading")}>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>{t("loadError.title")}</AlertTitle>
          <AlertDescription>
            <p>{t("loadError.description")}</p>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void refetch()}>
              {t("loadError.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!isPending && !isError && items.length === 0 && (
        <EmptyState icon={Inbox} title={t(`empty.${status}.title`)} description={t(`empty.${status}.description`)} />
      )}

      {!isPending && !isError && items.length > 0 && (
        <Card className="py-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columns.member")}</TableHead>
                    <TableHead>{t("columns.honor")}</TableHead>
                    <TableHead>{t("columns.current")}</TableHead>
                    <TableHead>{t("columns.proposed")}</TableHead>
                    <TableHead>{t("columns.date")}</TableHead>
                    <RowActionsHead className="w-56" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((proposal) => {
                    const category = categoryName(proposal.honor);
                    const approvedAt = proposal.honor_approved_at ?? proposal.honor?.approved_at;
                    return (
                      <TableRow key={proposal.proposal_id}>
                        <TableCell className="font-medium">{proposal.member?.display_name ?? "—"}</TableCell>
                        <TableCell>
                          <div className="font-medium">{proposal.honor?.name ?? "—"}</div>
                          {category && <div className="text-xs text-muted-foreground">{category}</div>}
                          {approvedAt && (
                            <div className="text-xs text-muted-foreground">
                              {t("approvedOn", { date: formatDate(approvedAt) })}
                            </div>
                          )}
                        </TableCell>
                        <TableCell><ProposalInstructorCell instructor={proposal.current_instructor} /></TableCell>
                        <TableCell><ProposalInstructorCell instructor={proposal.proposed_instructor} /></TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(proposal.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          {proposal.status === "PENDING" ? (
                            <RowActions
                              label={proposal.member?.display_name ?? proposal.honor?.name ?? "—"}
                              actions={[]}
                              primary={
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setDecision({ proposal, action: "reject" })}
                                  >
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
                              <StatusBadge
                                intent={STATUS_INTENT[proposal.status] ?? "neutral"}
                                label={t(`status.${proposal.status}`)}
                              />
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
            </div>
          </CardContent>
        </Card>
      )}

      {!isPending && !isError && total > PAGE_SIZE && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">{t("pagination.pageOf", { page, totalPages })}</span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={page <= 1}
            aria-label={t("pagination.prev")}
            onClick={() => setPage((current) => current - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={page >= totalPages}
            aria-label={t("pagination.next")}
            onClick={() => setPage((current) => current + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      )}

      {decision && (
        <ProposalDecisionDialog
          key={`${decision.proposal.proposal_id}:${decision.action}`}
          proposal={decision.proposal}
          action={decision.action}
          onClose={() => setDecision(null)}
        />
      )}
    </div>
  );
}
