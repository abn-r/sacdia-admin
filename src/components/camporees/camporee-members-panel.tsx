"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, UserMinus, Users, XCircle } from "lucide-react";
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
  removeCamporeeMember,
  approveCamporeeMember,
  rejectCamporeeMember,
  approveUnionCamporeeMember,
  rejectUnionCamporeeMember,
} from "@/lib/api/camporees";
import type { CamporeeMember } from "@/lib/api/camporees";
import {
  CamporeeApprovalDialog,
  type ApprovalDialogMode,
} from "@/components/camporees/camporee-approval-dialog";
import { useTranslations } from "next-intl";
import { ApiError } from "@/lib/api/client";

// ─── Member status badge ───────────────────────────────────────────────────────

function MemberStatusBadge({ status }: { status?: string | null }) {
  if (!status) {
    return <Badge variant="secondary" className="text-xs">—</Badge>;
  }

  const normalized = status.toLowerCase();

  if (normalized === "approved" || normalized === "registered") {
    return <Badge variant="success">{normalized === "registered" ? "Registrado" : "Aprobado"}</Badge>;
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

// ─── Insurance badge ───────────────────────────────────────────────────────────

function InsuranceBadge({ status }: { status?: string | null }) {
  if (!status) {
    return <Badge variant="warning">Sin seguro</Badge>;
  }

  const isVerified =
    status.toLowerCase() === "verified" ||
    status.toLowerCase() === "activo" ||
    status.toLowerCase() === "active";

  if (isVerified) {
    return <Badge variant="success">Seguro verificado</Badge>;
  }

  return <Badge variant="warning">Seguro pendiente</Badge>;
}

// ─── Dialog state ─────────────────────────────────────────────────────────────

type DialogState = {
  member: CamporeeMember;
  mode: ApprovalDialogMode;
} | null;

// ─── Props ─────────────────────────────────────────────────────────────────────

interface CamporeeMembersPanelProps {
  camporeeId: number;
  members: CamporeeMember[];
  onMembersChange: () => void;
  isUnionCamporee?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CamporeeMembersPanel({
  camporeeId,
  members,
  onMembersChange,
  isUnionCamporee = false,
}: CamporeeMembersPanelProps) {
  const t = useTranslations("camporees");
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [approvingMemberId, setApprovingMemberId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  async function handleRemove(userId: string, userName?: string) {
    if (removingUserId) return;
    setRemovingUserId(userId);
    try {
      await removeCamporeeMember(camporeeId, userId);
      toast.success(
        userName
          ? `${userName} fue removido del camporee`
          : "Miembro removido del camporee",
      );
      onMembersChange();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo remover al miembro del camporee";
      toast.error(message);
    } finally {
      setRemovingUserId(null);
    }
  }

  async function handleApprove(member: CamporeeMember) {
    const memberId = member.camporee_member_id;
    if (!memberId || approvingMemberId !== null) return;
    setApprovingMemberId(memberId);
    try {
      if (isUnionCamporee) {
        await approveUnionCamporeeMember(camporeeId, memberId);
      } else {
        await approveCamporeeMember(camporeeId, memberId);
      }
      toast.success(
        member.name
          ? `Inscripcion de "${member.name}" aprobada`
          : "Inscripcion de miembro aprobada",
      );
      onMembersChange();
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : t("errors.approve_member");
      toast.error(message);
    } finally {
      setApprovingMemberId(null);
    }
  }

  async function handleRejectConfirm(rejectionReason?: string) {
    if (!dialog) return;
    const memberId = dialog.member.camporee_member_id;
    if (!memberId) throw new Error("ID de inscripcion no disponible");
    const payload = { rejection_reason: rejectionReason };
    if (isUnionCamporee) {
      await rejectUnionCamporeeMember(camporeeId, memberId, payload);
    } else {
      await rejectCamporeeMember(camporeeId, memberId, payload);
    }
  }

  if (members.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Sin miembros registrados"
        description="No hay miembros inscritos en este camporee todavia."
      />
    );
  }

  const dialogMemberName = dialog?.member.name ?? dialog?.member.user_id ?? "Miembro";

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
                Club
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Estado
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Tipo
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Seguro
              </TableHead>
              <TableHead className="h-9 w-28 px-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const statusNorm = member.status?.toLowerCase();
              const isPending = statusNorm === "pending_approval";
              const isRemovable = statusNorm !== "cancelled" && statusNorm !== "cancelado" && statusNorm !== "rejected";
              const isApproving =
                member.camporee_member_id != null &&
                approvingMemberId === member.camporee_member_id;
              const canApprove = isPending && member.camporee_member_id != null;

              return (
                <TableRow key={member.user_id} className="hover:bg-muted/30">
                  <TableCell className="px-3 py-2.5 align-middle">
                    <span className="text-sm font-medium">
                      {member.name ?? member.user_id}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {member.club_name ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <MemberStatusBadge status={member.status} />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    {member.camporee_type && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {member.camporee_type === "local" ? "Local" : "Union"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <InsuranceBadge status={member.insurance_status} />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <div className="flex items-center justify-end gap-1">
                      {canApprove && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-success hover:bg-success/10 hover:text-success"
                                onClick={() => handleApprove(member)}
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
                                onClick={() => setDialog({ member, mode: "reject" })}
                                aria-label="Rechazar inscripcion"
                              >
                                <XCircle className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Rechazar inscripcion</TooltipContent>
                          </Tooltip>
                        </>
                      )}

                      {isRemovable && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleRemove(member.user_id, member.name)}
                              disabled={removingUserId === member.user_id}
                              aria-label="Remover del camporee"
                              className="text-destructive hover:text-destructive"
                            >
                              <UserMinus className="size-3.5" />
                              <span className="sr-only">Remover</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remover del camporee</TooltipContent>
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
          entityLabel="Miembro"
          entityName={dialogMemberName}
          onOpenChange={(open) => { if (!open) setDialog(null); }}
          onConfirm={handleRejectConfirm}
          onSuccess={() => { setDialog(null); onMembersChange(); }}
        />
      )}
    </>
  );
}
