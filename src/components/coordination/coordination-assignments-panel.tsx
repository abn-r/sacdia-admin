"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Power, UserPlus } from "lucide-react";
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
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { getActionErrorMessage } from "@/lib/api/action-error";
import { listAdminUsers, type AdminUser } from "@/lib/api/admin-users";
import {
  extractCoordinationConflictReason,
  updateCoordinatorAssignment,
  type CoordinationZone,
  type CoordinatorAssignment,
} from "@/lib/api/coordination";
import type { AdminClubType } from "@/lib/catalogs/club-types/types";
import {
  CoordinationAssignmentDialog,
  type CoordinatorCandidatesState,
} from "@/components/coordination/coordination-assignment-dialog";
import {
  coordinationErrorMessage,
  formatAssignmentScope,
  formatCoordinatorName,
} from "@/components/coordination/coordination-labels";

const COORDINATOR_ROLES = [
  "coordinator",
  "zone-coordinator",
  "general-coordinator",
] as const;

async function fetchCoordinatorCandidates(): Promise<AdminUser[]> {
  const results = await Promise.all(
    COORDINATOR_ROLES.map((role) => listAdminUsers({ role, active: true, limit: 100, page: 1 })),
  );
  const merged = new Map<string, AdminUser>();
  for (const result of results) {
    for (const user of result.items) merged.set(user.user_id, user);
  }
  return [...merged.values()];
}

type ClubOption = {
  club_id: number;
  name: string;
};

type CoordinationAssignmentsPanelProps = {
  localFieldId: number;
  localFieldName: string;
  zones: CoordinationZone[];
  clubTypes: AdminClubType[];
  clubs: ClubOption[];
  assignments: CoordinatorAssignment[];
  canManage: boolean;
  /** Controlled by the page header ("Nueva asignación"). */
  dialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
  onChanged: () => Promise<void>;
};

export function CoordinationAssignmentsPanel({
  localFieldId,
  localFieldName,
  zones,
  clubTypes,
  clubs,
  assignments,
  canManage,
  dialogOpen,
  onDialogOpenChange,
  onChanged,
}: CoordinationAssignmentsPanelProps) {
  const t = useTranslations("coordinationAdmin");
  const tc = useTranslations("people.community.coordination");
  const [toggling, setToggling] = useState<CoordinatorAssignment | null>(null);
  const [candidates, setCandidates] = useState<CoordinatorCandidatesState>({
    status: "idle",
    users: [],
  });
  const [attempt, setAttempt] = useState(0);
  const loadedAttempt = useRef<number | null>(null);

  // Coordinator candidates are only needed to create an assignment, so the
  // three role lookups run the first time the dialog opens (and on retry).
  useEffect(() => {
    if (!dialogOpen || !canManage || loadedAttempt.current === attempt) return;
    loadedAttempt.current = attempt;
    fetchCoordinatorCandidates()
      .then((users) => setCandidates({ status: "ready", users }))
      .catch(() => setCandidates({ status: "error", users: [] }));
  }, [dialogOpen, canManage, attempt]);

  async function confirmToggle() {
    if (!toggling) return;
    const next = !toggling.active;
    try {
      await updateCoordinatorAssignment(toggling.assignment_id, { active: next });
    } catch (error) {
      throw new Error(
        coordinationErrorMessage(
          extractCoordinationConflictReason(error),
          getActionErrorMessage(error, t("errors.generic")),
          t as unknown as (key: string) => string,
        ),
      );
    }
    toast.success(
      next ? t("success.assignmentActivated") : t("success.assignmentDeactivated"),
    );
    await onChanged();
  }

  const scopeLabel = (assignment: CoordinatorAssignment) =>
    formatAssignmentScope(
      assignment,
      t as unknown as (key: string, values?: Record<string, string | number>) => string,
    );
  const nameOf = (assignment: CoordinatorAssignment) =>
    formatCoordinatorName(assignment.users) || assignment.user_id;
  const typeLabel = (assignment: CoordinatorAssignment) =>
    assignment.assignment_type === "GENERAL"
      ? tc("assignments.types.general")
      : assignment.assignment_type === "ZONE"
        ? tc("assignments.types.zone")
        : tc("assignments.types.section");
  const statusLabels = { active: t("status.active"), inactive: t("status.inactive") };

  function rowActions(assignment: CoordinatorAssignment) {
    if (!canManage) return null;
    return (
      <RowActions
        label={nameOf(assignment)}
        actions={[
          {
            label: assignment.active
              ? tc("actions.deactivateAssignment")
              : tc("actions.activateAssignment"),
            icon: Power,
            destructive: assignment.active,
            onSelect: () => setToggling(assignment),
          },
        ]}
      />
    );
  }

  return (
    <>
      {assignments.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title={t("assignments.empty")}
          description={tc("assignments.emptyDescription")}
        >
          {canManage ? (
            <Button type="button" onClick={() => onDialogOpenChange(true)}>
              {tc("actions.newAssignment")}
            </Button>
          ) : null}
        </EmptyState>
      ) : (
        <>
          <DataTableShell className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("fields.coordinator")}</TableHead>
                  <TableHead>{t("fields.scope")}</TableHead>
                  <TableHead>{t("fields.type")}</TableHead>
                  <TableHead>{t("fields.status")}</TableHead>
                  {canManage ? <RowActionsHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.assignment_id}>
                    <TableCell className="font-medium">{nameOf(assignment)}</TableCell>
                    <TableCell>{scopeLabel(assignment)}</TableCell>
                    <TableCell>{typeLabel(assignment)}</TableCell>
                    <TableCell>
                      <ExceptionStatus
                        value={assignment.active ? "active" : "inactive"}
                        normal={["active"]}
                        labels={statusLabels}
                        intents={{ inactive: "neutral" }}
                      />
                    </TableCell>
                    {canManage ? (
                      <TableCell className="text-right">{rowActions(assignment)}</TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>

          <ul className="divide-y rounded-xl bg-card shadow-card md:hidden">
            {assignments.map((assignment) => (
              <li key={assignment.assignment_id} className="flex items-start gap-2 px-4 py-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 truncate font-medium">{nameOf(assignment)}</span>
                    <ExceptionStatus
                      value={assignment.active ? "active" : "inactive"}
                      normal={["active"]}
                      labels={statusLabels}
                      intents={{ inactive: "neutral" }}
                    />
                  </div>
                  <p className="flex flex-wrap gap-x-3 text-[13px] text-muted-foreground">
                    <span>{scopeLabel(assignment)}</span>
                    <span>{typeLabel(assignment)}</span>
                  </p>
                </div>
                {rowActions(assignment)}
              </li>
            ))}
          </ul>
        </>
      )}

      {canManage ? (
        <CoordinationAssignmentDialog
          open={dialogOpen}
          onOpenChange={onDialogOpenChange}
          localFieldId={localFieldId}
          localFieldName={localFieldName}
          zones={zones}
          clubTypes={clubTypes}
          clubs={clubs}
          candidates={candidates}
          onRetryCandidates={() => {
            setCandidates({ status: "loading", users: [] });
            setAttempt((current) => current + 1);
          }}
          onCreated={onChanged}
        />
      ) : null}

      <ConfirmDialog
        open={toggling !== null}
        onOpenChange={(next) => (next ? undefined : setToggling(null))}
        tone={toggling?.active ? "destructive" : "default"}
        title={
          toggling
            ? tc(
                toggling.active
                  ? "assignments.deactivate.title"
                  : "assignments.activate.title",
                { name: nameOf(toggling) },
              )
            : ""
        }
        description={
          toggling
            ? tc(
                toggling.active
                  ? "assignments.deactivate.description"
                  : "assignments.activate.description",
                { name: nameOf(toggling), scope: scopeLabel(toggling) },
              )
            : ""
        }
        confirmLabel={
          toggling?.active ? tc("actions.deactivateConfirm") : tc("actions.activateConfirm")
        }
        onConfirm={confirmToggle}
      />
    </>
  );
}
