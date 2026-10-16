"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRightLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RowActionsHead, RowActions } from "@/components/shared/row-actions";
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
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                {t("transfers.table.columns.requester")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                {t("transfers.table.columns.from")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                {t("transfers.table.columns.to")}
              </TableHead>
              <TableHead className="hidden xl:table-cell h-9 px-3 text-xs font-medium text-muted-foreground">
                {t("transfers.table.columns.reason")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                {t("transfers.table.columns.status")}
              </TableHead>
              <TableHead className="hidden xl:table-cell h-9 px-3 text-xs font-medium text-muted-foreground">
                {t("transfers.table.columns.date")}
              </TableHead>
              <RowActionsHead className="h-9 w-44 px-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req) => {
              const isPending = req.status === "PENDING";
              return (
                <TableRow key={String(req.request_id)} className="hover:bg-muted/30">
                  <TableCell className="px-3 py-2.5 align-middle font-medium">
                    {getUserName(req.requester)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {req.from_section?.name ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {req.to_section?.name ?? "—"}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell px-3 py-2.5 align-middle max-w-48">
                    <span className="line-clamp-2 text-sm text-muted-foreground">
                      {req.reason ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <RequestStatusBadge status={req.status} />
                  </TableCell>
                  <TableCell className="hidden xl:table-cell px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                    {req.created_at ? formatDate(req.created_at) : "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    {isPending && (
                      <RowActions
                        label={getUserName(req.requester)}
                        actions={[]}
                        primary={
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDialog({ request: req, action: "rejected" })}
                              aria-label={t("transfers.table.actions.rejectAriaLabel")}
                            >
                              {t("transfers.table.actions.reject")}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setDialog({ request: req, action: "approved" })}
                              aria-label={t("transfers.table.actions.approveAriaLabel")}
                            >
                              {t("transfers.table.actions.approve")}
                            </Button>
                          </>
                        }
                      />
                    )}
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
