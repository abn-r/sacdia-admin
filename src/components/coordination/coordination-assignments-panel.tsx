"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { getActionErrorMessage } from "@/lib/api/action-error";
import { listAdminUsers, type AdminUser } from "@/lib/api/admin-users";
import { listClubSections, type ClubSection } from "@/lib/api/clubs";
import { extractItems } from "@/lib/phase-e-catalogs/fetch-helpers";
import {
  buildCoordinatorAssignmentPayload,
  createCoordinatorAssignment,
  extractCoordinationConflictReason,
  updateCoordinatorAssignment,
  type CoordinationZone,
  type CoordinatorAssignment,
  type CoordinatorAssignmentType,
} from "@/lib/api/coordination";
import type { AdminClubType } from "@/lib/catalogs/club-types/types";
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

type ClubOption = {
  club_id: number;
  name: string;
};

type CoordinationAssignmentsPanelProps = {
  localFieldId: number;
  zones: CoordinationZone[];
  clubTypes: AdminClubType[];
  clubs: ClubOption[];
  assignments: CoordinatorAssignment[];
  onChanged: () => Promise<void>;
};

export function CoordinationAssignmentsPanel({
  localFieldId,
  zones,
  clubTypes,
  clubs,
  assignments,
  onChanged,
}: CoordinationAssignmentsPanelProps) {
  const t = useTranslations("coordinationAdmin");
  const [coordinators, setCoordinators] = useState<AdminUser[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [assignmentType, setAssignmentType] =
    useState<CoordinatorAssignmentType>("GENERAL");
  const [zoneId, setZoneId] = useState<string>("");
  const [clubTypeId, setClubTypeId] = useState<string>("");
  const [clubId, setClubId] = useState<string>("");
  const [clubSectionId, setClubSectionId] = useState<string>("");
  const [sections, setSections] = useState<ClubSection[]>([]);
  const [creating, setCreating] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const activeZones = zones.filter((zone) => zone.active);
  const activeClubTypes = clubTypes.filter((clubType) => clubType.active);

  useEffect(() => {
    let cancelled = false;
    setLoadingUsers(true);

    Promise.all(
      COORDINATOR_ROLES.map((role) =>
        listAdminUsers({ role, active: true, limit: 100, page: 1 }),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        const merged = new Map<string, AdminUser>();
        for (const result of results) {
          for (const user of result.items) {
            merged.set(user.user_id, user);
          }
        }
        setCoordinators([...merged.values()]);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(getActionErrorMessage(error, t("errors.generic")));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingUsers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    if (!clubId) {
      setSections([]);
      setClubSectionId("");
      return;
    }

    let cancelled = false;
    const parsedClubId = Number(clubId);
    listClubSections(parsedClubId)
      .then((payload) => {
        if (cancelled) return;
        const rows = extractItems(payload) as ClubSection[];
        setSections(rows.filter((row) => row.active !== false));
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(getActionErrorMessage(error, t("errors.generic")));
          setSections([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clubId, t]);

  function toastFromError(error: unknown) {
    toast.error(
      coordinationErrorMessage(
        extractCoordinationConflictReason(error),
        getActionErrorMessage(error, t("errors.generic")),
        t as unknown as (key: string) => string,
      ),
    );
  }

  async function handleCreate() {
    if (!userId) {
      toast.error(t("errors.coordinatorRequired"));
      return;
    }

    if (assignmentType === "ZONE" && (!zoneId || !clubTypeId)) {
      toast.error(t("errors.assignmentScopeRequired"));
      return;
    }

    if (assignmentType === "SECTION" && !clubSectionId) {
      toast.error(t("errors.assignmentScopeRequired"));
      return;
    }

    setCreating(true);
    try {
      await createCoordinatorAssignment(
        localFieldId,
        buildCoordinatorAssignmentPayload({
          userId,
          assignmentType,
          zoneId: zoneId ? Number(zoneId) : undefined,
          clubTypeId: clubTypeId ? Number(clubTypeId) : undefined,
          clubSectionId: clubSectionId ? Number(clubSectionId) : undefined,
        }),
      );
      setUserId("");
      setZoneId("");
      setClubTypeId("");
      setClubId("");
      setClubSectionId("");
      toast.success(t("success.assignmentCreated"));
      await onChanged();
    } catch (error) {
      toastFromError(error);
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(assignment: CoordinatorAssignment) {
    setPendingId(assignment.assignment_id);
    try {
      await updateCoordinatorAssignment(assignment.assignment_id, {
        active: !assignment.active,
      });
      toast.success(
        assignment.active
          ? t("success.assignmentDeactivated")
          : t("success.assignmentActivated"),
      );
      await onChanged();
    } catch (error) {
      toastFromError(error);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("assignments.title")}</CardTitle>
        <CardDescription>{t("assignments.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 rounded-xl border border-border p-4">
          <div>
            <p className="font-medium text-foreground">
              {t("assignments.newTitle")}
            </p>
            <p className="text-muted-foreground text-sm">
              {t("assignments.newDescription")}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("fields.coordinator")}</Label>
              <Select
                value={userId || undefined}
                onValueChange={setUserId}
                disabled={loadingUsers}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("fields.selectUser")} />
                </SelectTrigger>
                <SelectContent>
                  {coordinators.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {formatCoordinatorName(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {coordinators.length === 0 && !loadingUsers ? (
                <p className="text-muted-foreground text-xs">
                  {t("assignments.usersEmpty")}{" "}
                  <Link
                    href="/dashboard/users/new"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {t("assignments.usersEmptyLink")}
                  </Link>
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>{t("fields.type")}</Label>
              <Select
                value={assignmentType}
                onValueChange={(value) => {
                  setAssignmentType(value as CoordinatorAssignmentType);
                  setZoneId("");
                  setClubTypeId("");
                  setClubId("");
                  setClubSectionId("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">
                    {t("assignmentTypes.general")}
                  </SelectItem>
                  <SelectItem value="ZONE">{t("assignmentTypes.zone")}</SelectItem>
                  <SelectItem value="SECTION">
                    {t("assignmentTypes.section")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {assignmentType === "ZONE" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("fields.zone")}</Label>
                <Select value={zoneId || undefined} onValueChange={setZoneId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("fields.selectZone")} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeZones.map((zone) => (
                      <SelectItem key={zone.zone_id} value={String(zone.zone_id)}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("fields.clubType")}</Label>
                <Select
                  value={clubTypeId || undefined}
                  onValueChange={setClubTypeId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("fields.selectClubType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeClubTypes.map((clubType) => (
                      <SelectItem
                        key={clubType.club_type_id}
                        value={String(clubType.club_type_id)}
                      >
                        {clubType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          {assignmentType === "SECTION" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("fields.club")}</Label>
                <Select
                  value={clubId || undefined}
                  onValueChange={(value) => {
                    setClubId(value);
                    setClubSectionId("");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("fields.selectClub")} />
                  </SelectTrigger>
                  <SelectContent>
                    {clubs.map((club) => (
                      <SelectItem key={club.club_id} value={String(club.club_id)}>
                        {club.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("fields.section")}</Label>
                <Select
                  value={clubSectionId || undefined}
                  onValueChange={setClubSectionId}
                  disabled={!clubId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("fields.selectSection")} />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem
                        key={section.club_section_id}
                        value={String(section.club_section_id)}
                      >
                        {section.club_type?.name ?? section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          <p className="text-muted-foreground text-xs">
            {t("assignments.directorConflictRule")}
          </p>

          <Button onClick={handleCreate} disabled={creating}>
            {t("actions.createAssignment")}
          </Button>
        </div>

        {assignments.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title={t("assignments.empty")}
            description={t("assignments.newDescription")}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("fields.coordinator")}</TableHead>
                <TableHead>{t("fields.type")}</TableHead>
                <TableHead>{t("fields.scope")}</TableHead>
                <TableHead>{t("fields.status")}</TableHead>
                <TableHead className="text-right">{t("fields.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.assignment_id}>
                  <TableCell>
                    {formatCoordinatorName(assignment.users) ||
                      assignment.user_id}
                  </TableCell>
                  <TableCell>
                    {assignment.assignment_type === "GENERAL"
                      ? t("assignmentTypes.general")
                      : assignment.assignment_type === "ZONE"
                        ? t("assignmentTypes.zone")
                        : t("assignmentTypes.section")}
                  </TableCell>
                  <TableCell>
                    {formatAssignmentScope(
                      assignment,
                      t as unknown as (
                        key: string,
                        values?: Record<string, string | number>,
                      ) => string,
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      intent={assignment.active ? "success" : "neutral"}
                      label={
                        assignment.active
                          ? t("status.active")
                          : t("status.inactive")
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pendingId === assignment.assignment_id}
                      onClick={() => handleToggle(assignment)}
                    >
                      {assignment.active
                        ? t("actions.deactivate")
                        : t("actions.activate")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
