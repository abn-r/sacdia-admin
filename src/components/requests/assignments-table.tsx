"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle, UserCog } from "lucide-react";
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
  reviewAssignmentRequest,
  type AssignmentRequest,
  type ReviewAction,
  type ReviewRequestPayload,
} from "@/lib/api/requests";
import { useFormatDate } from "@/lib/format-locale";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUserName(user?: AssignmentRequest["target_user"] | AssignmentRequest["requested_by"]): string {
  if (!user) return "—";
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return full || user.email || "—";
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DialogState = {
  request: AssignmentRequest;
  action: ReviewAction;
} | null;

interface AssignmentsTableProps {
  requests: AssignmentRequest[];
  onRefresh: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AssignmentsTable({ requests, onRefresh }: AssignmentsTableProps) {
  const t = useTranslations("requests");
  const formatDate = useFormatDate();
  const [dialog, setDialog] = useState<DialogState>(null);

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={UserCog}
        title={t("assignments.table.empty.title")}
        description={t("assignments.table.empty.description")}
      />
    );
  }

  const activeRequest = dialog?.request ?? null;
  const targetName = activeRequest ? getUserName(activeRequest.target_user) : "";

  async function handleReview(payload: ReviewRequestPayload) {
    if (!activeRequest) return;
    await reviewAssignmentRequest(activeRequest.request_id, payload);
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("assignments.table.columns.targetUser")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("assignments.table.columns.section")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("assignments.table.columns.roleToAssign")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("assignments.table.columns.requestedBy")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("assignments.table.columns.status")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("assignments.table.columns.date")}
              </TableHead>
              <TableHead className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("assignments.table.columns.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req) => {
              const isPending = req.status === "PENDING";
              return (
                <TableRow key={String(req.request_id)} className="hover:bg-muted/30">
                  <TableCell className="px-3 py-2.5 align-middle font-medium">
                    {getUserName(req.target_user)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {req.section?.name ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {req.role_to_assign ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {getUserName(req.requested_by)}
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
                                aria-label={t("assignments.table.actions.approveAriaLabel")}
                              >
                                <CheckCircle2 className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("assignments.table.actions.approve")}</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDialog({ request: req, action: "rejected" })}
                                aria-label={t("assignments.table.actions.rejectAriaLabel")}
                              >
                                <XCircle className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("assignments.table.actions.reject")}</TooltipContent>
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
              ? t("assignments.dialog.approveTitle")
              : t("assignments.dialog.rejectTitle")
          }
          description={
            dialog.action === "approved"
              ? t("assignments.dialog.approveDescription", { name: targetName })
              : t("assignments.dialog.rejectDescription", { name: targetName })
          }
          onOpenChange={(open) => { if (!open) setDialog(null); }}
          onSubmit={handleReview}
          onSuccess={() => { setDialog(null); onRefresh(); }}
        />
      )}
    </>
  );
}
