"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  XCircle,
  Award,
  History,
  Sparkles,
  Loader2,
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
import { PipelineStatusBadge } from "@/components/investiture/pipeline-status-badge";
import { PipelineHistoryDialog } from "@/components/investiture/pipeline-history-dialog";
import type { PipelineRejectDialogProps } from "@/components/investiture/pipeline-reject-dialog";
import type { BulkActionBarProps } from "@/components/investiture/bulk-action-bar";

// Deferred: PipelineRejectDialog and BulkActionBar both import zodResolver + zod
// (~103 KB compressed). Reject dialog requires a row action click;
// BulkActionBar only appears after selecting pipeline rows.
const PipelineRejectDialog = dynamic<PipelineRejectDialogProps>(
  () =>
    import("@/components/investiture/pipeline-reject-dialog").then(
      (m) => m.PipelineRejectDialog
    ),
  { ssr: false, loading: () => null }
);

const BulkActionBar = dynamic<BulkActionBarProps>(
  () =>
    import("@/components/investiture/bulk-action-bar").then(
      (m) => m.BulkActionBar
    ),
  { ssr: false, loading: () => null }
);
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";
import {
  pipelineClubApprove,
  pipelineCoordinatorApprove,
  pipelineFieldApprove,
  pipelineInvest,
  type PipelineEnrollment,
  type PipelineStatus,
} from "@/lib/api/investiture";
import { ApiError } from "@/lib/api/client";
import { useFormatDate } from "@/lib/format-locale";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMemberName(e: PipelineEnrollment): string {
  const u = e.user;
  if (!u) return `Inscripción #${e.enrollment_id}`;
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return full || u.email || `Inscripción #${e.enrollment_id}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DialogState =
  | { type: "reject"; enrollment: PipelineEnrollment }
  | { type: "history"; enrollment: PipelineEnrollment }
  | null;

interface PipelineTableProps {
  enrollments: PipelineEnrollment[];
  onRefresh: () => void;
}

type PipelineCaps = {
  clubApprove: boolean;
  coordinatorApprove: boolean;
  fieldApprove: boolean;
  invest: boolean;
  reject: boolean;
};

function canApproveStatus(status: PipelineStatus, caps: PipelineCaps): boolean {
  if (status === "SUBMITTED") return caps.clubApprove;
  if (status === "CLUB_APPROVED") return caps.coordinatorApprove;
  if (status === "COORDINATOR_APPROVED") return caps.fieldApprove;
  return false;
}

function canInvestStatus(status: PipelineStatus, caps: PipelineCaps): boolean {
  return status === "FIELD_APPROVED" && caps.invest;
}

function canRejectStatus(status: PipelineStatus, caps: PipelineCaps): boolean {
  if (status === "INVESTED" || status === "REJECTED") return false;
  return caps.reject;
}

function isSelectable(status: PipelineStatus, caps: PipelineCaps): boolean {
  return (
    canApproveStatus(status, caps) ||
    canInvestStatus(status, caps) ||
    canRejectStatus(status, caps)
  );
}

async function runApprove(enrollmentId: number, status: PipelineStatus): Promise<void> {
  if (status === "SUBMITTED") {
    await pipelineClubApprove(enrollmentId);
    return;
  }
  if (status === "CLUB_APPROVED") {
    await pipelineCoordinatorApprove(enrollmentId);
    return;
  }
  if (status === "COORDINATOR_APPROVED") {
    await pipelineFieldApprove(enrollmentId);
    return;
  }
}

// ─── Row actions ─────────────────────────────────────────────────────────────

interface RowActionsProps {
  enrollment: PipelineEnrollment;
  caps: PipelineCaps;
  onApproved: () => void;
  onInvested: () => void;
  onReject: () => void;
  onHistory: () => void;
}

function RowActions({
  enrollment,
  caps,
  onApproved,
  onInvested,
  onReject,
  onHistory,
}: RowActionsProps) {
  const t = useTranslations("investiture");
  const [approving, setApproving] = useState(false);
  const [investing, setInvesting] = useState(false);

  const status = enrollment.status;
  const showApprove = canApproveStatus(status, caps);
  const showInvest = canInvestStatus(status, caps);
  const showReject = canRejectStatus(status, caps);

  async function handleApprove() {
    setApproving(true);
    try {
      await runApprove(enrollment.enrollment_id, status);
      toast.success(t("toasts.approved"));
      onApproved();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : t("errors.approve");
      toast.error(message);
    } finally {
      setApproving(false);
    }
  }

  async function handleInvest() {
    setInvesting(true);
    try {
      await pipelineInvest(enrollment.enrollment_id);
      toast.success(t("toasts.invested"));
      onInvested();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : t("errors.invest");
      toast.error(message);
    } finally {
      setInvesting(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {/* History — always visible */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onHistory}
            aria-label="Ver historial"
          >
            <History className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Ver historial</TooltipContent>
      </Tooltip>

      {/* Approve — role-gated */}
      {showApprove && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-success hover:bg-success/10 hover:text-success"
              onClick={handleApprove}
              disabled={approving}
              aria-label="Aprobar"
            >
              {approving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Aprobar</TooltipContent>
        </Tooltip>
      )}

      {/* Invest — field/admin when FIELD_APPROVED */}
      {showInvest && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-primary hover:bg-primary/10 hover:text-primary"
              onClick={handleInvest}
              disabled={investing}
              aria-label="Marcar como investido"
            >
              {investing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Award className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Marcar como investido</TooltipContent>
        </Tooltip>
      )}

      {/* Reject */}
      {showReject && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onReject}
              aria-label="Rechazar"
            >
              <XCircle className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Rechazar</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PipelineTable({
  enrollments,
  onRefresh,
}: PipelineTableProps) {
  const formatDate = useFormatDate();
  const { canCapability } = useScreenAccess();
  const caps: PipelineCaps = {
    clubApprove: canCapability("investiture-pipeline", "club_approve"),
    coordinatorApprove: canCapability("investiture-pipeline", "coordinator_approve"),
    fieldApprove: canCapability("investiture-pipeline", "field_approve"),
    invest: canCapability("investiture-pipeline", "invest"),
    reject: canCapability("investiture-pipeline", "reject"),
  };
  const [dialog, setDialog] = useState<DialogState>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  function closeDialog() {
    setDialog(null);
  }

  // ── Selection helpers ──────────────────────────────────────────────────────

  /** Only enrollments actionable by this role participate in bulk selection */
  const selectableEnrollments = enrollments.filter((e) =>
    isSelectable(e.status, caps),
  );

  const allSelected =
    selectableEnrollments.length > 0 &&
    selectableEnrollments.every((e) => selectedIds.has(e.enrollment_id));

  const someSelected =
    !allSelected && selectableEnrollments.some((e) => selectedIds.has(e.enrollment_id));

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(selectableEnrollments.map((e) => e.enrollment_id)));
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

  // Derive the dominant status of the selection (all selected items share a status
  // when the user is on a filtered tab; on "ALL" tab it may be mixed — we pass null
  // to the action bar which hides the approve button).
  const selectedEnrollments = enrollments.filter((e) =>
    selectedIds.has(e.enrollment_id),
  );
  const uniqueStatuses = new Set(selectedEnrollments.map((e) => e.status));
  const selectedStatus: PipelineStatus | null =
    uniqueStatuses.size === 1 ? [...uniqueStatuses][0] : null;

  if (enrollments.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Sin investiduras en esta etapa"
        description="No hay solicitudes de investidura en este estado."
      />
    );
  }

  const activeEnrollment = dialog?.enrollment ?? null;
  const memberName = activeEnrollment ? getMemberName(activeEnrollment) : "";

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Bulk-select all */}
              <TableHead className="h-9 w-10 px-3">
                {selectableEnrollments.length > 0 && (
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                    aria-label="Seleccionar todo"
                  />
                )}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Miembro
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Clase
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Club
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Sección
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Enviado
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Estado
              </TableHead>
              <TableHead className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((enrollment) => {
              const isSelected = selectedIds.has(enrollment.enrollment_id);
              const selectable = isSelectable(enrollment.status, caps);

              return (
                <TableRow
                  key={enrollment.enrollment_id}
                  className={`hover:bg-muted/30 ${isSelected ? "bg-muted/50" : ""}`}
                >
                  {/* Checkbox cell */}
                  <TableCell className="px-3 py-2.5 align-middle">
                    {selectable ? (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() =>
                          toggleRow(enrollment.enrollment_id, selectable)
                        }
                        aria-label={`Seleccionar ${getMemberName(enrollment)}`}
                      />
                    ) : (
                      <span className="inline-block size-4" />
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <span className="font-medium">{getMemberName(enrollment)}</span>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {enrollment.class?.name ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {enrollment.club?.name ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {enrollment.section?.name ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                    {enrollment.submitted_at ? formatDate(enrollment.submitted_at) : "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <PipelineStatusBadge status={enrollment.status} />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <RowActions
                      enrollment={enrollment}
                      caps={caps}
                      onApproved={() => { onRefresh(); }}
                      onInvested={() => { onRefresh(); }}
                      onReject={() => setDialog({ type: "reject", enrollment })}
                      onHistory={() => setDialog({ type: "history", enrollment })}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Reject dialog */}
      {dialog?.type === "reject" && (
        <PipelineRejectDialog
          open
          enrollmentId={dialog.enrollment.enrollment_id}
          memberName={memberName}
          onOpenChange={(open) => { if (!open) closeDialog(); }}
          onSuccess={() => { closeDialog(); onRefresh(); }}
        />
      )}

      {/* History dialog */}
      {dialog?.type === "history" && (
        <PipelineHistoryDialog
          open
          enrollmentId={dialog.enrollment.enrollment_id}
          memberName={memberName}
          onOpenChange={(open) => { if (!open) closeDialog(); }}
        />
      )}

      {/* Bulk action bar — shown only when there is a selection */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedIds={[...selectedIds]}
          selectedStatus={selectedStatus}
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
