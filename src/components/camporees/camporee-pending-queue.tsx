"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import {
  approveCamporeeClub,
  approveCamporeeMember,
  approveUnionCamporeeClub,
  approveUnionCamporeeMember,
  rejectCamporeeClub,
  rejectCamporeeMember,
  rejectUnionCamporeeClub,
  rejectUnionCamporeeMember,
  type CamporeeClub,
  type CamporeeMember,
  type PendingApprovals,
} from "@/lib/api/camporees";
import { normalizeCamporeeClubs } from "@/lib/camporees/club-display";
import { normalizeCamporeeMembers } from "@/lib/camporees/member-display";

type Target =
  | { type: "member"; row: CamporeeMember; name: string }
  | { type: "club"; row: CamporeeClub; name: string };

type InsuranceKey = "verified" | "pending" | "expired" | "none";

function insuranceKey(status?: string | null): InsuranceKey {
  if (!status) return "none";
  const normalized = status.toLowerCase();
  if (["verified", "activo", "active"].includes(normalized)) return "verified";
  if (["expired", "vencido"].includes(normalized)) return "expired";
  return "pending";
}

export interface CamporeePendingQueueProps {
  camporeeId: number;
  isUnionCamporee: boolean;
  pending: PendingApprovals;
  /** Called after an approval or rejection so counts and lists refresh. */
  onChanged: () => void;
}

/**
 * What waits for approval, first thing in Inscripciones. Approving confirms
 * (the registration starts to count for payments and the agenda); rejecting
 * asks for a reason that stays in the audit trail.
 */
export function CamporeePendingQueue({
  camporeeId,
  isUnionCamporee,
  pending,
  onChanged,
}: CamporeePendingQueueProps) {
  const t = useTranslations("evaluation.camporees.pending");
  const tm = useTranslations("camporees.membersPanel");
  const tc = useTranslations("camporees");
  const tcl = useTranslations("camporees.clubsPanel");
  const [approving, setApproving] = useState<Target | null>(null);
  const [rejecting, setRejecting] = useState<Target | null>(null);

  const members = normalizeCamporeeMembers(pending.members).map(
    (row): Target => ({ type: "member", row, name: row.name?.trim() || row.user_id }),
  );
  const clubs = normalizeCamporeeClubs(pending.clubs).map(
    (row): Target => ({
      type: "club",
      row,
      name: row.section_name ?? row.club_name ?? String(row.camporee_club_id),
    }),
  );

  const insuranceLabels: Record<InsuranceKey, string> = {
    verified: tm("insuranceVerified"),
    pending: tm("insurancePending"),
    expired: tm("insuranceExpired"),
    none: tm("insuranceNone"),
  };

  async function approve(target: Target) {
    try {
      if (target.type === "member") {
        const id = target.row.camporee_member_id;
        if (!id) throw new Error(tm("errorNoMemberId"));
        if (isUnionCamporee) await approveUnionCamporeeMember(camporeeId, id);
        else await approveCamporeeMember(camporeeId, id);
      } else if (isUnionCamporee) {
        await approveUnionCamporeeClub(camporeeId, target.row.camporee_club_id);
      } else {
        await approveCamporeeClub(camporeeId, target.row.camporee_club_id);
      }
    } catch (error) {
      throw new Error(
        error instanceof Error && error.message.trim()
          ? error.message
          : target.type === "member"
            ? tc("errors.approve_member")
            : tc("errors.approve_club"),
      );
    }
    toast.success(
      target.type === "member"
        ? tm("approvedWithName", { name: target.name })
        : tcl("approvedWithName", { name: target.name }),
    );
    onChanged();
  }

  async function reject(target: Target, reason: string) {
    try {
      const payload = { rejection_reason: reason };
      if (target.type === "member") {
        const id = target.row.camporee_member_id;
        if (!id) throw new Error(tm("errorNoMemberId"));
        if (isUnionCamporee) await rejectUnionCamporeeMember(camporeeId, id, payload);
        else await rejectCamporeeMember(camporeeId, id, payload);
      } else if (isUnionCamporee) {
        await rejectUnionCamporeeClub(camporeeId, target.row.camporee_club_id, payload);
      } else {
        await rejectCamporeeClub(camporeeId, target.row.camporee_club_id, payload);
      }
    } catch (error) {
      toast.error(error instanceof Error && error.message.trim() ? error.message : t("rejectFailed"));
      return;
    }
    toast.success(t("rejected", { name: target.name }));
    setRejecting(null);
    onChanged();
  }

  if (members.length === 0 && clubs.length === 0) {
    return <EmptyState icon={Users} title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  function decisionButtons(target: Target) {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setRejecting(target)}>
          {t("reject")}
        </Button>
        <Button size="sm" onClick={() => setApproving(target)}>
          {t("approve")}
        </Button>
      </>
    );
  }

  return (
    <div className="space-y-6">
      {members.length > 0 && (
        <section aria-labelledby="pending-members" className="space-y-2">
          <h3 id="pending-members" className="text-sm font-medium">
            {t("membersTitle", { count: members.length })}
          </h3>
          <DataTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                    {tm("colMember")}
                  </TableHead>
                  <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                    {tm("colClub")}
                  </TableHead>
                  <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                    {tm("colInsurance")}
                  </TableHead>
                  <RowActionsHead className="h-9 w-56 px-3" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((target) => {
                  const member = target.row as CamporeeMember;
                  return (
                    <TableRow key={member.user_id}>
                      <TableCell className="px-3 py-2.5 text-sm font-medium">{target.name}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-muted-foreground">
                        {member.club_name ?? "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <ExceptionStatus
                          value={insuranceKey(member.insurance_status)}
                          normal={["verified"]}
                          labels={insuranceLabels}
                          intents={{ pending: "warning", expired: "destructive", none: "warning" }}
                        />
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <RowActions
                          label={target.name}
                          actions={[]}
                          primary={member.camporee_member_id ? decisionButtons(target) : undefined}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </DataTableShell>
        </section>
      )}

      {clubs.length > 0 && (
        <section aria-labelledby="pending-clubs" className="space-y-2">
          <h3 id="pending-clubs" className="text-sm font-medium">
            {t("clubsTitle", { count: clubs.length })}
          </h3>
          <DataTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                    {tcl("colSection")}
                  </TableHead>
                  <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                    {tcl("colRegisteredBy")}
                  </TableHead>
                  <RowActionsHead className="h-9 w-56 px-3" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {clubs.map((target) => {
                  const club = target.row as CamporeeClub;
                  return (
                    <TableRow key={club.camporee_club_id}>
                      <TableCell className="px-3 py-2.5 text-sm">
                        <span className="font-medium">{target.name}</span>
                        {club.club_name && club.section_name && (
                          <span className="block text-xs text-muted-foreground">{club.club_name}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-muted-foreground">
                        {club.registered_by_name ?? "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <RowActions label={target.name} actions={[]} primary={decisionButtons(target)} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </DataTableShell>
        </section>
      )}

      <ConfirmDialog
        open={approving !== null}
        onOpenChange={(open) => {
          if (!open) setApproving(null);
        }}
        title={t("approveTitle", { name: approving?.name ?? "" })}
        description={t("approveDescription")}
        confirmLabel={t("approve")}
        onConfirm={async () => {
          if (approving) await approve(approving);
        }}
      />

      <ReasonDialog
        open={rejecting !== null}
        onOpenChange={(open) => {
          if (!open) setRejecting(null);
        }}
        title={t("rejectTitle", { name: rejecting?.name ?? "" })}
        description={t("rejectDescription")}
        confirmLabel={t("reject")}
        onConfirm={async (reason) => {
          if (rejecting) await reject(rejecting, reason);
        }}
      />
    </div>
  );
}
