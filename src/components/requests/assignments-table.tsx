"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UserCog } from "lucide-react";
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
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                {t("assignments.table.columns.targetUser")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                {t("assignments.table.columns.section")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                {t("assignments.table.columns.roleToAssign")}
              </TableHead>
              <TableHead className="hidden xl:table-cell h-9 px-3 text-xs font-medium text-muted-foreground">
                {t("assignments.table.columns.requestedBy")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                {t("assignments.table.columns.status")}
              </TableHead>
              <TableHead className="hidden xl:table-cell h-9 px-3 text-xs font-medium text-muted-foreground">
                {t("assignments.table.columns.date")}
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
                    {getUserName(req.target_user)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {req.section?.name ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {req.role_to_assign ?? "—"}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {getUserName(req.requested_by)}
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
                        label={getUserName(req.target_user)}
                        actions={[]}
                        primary={
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDialog({ request: req, action: "rejected" })}
                              aria-label={t("assignments.table.actions.rejectAriaLabel")}
                            >
                              {t("assignments.table.actions.reject")}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setDialog({ request: req, action: "approved" })}
                              aria-label={t("assignments.table.actions.approveAriaLabel")}
                            >
                              {t("assignments.table.actions.approve")}
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
