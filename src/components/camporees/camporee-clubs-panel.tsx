"use client";

import { useState } from "react";
import { Building2, CheckCircle2, Loader2, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import {
  cancelClubEnrollment,
  approveCamporeeClub,
  rejectCamporeeClub,
  approveUnionCamporeeClub,
  rejectUnionCamporeeClub,
} from "@/lib/api/camporees";
import type { CamporeeClub } from "@/lib/api/camporees";
import {
  CamporeeApprovalDialog,
  type ApprovalDialogMode,
} from "@/components/camporees/camporee-approval-dialog";
import { ApiError } from "@/lib/api/client";

// ─── Status badge ──────────────────────────────────────────────────────────────

function ClubStatusBadge({ status }: { status?: string | null }) {
  if (!status) {
    return (
      <Badge variant="secondary" className="text-xs">
        —
      </Badge>
    );
  }

  const normalized = status.toLowerCase();

  if (normalized === "active" || normalized === "activo" || normalized === "enrolled") {
    return <Badge variant="success">Activo</Badge>;
  }

  if (normalized === "approved") {
    return <Badge variant="success">Aprobado</Badge>;
  }

  if (normalized === "pending_approval") {
    return <Badge variant="warning">Pendiente</Badge>;
  }

  if (normalized === "rejected") {
    return <Badge variant="destructive">Rechazado</Badge>;
  }

  if (normalized === "cancelled" || normalized === "cancelado") {
    return <Badge variant="destructive">Cancelado</Badge>;
  }

  return (
    <Badge variant="secondary" className="text-xs capitalize">
      {status}
    </Badge>
  );
}

// ─── Date helper ───────────────────────────────────────────────────────────────

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

// ─── Dialog state ─────────────────────────────────────────────────────────────

type DialogState = {
  club: CamporeeClub;
  mode: ApprovalDialogMode;
} | null;

// ─── Props ─────────────────────────────────────────────────────────────────────

interface CamporeeClubsPanelProps {
  camporeeId: number;
  clubs: CamporeeClub[];
  onClubsChange: () => void;
  isUnionCamporee?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CamporeeClubsPanel({
  camporeeId,
  clubs,
  onClubsChange,
  isUnionCamporee = false,
}: CamporeeClubsPanelProps) {
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  async function handleCancel(camporeeClubId: number, sectionName?: string | null) {
    if (cancellingId !== null) return;
    setCancellingId(camporeeClubId);
    try {
      await cancelClubEnrollment(camporeeId, camporeeClubId);
      toast.success(
        sectionName
          ? `Inscripcion de "${sectionName}" cancelada`
          : "Inscripcion de club cancelada",
      );
      onClubsChange();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo cancelar la inscripcion del club";
      toast.error(message);
    } finally {
      setCancellingId(null);
    }
  }

  async function handleApprove(camporeeClubId: number) {
    if (approvingId !== null) return;
    setApprovingId(camporeeClubId);
    try {
      if (isUnionCamporee) {
        await approveUnionCamporeeClub(camporeeId, camporeeClubId);
      } else {
        await approveCamporeeClub(camporeeId, camporeeClubId);
      }
      const club = clubs.find((c) => c.camporee_club_id === camporeeClubId);
      toast.success(
        club?.section_name
          ? `Inscripcion de "${club.section_name}" aprobada`
          : "Inscripcion de club aprobada",
      );
      onClubsChange();
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo aprobar la inscripcion del club";
      toast.error(message);
    } finally {
      setApprovingId(null);
    }
  }

  async function handleRejectConfirm(rejectionReason?: string) {
    if (!dialog) return;
    const payload = { rejection_reason: rejectionReason };
    if (isUnionCamporee) {
      await rejectUnionCamporeeClub(camporeeId, dialog.club.camporee_club_id, payload);
    } else {
      await rejectCamporeeClub(camporeeId, dialog.club.camporee_club_id, payload);
    }
  }

  if (clubs.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="Sin clubes inscritos"
        description="No hay clubes inscritos en este camporee todavia."
      />
    );
  }

  const dialogClubName = dialog?.club.section_name ?? `Club #${dialog?.club.camporee_club_id}`;

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Seccion
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Estado
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Registrado por
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Fecha
              </TableHead>
              <TableHead className="h-9 w-28 px-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {clubs.map((club) => {
              const statusNorm = club.status?.toLowerCase();
              const isPending = statusNorm === "pending_approval";
              const isCancellable = statusNorm !== "cancelled" && statusNorm !== "cancelado" && statusNorm !== "rejected";
              const isApproving = approvingId === club.camporee_club_id;

              return (
                <TableRow key={club.camporee_club_id} className="hover:bg-muted/30">
                  <TableCell className="px-3 py-2.5 align-middle">
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium">
                        {club.section_name ?? `Seccion #${club.club_section_id}`}
                      </span>
                      {club.club_name && (
                        <p className="text-xs text-muted-foreground">{club.club_name}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <ClubStatusBadge status={club.status} />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {club.registered_by_name ?? club.registered_by ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {formatDate(club.created_at)}
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
                                onClick={() => handleApprove(club.camporee_club_id)}
                                disabled={isApproving}
                                aria-label="Aprobar inscripcion"
                              >
                                {isApproving ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="size-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Aprobar inscripcion</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDialog({ club, mode: "reject" })}
                                aria-label="Rechazar inscripcion"
                              >
                                <XCircle className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Rechazar inscripcion</TooltipContent>
                          </Tooltip>
                        </>
                      )}

                      {isCancellable && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleCancel(club.camporee_club_id, club.section_name)}
                              disabled={cancellingId === club.camporee_club_id}
                              aria-label="Cancelar inscripcion"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                              <span className="sr-only">Cancelar</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Cancelar inscripcion</TooltipContent>
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

      {dialog && (
        <CamporeeApprovalDialog
          open
          mode={dialog.mode}
          entityLabel="Club"
          entityName={dialogClubName}
          onOpenChange={(open) => { if (!open) setDialog(null); }}
          onConfirm={handleRejectConfirm}
          onSuccess={() => { setDialog(null); onClubsChange(); }}
        />
      )}
    </>
  );
}
