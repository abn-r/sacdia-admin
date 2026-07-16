"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle, ArrowRightLeft } from "lucide-react";
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
import { RequestStatusBadge } from "@/components/requests/request-status-badge";
import { RequestReviewDialog } from "@/components/requests/request-review-dialog";
import {
  reviewTransferRequest,
  type TransferRequest,
  type ReviewAction,
  type ReviewRequestPayload,
} from "@/lib/api/requests";
import { useFormatDate } from "@/lib/format-locale";
import { STAGGER_CLASSES, getStaggerStyle } from "@/lib/animations";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUserName(user?: TransferRequest["requester"]): string {
  if (!user) return "—";
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return full || user.email || "—";
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DialogState = {
  request: TransferRequest;
  action: ReviewAction;
} | null;

interface TransfersTableProps {
  requests: TransferRequest[];
  onRefresh: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TransfersTable({ requests, onRefresh }: TransfersTableProps) {
  const t = useTranslations("requests");
  const formatDate = useFormatDate();
  const [dialog, setDialog] = useState<DialogState>(null);

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={ArrowRightLeft}
        title={t("transfers.table.empty.title")}
        description={t("transfers.table.empty.description")}
      />
    );
  }

  const activeRequest = dialog?.request ?? null;
  const requesterName = activeRequest ? getUserName(activeRequest.requester) : "";

  async function handleReview(payload: ReviewRequestPayload) {
    if (!activeRequest) return;
    await reviewTransferRequest(activeRequest.request_id, payload);
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("transfers.table.columns.requester")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("transfers.table.columns.from")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("transfers.table.columns.to")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("transfers.table.columns.reason")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("transfers.table.columns.status")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("transfers.table.columns.date")}
              </TableHead>
              <TableHead className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("transfers.table.columns.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req, index) => {
              const isPending = req.status === "PENDING";
              return (
                <TableRow key={String(req.request_id)} className={`hover:bg-muted/30 ${STAGGER_CLASSES}`} style={getStaggerStyle(index)}>
                  <TableCell className="px-3 py-2.5 align-middle font-medium">
                    {getUserName(req.requester)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {req.from_section?.name ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {req.to_section?.name ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle max-w-48">
                    <span className="line-clamp-2 text-sm text-muted-foreground">
                      {req.reason ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <RequestStatusBadge status={req.status} />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                    {req.created_at ? formatDate(req.created_at) : "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <div className="flex items-center justify-end gap-1">
                      {isPending && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-success hover:bg-success/10 hover:text-success"
                                onClick={() => setDialog({ request: req, action: "approved" })}
                                aria-label={t("transfers.table.actions.approveAriaLabel")}
                              >
                                <CheckCircle2 className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("transfers.table.actions.approve")}</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDialog({ request: req, action: "rejected" })}
                                aria-label={t("transfers.table.actions.rejectAriaLabel")}
                              >
                                <XCircle className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("transfers.table.actions.reject")}</TooltipContent>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {dialog && (
        <RequestReviewDialog
          open
          action={dialog.action}
          title={
            dialog.action === "approved"
              ? t("transfers.dialog.approveTitle")
              : t("transfers.dialog.rejectTitle")
          }
          description={
            dialog.action === "approved"
              ? t("transfers.dialog.approveDescription", { name: requesterName })
              : t("transfers.dialog.rejectDescription", { name: requesterName })
          }
          onOpenChange={(open) => { if (!open) setDialog(null); }}
          onSubmit={handleReview}
          onSuccess={() => { setDialog(null); onRefresh(); }}
        />
      )}
    </>
  );
}
