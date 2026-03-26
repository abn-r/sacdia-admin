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
} from "@/lib/api/camporees";
import type { CamporeeMember } from "@/lib/api/camporees";
import {
  CamporeeApprovalDialog,
  type ApprovalDialogMode,
} from "@/components/camporees/camporee-approval-dialog";
import { ApiError } from "@/lib/api/client";

// ─── Insurance badge ───────────────────────────────────────────────────────────

function InsuranceBadge({ status }: { status?: string | null }) {
  if (!status) {
    return (
      <Badge
        variant="outline"
        className="border-yellow-400/50 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400"
      >
        Sin seguro
      </Badge>
    );
  }

  const isVerified =
    status.toLowerCase() === "verified" ||
    status.toLowerCase() === "activo" ||
    status.toLowerCase() === "active";

  if (isVerified) {
    return (
      <Badge
        variant="outline"
        className="border-green-400/50 bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
      >
        Seguro verificado
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="border-yellow-400/50 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400"
    >
      Seguro pendiente
    </Badge>
  );
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
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CamporeeMembersPanel({
  camporeeId,
  members,
  onMembersChange,
}: CamporeeMembersPanelProps) {
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
      await approveCamporeeMember(camporeeId, memberId);
      toast.success(
        member.name
          ? `Inscripcion de "${member.name}" aprobada`
          : "Inscripcion de miembro aprobada",
      );
      onMembersChange();
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo aprobar la inscripcion del miembro";
      toast.error(message);
    } finally {
      setApprovingMemberId(null);
    }
  }

  async function handleRejectConfirm(rejectionReason?: string) {
    if (!dialog) return;
    const memberId = dialog.member.camporee_member_id;
    if (!memberId) throw new Error("ID de inscripcion no disponible");
    await rejectCamporeeMember(camporeeId, memberId, {
      rejection_reason: rejectionReason,
    });
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
              const isPending = member.status?.toLowerCase() === "pending_approval";
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
