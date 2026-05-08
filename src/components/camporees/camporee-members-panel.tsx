"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, UserMinus, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
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

function MemberStatusBadge({ status, t }: { status?: string | null; t: ReturnType<typeof useTranslations<"camporees">> }) {
  if (!status) {
    return <StatusBadge intent="neutral" label="—" className="text-xs" />;
  }

  const normalized = status.toLowerCase();

  if (normalized === "approved" || normalized === "registered") {
    return <StatusBadge intent="success" label={normalized === "registered" ? t("membersPanel.statusRegistered") : t("membersPanel.statusApproved")} />;
  }

  if (normalized === "pending_approval") {
    return <StatusBadge intent="warning" label={t("membersPanel.statusPending")} />;
  }

  if (normalized === "rejected") {
    return <StatusBadge intent="destructive" label={t("membersPanel.statusRejected")} />;
  }

  if (normalized === "cancelled" || normalized === "cancelado") {
    return <StatusBadge intent="destructive" label={t("membersPanel.statusCancelled")} />;
  }

  return (
    <StatusBadge intent="neutral" label={status} className="text-xs capitalize" />
  );
}

// ─── Insurance badge ───────────────────────────────────────────────────────────

function InsuranceBadge({ status, t }: { status?: string | null; t: ReturnType<typeof useTranslations<"camporees">> }) {
  if (!status) {
    return <StatusBadge intent="warning" label={t("membersPanel.insuranceNone")} />;
  }

  const isVerified =
    status.toLowerCase() === "verified" ||
    status.toLowerCase() === "activo" ||
    status.toLowerCase() === "active";

  if (isVerified) {
    return <StatusBadge intent="success" label={t("membersPanel.insuranceVerified")} />;
  }

  return <StatusBadge intent="warning" label={t("membersPanel.insurancePending")} />;
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
          ? t("membersPanel.removedWithName", { name: userName })
          : t("membersPanel.removedGeneric"),
      );
      onMembersChange();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : t("membersPanel.errorRemove");
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
          ? t("membersPanel.approvedWithName", { name: member.name })
          : t("membersPanel.approvedGeneric"),
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
    if (!memberId) throw new Error(t("membersPanel.errorNoMemberId"));
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
        title={t("membersPanel.emptyTitle")}
        description={t("membersPanel.emptyDescription")}
      />
    );
  }

  const dialogMemberName = dialog?.member.name ?? dialog?.member.user_id ?? t("membersPanel.fallbackMember");

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("membersPanel.colMember")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("membersPanel.colClub")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("membersPanel.colStatus")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("membersPanel.colType")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("membersPanel.colInsurance")}
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
                    <MemberStatusBadge status={member.status} t={t} />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    {member.camporee_type && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {member.camporee_type === "local" ? t("membersPanel.typeLocal") : t("membersPanel.typeUnion")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <InsuranceBadge status={member.insurance_status} t={t} />
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
                                aria-label={t("membersPanel.approveLabel")}
                              >
                                {isApproving ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="size-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("membersPanel.approveLabel")}</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDialog({ member, mode: "reject" })}
                                aria-label={t("membersPanel.rejectLabel")}
                              >
                                <XCircle className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("membersPanel.rejectLabel")}</TooltipContent>
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
                              aria-label={t("membersPanel.removeLabel")}
                              className="text-destructive hover:text-destructive"
                            >
                              <UserMinus className="size-3.5" />
                              <span className="sr-only">{t("membersPanel.removeLabel")}</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("membersPanel.removeLabel")}</TooltipContent>
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
          entityLabel={t("membersPanel.entityLabel")}
          entityName={dialogMemberName}
          onOpenChange={(open) => { if (!open) setDialog(null); }}
          onConfirm={handleRejectConfirm}
          onSuccess={() => { setDialog(null); onMembersChange(); }}
        />
      )}
    </>
  );
}
