"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Award,
  History,
  Star,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/shared/empty-state";
import { PipelineStatusBadge } from "@/components/investiture/pipeline-status-badge";
import { PipelineRejectDialog } from "@/components/investiture/pipeline-reject-dialog";
import { PipelineHistoryDialog } from "@/components/investiture/pipeline-history-dialog";
import {
  pipelineClubApprove,
  pipelineCoordinatorApprove,
  pipelineFieldApprove,
  pipelineInvest,
  type PipelineEnrollment,
  type PipelineStatus,
} from "@/lib/api/investiture";
import { ApiError } from "@/lib/api/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMemberName(e: PipelineEnrollment): string {
  const u = e.user;
  if (!u) return `Inscripción #${e.enrollment_id}`;
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return full || u.email || `Inscripción #${e.enrollment_id}`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "director" | "coordinator" | "field" | "admin";

type DialogState =
  | { type: "reject"; enrollment: PipelineEnrollment }
  | { type: "history"; enrollment: PipelineEnrollment }
  | null;

interface PipelineTableProps {
  enrollments: PipelineEnrollment[];
  userRole: UserRole;
  onRefresh: () => void;
}

// ─── Inline action logic ──────────────────────────────────────────────────────

function canApprove(status: PipelineStatus, role: UserRole): boolean {
  if (role === "admin") {
    return (
      status === "SUBMITTED" ||
      status === "CLUB_APPROVED" ||
      status === "COORDINATOR_APPROVED" ||
      status === "FIELD_APPROVED"
    );
  }
  if (role === "director") return status === "SUBMITTED";
  if (role === "coordinator") return status === "CLUB_APPROVED";
  if (role === "field") return status === "COORDINATOR_APPROVED";
  return false;
}

function canInvest(status: PipelineStatus, role: UserRole): boolean {
  return (
    status === "FIELD_APPROVED" && (role === "admin" || role === "field")
  );
}

function canReject(status: PipelineStatus, _role: UserRole): boolean {
  return (
    status !== "INVESTED" && status !== "REJECTED"
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
  userRole: UserRole;
  onApproved: () => void;
  onInvested: () => void;
  onReject: () => void;
  onHistory: () => void;
}

function RowActions({
  enrollment,
  userRole,
  onApproved,
  onInvested,
  onReject,
  onHistory,
}: RowActionsProps) {
  const [approving, setApproving] = useState(false);
  const [investing, setInvesting] = useState(false);

  const status = enrollment.status;
  const showApprove = canApprove(status, userRole);
  const showInvest = canInvest(status, userRole);
  const showReject = canReject(status, userRole);

  async function handleApprove() {
    setApproving(true);
    try {
      await runApprove(enrollment.enrollment_id, status);
      toast.success("Aprobado correctamente");
      onApproved();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Error al aprobar";
      toast.error(message);
    } finally {
      setApproving(false);
    }
  }

  async function handleInvest() {
    setInvesting(true);
    try {
      await pipelineInvest(enrollment.enrollment_id);
      toast.success("Marcado como investido");
      onInvested();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Error al marcar como investido";
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
  userRole,
  onRefresh,
}: PipelineTableProps) {
  const [dialog, setDialog] = useState<DialogState>(null);

  function closeDialog() {
    setDialog(null);
  }

  if (enrollments.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title="Sin investiduras en esta etapa"
        description="No hay solicitudes de investidura en este estado."
      />
    );
  }

  const activeEnrollment = dialog?.enrollment ?? null;
  const memberName = activeEnrollment ? getMemberName(activeEnrollment) : "";

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
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
            {enrollments.map((enrollment) => (
              <TableRow
                key={enrollment.enrollment_id}
                className="hover:bg-muted/30"
              >
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
                  {formatDate(enrollment.submitted_at)}
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <PipelineStatusBadge status={enrollment.status} />
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <RowActions
                    enrollment={enrollment}
                    userRole={userRole}
                    onApproved={() => { onRefresh(); }}
                    onInvested={() => { onRefresh(); }}
                    onReject={() => setDialog({ type: "reject", enrollment })}
                    onHistory={() => setDialog({ type: "history", enrollment })}
                  />
                </TableCell>
              </TableRow>
            ))}
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
    </>
  );
}
